import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { FindManyOptions, Repository } from 'typeorm';
import { UserEntity } from '../../entities/user.entity';
import { AdminUserListDto, AdminUserListItemDto } from '../dto/admin.list.dto';
import { AdminUserViewItemDto } from '../dto/admin.view.dto';
import { Pagination } from '@root/common/utils/pagination';
import { InjectRepository } from '@nestjs/typeorm';
import { AdminUserRepositoryInterface } from '../interfaces/admin.user.repository.interface';
import { PaginationResultDto } from '@root/common/dto/pagination.dto';
import { ValidationErrorDto } from '@root/common/dto/global.result.dto';
import { createValidationError } from '@root/common/utils/validation';

@Injectable()
export class AdminUserRepository implements AdminUserRepositoryInterface {
    constructor(
        @InjectRepository(UserEntity)
        private readonly repository: Repository<UserEntity>
    ) { }

    /**
     * 회원 수
     * 
     * @param option 
     * @returns 
     */
    async getCount(option: FindManyOptions<UserEntity>): Promise<number> {
        return this.repository.count(option);
    }

    /**
     * 회원 목록
     * 
     * @param dto 
     * @returns 
     */
    async getUserList(dto: AdminUserListDto): Promise<{ list: Array<AdminUserListItemDto>, count: number, pagination: PaginationResultDto }> {
        try {
            // 1. 개수
            const builder = this.repository.createQueryBuilder('u');
            builder.innerJoin('t_auth', 'a', 'u.auth_id = a.auth_id');
            builder.innerJoin('t_state', 's', 'u.state_id = s.state_id');
            builder.where('s.state_id != :state_id', { state_id: 'DELETE' });

            if (dto.search_value) {
                if (dto.search_type === 'ID') {
                    builder.andWhere('u.user_id like :user_id', { user_id: `%${dto.search_value}%` });
                } else if (dto.search_type === 'NAME') {
                    builder.andWhere('u.name like :name', { name: `%${dto.search_value}%` });
                } else if (dto.search_type === 'NICKNAME') {
                    builder.andWhere('u.nickname like :nickname', { nickname: `%${dto.search_value}%` });
                } else {
                    builder.andWhere('(u.user_id like :user_id or u.name like :name or u.nickname like :nickname)', {
                        user_id: `%${dto.search_value}%`,
                        name: `%${dto.search_value}%`,
                        nickname: `%${dto.search_value}%`
                    });
                }
            }

            const count = await builder.getCount();

            // 2. 페이징
            const pagination = new Pagination({totalCount: count, page: dto.page, size: dto.size, pageSize: dto.pageSize, all_search_yn: dto.all_search_yn});

            // 3. 목록
            builder.select(`
                  u.user_id 
                , a.auth_id 
                , a.auth_name 
                , s.state_id
                , s.state_name 
                , s.login_able_yn 
                , u.name 
                , u.nickname 
                , date_format(u.create_at, '%Y-%m-%d %H:%i') as create_at
            `);
            builder.orderBy('u.create_at', 'DESC');
            builder.limit(pagination.limit);
            builder.offset(pagination.offset);
            const list: Array<AdminUserListItemDto> = await builder.getRawMany<AdminUserListItemDto>();

            return { list, count, pagination: pagination.getPagination() };
        } catch (error) {
            throw error;
        }
    }

    /**
     * 회원 상세 조회
     *
     * @param user_id
     * @returns
     */
    async findById(user_id: string): Promise<AdminUserViewItemDto | null> {
        try {
            const builder = this.repository.createQueryBuilder('u');
            builder.select(`
                  u.user_id
                , u.login_id
                , u.name
                , u.nickname
                , date_format(u.create_at, '%Y-%m-%d %H:%i') as create_at
                , a.auth_id
                , a.auth_name
                , s.state_id
                , s.state_name
            `);
            builder.innerJoin('t_auth', 'a', 'u.auth_id = a.auth_id');
            builder.innerJoin('t_state', 's', 'u.state_id = s.state_id');
            builder.where('u.user_id = :user_id', {user_id});
            return builder.getRawOne<AdminUserViewItemDto>();
        } catch (error) {
            throw new InternalServerErrorException({message: '회원 정보 조회에 실패했습니다. 관리자에게 문의해주세요.'});
        }
    }

    /**
     * 회원가입
     *
     * @param user
     * @returns
     */
    async sign(user: UserEntity): Promise<void> {
        try {
            await this.repository.insert(user);
        } catch (error) {
            if (error.errno === 1062 && error.sqlMessage.indexOf('Unique_User_loginId') !== -1) {
                const message: string = '이미 사용중인 아이디입니다.';
                const validationErrors: Array<ValidationErrorDto> = createValidationError('login_id', message);
                throw new BadRequestException({message, validationErrors});
            } else if (error.errno === 1062 && error.sqlMessage.indexOf('Unique_User_nickname') !== -1) {
                const message: string = '이미 사용중인 닉네임입니다.';
                const validationErrors: Array<ValidationErrorDto> = createValidationError('nickname', message);
                throw new BadRequestException({message, validationErrors});
            } else {
                throw new InternalServerErrorException({message: '회원가입 처리에 실패했습니다. 관리자에게 문의해주세요.'});
            }
        }
    }
}
