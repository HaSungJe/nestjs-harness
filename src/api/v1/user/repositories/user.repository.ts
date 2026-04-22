import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import { UserEntity } from '../entities/user.entity';
import { StateEntity } from '../entities/state.entity';
import { SessionEntity } from '../entities/session.entity';
import { SessionRefreshEntity } from '../entities/session-refresh.entity';
import { UserRepositoryInterface } from '../interfaces/user.repository.interface';

@Injectable()
export class UserRepository implements UserRepositoryInterface {
    constructor(
        @InjectRepository(UserEntity)
        private readonly repository: Repository<UserEntity>,
        @InjectRepository(StateEntity)
        private readonly stateRepository: Repository<StateEntity>,
        @InjectRepository(SessionEntity)
        private readonly sessionRepository: Repository<SessionEntity>,
        @InjectRepository(SessionRefreshEntity)
        private readonly sessionRefreshRepository: Repository<SessionRefreshEntity>,
    ) {}

    /**
     * 사용자 단건 조회
     */
    async findOne(where: FindOptionsWhere<UserEntity>): Promise<UserEntity | null> {
        try {
            return await this.repository.findOne({where, loadRelationIds: true});
        } catch (error) {
            throw new InternalServerErrorException({message: '사용자 조회에 실패했습니다. 관리자에게 문의해주세요.'});
        }
    }

    /**
     * 사용자 등록
     */
    async insert(entity: UserEntity): Promise<void> {
        try {
            await this.repository.insert(entity);
        } catch (error) {
            if (error.errno === 1062 && error.sqlMessage.indexOf('UK_User_LoginId') !== -1) {
                throw new BadRequestException({message: '중복된 로그인 ID가 존재합니다.'});
            }
            throw new InternalServerErrorException({message: '사용자 등록에 실패했습니다. 관리자에게 문의해주세요.'});
        }
    }

    /**
     * 사용자 수정
     */
    async update(where: FindOptionsWhere<UserEntity>, entity: UserEntity): Promise<void> {
        try {
            await this.repository.update(where, entity);
        } catch (error) {
            throw new InternalServerErrorException({message: '사용자 수정에 실패했습니다. 관리자에게 문의해주세요.'});
        }
    }

    /**
     * 상태(t_state) 단건 조회
     */
    async findOneState(where: FindOptionsWhere<StateEntity>): Promise<StateEntity | null> {
        try {
            return await this.stateRepository.findOne({where, loadRelationIds: true});
        } catch (error) {
            throw new InternalServerErrorException({message: '상태 조회에 실패했습니다. 관리자에게 문의해주세요.'});
        }
    }

    /**
     * 세션(t_session) 단건 조회
     */
    async findOneSession(where: FindOptionsWhere<SessionEntity>): Promise<SessionEntity | null> {
        try {
            return await this.sessionRepository.findOne({where, loadRelationIds: true});
        } catch (error) {
            throw new InternalServerErrorException({message: '세션 조회에 실패했습니다. 관리자에게 문의해주세요.'});
        }
    }

    /**
     * 세션 refresh(t_session_refresh) 단건 조회
     */
    async findOneSessionRefresh(where: FindOptionsWhere<SessionRefreshEntity>): Promise<SessionRefreshEntity | null> {
        try {
            return await this.sessionRefreshRepository.findOne({where, loadRelationIds: true});
        } catch (error) {
            throw new InternalServerErrorException({message: 'refresh 토큰 조회에 실패했습니다. 관리자에게 문의해주세요.'});
        }
    }

    /**
     * 세션(t_session) 등록
     */
    async insertSession(entity: SessionEntity): Promise<void> {
        try {
            await this.sessionRepository.insert(entity);
        } catch (error) {
            if (error.errno === 1062 && error.sqlMessage.indexOf('PK_Session') !== -1) {
                throw new BadRequestException({message: '중복된 세션 ID가 존재합니다.'});
            }
            throw new InternalServerErrorException({message: '세션 등록에 실패했습니다. 관리자에게 문의해주세요.'});
        }
    }

    /**
     * 세션 refresh(t_session_refresh) 등록
     *  - UK_SessionRefresh_RefreshHash: 새 refresh_hash 충돌 (통계적으로 비정상)
     *  - UK_SessionRefresh_BeforeRefreshHash: 동시 refresh race 에서 진 쪽 (service 가 errorCode 로 감지하여 멱등 응답 경로 전환)
     */
    async insertSessionRefresh(entity: SessionRefreshEntity): Promise<void> {
        try {
            await this.sessionRefreshRepository.insert(entity);
        } catch (error) {
            if (error.errno === 1062 && error.sqlMessage.indexOf('UK_SessionRefresh_RefreshHash') !== -1) {
                throw new BadRequestException({message: '중복된 refresh token 이 존재합니다.'});
            }
            if (error.errno === 1062 && error.sqlMessage.indexOf('UK_SessionRefresh_BeforeRefreshHash') !== -1) {
                throw new BadRequestException({message: '이미 회전된 refresh token 입니다.', errorCode: 'REFRESH_ALREADY_ROTATED'});
            }
            throw new InternalServerErrorException({message: 'refresh 토큰 등록에 실패했습니다. 관리자에게 문의해주세요.'});
        }
    }
}
