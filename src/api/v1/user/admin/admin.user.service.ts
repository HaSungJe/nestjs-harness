import type { AdminUserRepositoryInterface } from "./interfaces/admin.user.repository.interface";
import { ADMIN_USER_REPOSITORY } from "../user.symbols";
import { HttpException, HttpStatus, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { Not } from "typeorm";
import { AdminUserListDto, AdminUserListResultDto } from "./dto/admin.list.dto";
import { AdminSignDto } from "./dto/admin.sign.dto";
import { AdminUserViewResultDto } from "./dto/admin.view.dto";
import { ApiBadRequestResultDto, ApiFailResultDto, ValidationErrorDto } from "@root/common/dto/global.result.dto";
import { UserEntity } from "../entities/user.entity";
import { UseQueue } from "@root/modules/queue/use-queue.decorator";
import { Transactional } from "typeorm-transactional";
import { createValidationError } from "@root/common/utils/validation";
import { getBcrypt } from "@root/common/utils/bcrypt";
import { v4 as UUID } from "uuid";

@Injectable()
export class AdminUserService {
    constructor(
        @Inject(ADMIN_USER_REPOSITORY)
        private readonly adminUserRepository: AdminUserRepositoryInterface
    ) {}

    /**
     * 관리자 회원 상세 조회
     *
     * @param user_id
     * @returns
     */
    async view(user_id: string): Promise<AdminUserViewResultDto | ApiFailResultDto> {
        try {
            const info = await this.adminUserRepository.findById(user_id);
            if (!info) {
                throw new NotFoundException({message: '존재하지 않는 회원입니다.'});
            }
            return {info};
        } catch (error) {
            throw error;
        }
    }

    /**
     * 관리자 회원가입
     *
     * @param dto
     * @returns
     */
    @UseQueue('user-consumer', 'admin-user-service-sign')
    @Transactional()
    async sign(dto: AdminSignDto): Promise<void | ApiBadRequestResultDto | ApiFailResultDto> {
        if (dto.login_pw !== dto.login_pw2) {
            const message: string = '비밀번호가 일치하지 않습니다.';
            const validationErrors: Array<ValidationErrorDto> = createValidationError('login_pw2', message);
            throw new HttpException({message, validationErrors}, HttpStatus.BAD_REQUEST);
        }

        try {
            const user = new UserEntity();
            user.user_id = UUID().replaceAll('-', '');
            user.login_id = dto.login_id;
            user.login_pw = await getBcrypt(dto.login_pw);
            user.name = dto.name;
            user.nickname = dto.nickname;
            user.auth_id = 'USER';
            user.state_id = 'DONE';
            await this.adminUserRepository.sign(user);
        } catch (error) {
            throw error;
        }
    }

    /**
     * 회원 목록
     *
     * @param dto
     * @returns
     */
    async list(dto: AdminUserListDto): Promise<AdminUserListResultDto | ApiFailResultDto> {
        try {
            // 1. 총 개수
            const total_count: number = await this.adminUserRepository.getCount({where: {state_id: Not('DELETE')}});

            // 2. 목록, 페이징정보
            const {list, pagination} = await this.adminUserRepository.getUserList(dto);

            return { list, total_count, pagination };
        } catch (error) {
            throw new HttpException({message: '요청이 실패했습니다. 관리자에게 문의해주세요.'}, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}