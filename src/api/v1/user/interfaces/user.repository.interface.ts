import { FindOptionsWhere } from 'typeorm';
import { UserEntity } from '../entities/user.entity';
import { StateEntity } from '../entities/state.entity';
import { SessionEntity } from '../entities/session.entity';
import { SessionRefreshEntity } from '../entities/session-refresh.entity';

export interface UserRepositoryInterface {
    /**
     * 사용자 단건 조회
     */
    findOne(where: FindOptionsWhere<UserEntity>): Promise<UserEntity | null>;

    /**
     * 사용자 등록
     */
    insert(entity: UserEntity): Promise<void>;

    /**
     * 사용자 수정
     */
    update(where: FindOptionsWhere<UserEntity>, entity: UserEntity): Promise<void>;

    /**
     * 상태(t_state) 단건 조회
     */
    findOneState(where: FindOptionsWhere<StateEntity>): Promise<StateEntity | null>;

    /**
     * 세션(t_session) 단건 조회
     */
    findOneSession(where: FindOptionsWhere<SessionEntity>): Promise<SessionEntity | null>;

    /**
     * 세션 refresh(t_session_refresh) 단건 조회
     */
    findOneSessionRefresh(where: FindOptionsWhere<SessionRefreshEntity>): Promise<SessionRefreshEntity | null>;

    /**
     * 세션(t_session) 등록
     */
    insertSession(entity: SessionEntity): Promise<void>;

    /**
     * 세션 refresh(t_session_refresh) 등록
     */
    insertSessionRefresh(entity: SessionRefreshEntity): Promise<void>;
}
