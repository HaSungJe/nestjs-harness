import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { JwtService, TokenExpiredError } from '@nestjs/jwt';
import { Transactional } from 'typeorm-transactional';
import { FindOptionsWhere, Raw } from 'typeorm';
import { getBcrypt, matchBcrypt } from '@root/common/utils/bcrypt';
import { createValidationError } from '@root/common/utils/validation';
import { sha256Hex } from '@root/common/utils/hash';
import { encryptAesGcm, decryptAesGcm } from '@root/common/utils/cipher';
import { extractJwtExpiresAt } from '@root/common/utils/jwt';
import { UseQueue } from '@root/modules/queue/use-queue.decorator';
import { UserEntity } from './entities/user.entity';
import { SessionEntity } from './entities/session.entity';
import { SessionRefreshEntity } from './entities/session-refresh.entity';
import { AdminUserCreateDto } from './dto/admin-user-create.dto';
import { UserSignInDto, UserSignInResultDto } from './dto/user-sign-in.dto';
import { UserRefreshDto, UserRefreshResultDto } from './dto/user-refresh.dto';
import { USER_REPOSITORY } from './user.symbols';
import type { UserRepositoryInterface } from './interfaces/user.repository.interface';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class UserService {
    constructor(
        @Inject(USER_REPOSITORY)
        private readonly userRepository: UserRepositoryInterface,
        private readonly jwtService: JwtService,
    ) {}

    /**
     * 관리자용 사용자 등록
     */
    @UseQueue('user-consumer', 'user-service-admin-create')
    @Transactional()
    async adminCreate(dto: AdminUserCreateDto): Promise<void> {
        if (dto.login_pw !== dto.login_pw2) {
            const message = '비밀번호가 일치하지 않습니다.';
            throw new HttpException({message, validationErrors: createValidationError('login_pw2', message)}, HttpStatus.BAD_REQUEST);
        }

        const existing = await this.userRepository.findOne({login_id: dto.login_id});
        if (existing) {
            const message = '이미 사용 중인 로그인 ID입니다.';
            throw new HttpException({message, validationErrors: createValidationError('login_id', message)}, HttpStatus.BAD_REQUEST);
        }

        const entity = new UserEntity();
        entity.user_id = uuidv4().replace(/-/g, '');
        entity.login_id = dto.login_id;
        entity.login_pw = await getBcrypt(dto.login_pw);
        entity.name = dto.name;
        entity.nickname = dto.nickname;
        entity.auth_id = dto.auth_id;
        entity.state_id = 'ACTIVE';
        entity.team_id = dto.team_id ?? null;
        entity.position_id = dto.position_id ?? null;

        await this.userRepository.insert(entity);
    }

    /**
     * 사용자 로그인
     */
    @UseQueue('user-consumer', 'user-service-sign-in')
    @Transactional()
    async signIn(dto: UserSignInDto, ip: string | null): Promise<UserSignInResultDto> {
        const user = await this.userRepository.findOne({login_id: dto.login_id});
        if (!user) {
            const message = '아이디 또는 비밀번호가 올바르지 않습니다.';
            throw new HttpException({message, validationErrors: createValidationError('login_id', message)}, HttpStatus.BAD_REQUEST);
        }

        const passOk = await matchBcrypt(dto.login_pw, user.login_pw);
        if (!passOk) {
            const message = '아이디 또는 비밀번호가 올바르지 않습니다.';
            throw new HttpException({message, validationErrors: createValidationError('login_id', message)}, HttpStatus.BAD_REQUEST);
        }

        const state = await this.userRepository.findOneState({state_id: user.state_id});
        if (!state || state.is_login_able !== 1) {
            const message = '로그인이 제한된 계정입니다.';
            throw new HttpException({message, validationErrors: createValidationError('login_id', message)}, HttpStatus.BAD_REQUEST);
        }

        const isMobile = !!(dto.device_os && dto.device_token);
        if (isMobile) {
            const patch = new UserEntity();
            patch.device_os = dto.device_os!;
            patch.device_token = dto.device_token!;
            await this.userRepository.update({user_id: user.user_id}, patch);
        }

        const session_id = uuidv4().replace(/-/g, '');
        const sessionEntity = new SessionEntity();
        sessionEntity.session_id = session_id;
        sessionEntity.user_id = user.user_id;
        if (ip) sessionEntity.ip = ip;
        if (isMobile) {
            sessionEntity.device_os = dto.device_os!;
            sessionEntity.device_token = dto.device_token!;
        }
        await this.userRepository.insertSession(sessionEntity);

        const access_token = this.jwtService.sign(
            {type: 'access', user_id: user.user_id, session_id},
            {expiresIn: '20m'},
        );
        const refresh_token = this.jwtService.sign(
            {type: 'refresh', user_id: user.user_id, session_id},
            {expiresIn: '1d'},
        );
        const access_expires_at = extractJwtExpiresAt(access_token);
        const refresh_expires_at = extractJwtExpiresAt(refresh_token);

        const refreshEntity = new SessionRefreshEntity();
        refreshEntity.session_id = session_id;
        refreshEntity.refresh_hash = sha256Hex(refresh_token);
        refreshEntity.refresh_encrypted = encryptAesGcm(refresh_token);
        refreshEntity.before_refresh_hash = null;
        refreshEntity.end_at = refresh_expires_at;
        await this.userRepository.insertSessionRefresh(refreshEntity);

        return {access_token, access_expires_at, refresh_token, refresh_expires_at};
    }

    /**
     * refresh token 회전
     *
     *   용어
     *     old_hash  = SHA256(제출된 refresh_token)
     *     submitted = `refresh_hash = old_hash`         인 레코드 — 제출된 토큰이 저장된 원본
     *     rotated   = `before_refresh_hash = old_hash`  인 레코드 — 그 원본으로부터 이미 발급된 다음 토큰
     *
     *   전체 흐름
     *     1) JWT 검증
     *     2) rotated 있음  → 이미 누군가 교환 완료. 그 토큰을 그대로 돌려준다 (멱등 응답)
     *     3) rotated 없음  → 내가 첫 교환. 새 토큰 서명 + 새 rotated 레코드 INSERT
     *     4) INSERT UK 충돌 → 동시 요청이 방금 교환 완료. (2)로 재진입
     *
     *   동시성·시간
     *     - 시간 비교는 DB NOW() 로만 (서버 시계 편차 회피)
     *     - `UK_SessionRefresh_BeforeRefreshHash` 덕분에 같은 old_hash 로 rotated 는 DB 에 **최대 1건**
     *       → 어떤 동시 요청이 와도 응답 토큰은 동일 (멱등)
     */
    @Transactional()
    async refresh(dto: UserRefreshDto, ip: string | null): Promise<UserRefreshResultDto> {
        // 1) JWT 검증
        let payload: {type?: string; user_id?: string; session_id?: string};
        try {
            payload = this.jwtService.verify(dto.refresh_token);
        } catch (error) {
            const message = error instanceof TokenExpiredError
                ? 'refresh token 이 만료되었습니다.'
                : 'refresh token 이 유효하지 않습니다.';
            throw new HttpException({message, validationErrors: createValidationError('refresh_token', message)}, HttpStatus.BAD_REQUEST);
        }
        if (payload?.type !== 'refresh' || !payload.user_id || !payload.session_id) {
            const message = 'refresh token 이 유효하지 않습니다.';
            throw new HttpException({message, validationErrors: createValidationError('refresh_token', message)}, HttpStatus.BAD_REQUEST);
        }

        const old_hash = sha256Hex(dto.refresh_token);

        // 공통 검증: submitted 존재·미만료(DB NOW()) + 세션 유효(is_delete=0) + IP 일치 (요청 ip 가 있는 경우에만)
        //   - is_delete 는 항상 WHERE 에 포함
        //   - ip 는 요청에 있을 때만 WHERE 에 추가 (없으면 조건 생략 — 프록시/로컬 등 ip 미수집 환경 대응)
        //   - session.ip 가 NULL 인 레코드는 MySQL NULL 비교 특성상 `ip = :ip` 에 자동으로 매칭되지 않음
        const validateAndLoadSession = async (session_id: string): Promise<SessionEntity> => {
            const submitted = await this.userRepository.findOneSessionRefresh({
                refresh_hash: old_hash,
                end_at: Raw((a) => `${a} > NOW()`),
            });
            const sessionWhere: FindOptionsWhere<SessionEntity> = {session_id, is_delete: 0};
            if (ip) sessionWhere.ip = ip;
            const session = submitted
                ? await this.userRepository.findOneSession(sessionWhere)
                : null;
            if (!submitted || !session) {
                const message = 'refresh token 이 유효하지 않습니다.';
                throw new HttpException({message, validationErrors: createValidationError('refresh_token', message)}, HttpStatus.BAD_REQUEST);
            }
            return session;
        };

        // 멱등 응답: 이미 발급된 rotated.refresh_token 을 복호화하여 돌려주고, access_token 만 새로 서명
        const replyRotated = async (rotated: SessionRefreshEntity): Promise<UserRefreshResultDto> => {
            const session = await validateAndLoadSession(rotated.session_id);
            const access = this.jwtService.sign(
                {type: 'access', user_id: session.user_id, session_id: session.session_id},
                {expiresIn: '20m'},
            );
            return {
                access_token: access,
                access_expires_at: extractJwtExpiresAt(access),
                refresh_token: decryptAesGcm(rotated.refresh_encrypted),
                refresh_expires_at: rotated.end_at,
            };
        };

        // 2) 이미 교환된 레코드가 있는가?
        const existing = await this.userRepository.findOneSessionRefresh({before_refresh_hash: old_hash});
        if (existing) return replyRotated(existing);

        // 3) 내가 첫 교환 — submitted·세션 검증 후 새 토큰 서명
        const session = await validateAndLoadSession(payload.session_id);

        const access_token = this.jwtService.sign(
            {type: 'access', user_id: session.user_id, session_id: session.session_id},
            {expiresIn: '20m'},
        );
        const refresh_token = this.jwtService.sign(
            {type: 'refresh', user_id: session.user_id, session_id: session.session_id},
            {expiresIn: '1d'},
        );
        const refresh_expires_at = extractJwtExpiresAt(refresh_token);

        const rotated = new SessionRefreshEntity();
        rotated.session_id = session.session_id;
        rotated.refresh_hash = sha256Hex(refresh_token);
        rotated.refresh_encrypted = encryptAesGcm(refresh_token);
        rotated.before_refresh_hash = old_hash;
        rotated.end_at = refresh_expires_at;

        // 4) INSERT — 동시 경쟁에서 진 쪽은 승자 rotated 로 멱등 응답
        try {
            await this.userRepository.insertSessionRefresh(rotated);
        } catch (error) {
            if ((error as any)?.response?.errorCode === 'REFRESH_ALREADY_ROTATED') {
                const winner = await this.userRepository.findOneSessionRefresh({before_refresh_hash: old_hash});
                if (winner) return replyRotated(winner);
            }
            throw error;
        }

        return {
            access_token,
            access_expires_at: extractJwtExpiresAt(access_token),
            refresh_token,
            refresh_expires_at,
        };
    }
}
