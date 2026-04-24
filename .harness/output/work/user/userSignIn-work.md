# Work Plan — userSignIn

## 기능 요약
- **기능**: 사용자 로그인
- **API**: `POST /api/v1/user/sign-in`
- **도메인**: user

---

## 파일 목록

| 파일 | 작업 |
|------|------|
| `src/api/v1/user/entities/session.entity.ts` | 변경 없음 — 현 엔티티 그대로 사용 (`is_delete` default 0) |
| `src/api/v1/user/entities/session-refresh.entity.ts` | 변경 없음 — 컬럼 채움 완료 (`refresh_hash`/`refresh_encrypted`/`before_refresh_hash`/`create_at`/`end_at`) |
| `src/common/utils/cipher.ts` | 신규 생성 — `encryptAesGcm` / `decryptAesGcm` (AES-256-GCM, key=`process.env.TOKEN_CIPHER_KEY`) |
| `src/common/utils/hash.ts` | 신규 생성 — `sha256Hex` |
| `src/common/utils/jwt.ts` | 신규 생성 — `extractJwtExpiresAt` (JWT exp → Date) |
| `src/api/v1/user/dto/user-sign-in.dto.ts` | 신규 생성 — `UserSignInDto` + `UserSignInResultDto` |
| `src/api/v1/user/interfaces/user.repository.interface.ts` | 메서드 추가 — `findOneState`, `insertSession`, `insertSessionRefresh` |
| `src/api/v1/user/repositories/user.repository.ts` | 수정 — `StateEntity`/`SessionEntity`/`SessionRefreshEntity` 주입, 위 메서드 구현 |
| `src/api/v1/user/user.service.ts` | `signIn` 메서드 추가 |
| `src/api/v1/user/user.controller.ts` | `POST /sign-in` 엔드포인트 추가 (공개) |
| `src/api/v1/user/test/userSignIn.spec.ts` | 신규 생성 — 테스트 스펙 |

`user.module.ts` — 변경 없음 (SessionEntity / SessionRefreshEntity 는 이미 `forFeature` 에 등록됨. StateEntity 도 기존 등록됨).
`app.module.ts` — 변경 없음.

---

## 0. 선행 작업 (코드)

### 0-1. `src/common/utils/hash.ts`

```typescript
import { createHash } from 'crypto';

/**
 * SHA-256 해시 (hex)
 */
export function sha256Hex(input: string): string {
    return createHash('sha256').update(input, 'utf8').digest('hex');
}
```

### 0-2. `src/common/utils/cipher.ts`

```typescript
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGO = 'aes-256-gcm';
const IV_LEN = 12;

function getKey(): Buffer {
    const hex = process.env.TOKEN_CIPHER_KEY || '';
    if (hex.length !== 64) {
        throw new Error('TOKEN_CIPHER_KEY must be 32 bytes (64 hex chars).');
    }
    return Buffer.from(hex, 'hex');
}

/**
 * AES-256-GCM 암호화
 * 반환 형식: `${iv_hex}:${tag_hex}:${ciphertext_hex}`
 */
export function encryptAesGcm(plain: string): string {
    const iv = randomBytes(IV_LEN);
    const cipher = createCipheriv(ALGO, getKey(), iv);
    const ct = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `${iv.toString('hex')}:${tag.toString('hex')}:${ct.toString('hex')}`;
}

/**
 * AES-256-GCM 복호화
 */
export function decryptAesGcm(encoded: string): string {
    const [ivHex, tagHex, ctHex] = encoded.split(':');
    const decipher = createDecipheriv(ALGO, getKey(), Buffer.from(ivHex, 'hex'));
    decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
    const pt = Buffer.concat([decipher.update(Buffer.from(ctHex, 'hex')), decipher.final()]);
    return pt.toString('utf8');
}
```

### 0-3. `src/common/utils/jwt.ts`

```typescript
import { decode } from 'jsonwebtoken';

/**
 * JWT 문자열에서 exp(초) 를 추출해 Date 로 변환
 */
export function extractJwtExpiresAt(token: string): Date {
    const payload = decode(token) as {exp?: number} | null;
    if (!payload?.exp) {
        throw new Error('Invalid JWT: exp claim missing.');
    }
    return new Date(payload.exp * 1000); // exp 는 Unix 초, Date 는 ms
}
```

---

## 1. DTO — `src/api/v1/user/dto/user-sign-in.dto.ts`

```typescript
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';

export class UserSignInDto {
    @ApiProperty({description: '아이디', required: true})
    @IsNotEmpty({message: '아이디를 입력해주세요.'})
    login_id: string;

    @ApiProperty({description: '비밀번호', required: true})
    @IsNotEmpty({message: '비밀번호를 입력해주세요.'})
    login_pw: string;
}

export class UserSignInResultDto {
    @ApiProperty({description: 'access token (JWT)'})
    access_token: string;

    @ApiProperty({description: 'access token 만료 시각 (ISO 8601)', type: String, format: 'date-time'})
    access_expires_at: Date;

    @ApiProperty({description: 'refresh token (JWT)'})
    refresh_token: string;

    @ApiProperty({description: 'refresh token 만료 시각 (ISO 8601)', type: String, format: 'date-time'})
    refresh_expires_at: Date;
}
```

---

## 2. Repository Interface — 추가 메서드

```typescript
import { FindOptionsWhere } from 'typeorm';
import { UserEntity } from '../entities/user.entity';
import { StateEntity } from '../entities/state.entity';
import { SessionEntity } from '../entities/session.entity';
import { SessionRefreshEntity } from '../entities/session-refresh.entity';

export interface UserRepositoryInterface {
    /* 기존 */
    findOne(where: FindOptionsWhere<UserEntity>): Promise<UserEntity | null>;
    insert(entity: UserEntity): Promise<void>;

    /* 추가 */
    /**
     * 상태(t_state) 단건 조회
     */
    findOneState(where: FindOptionsWhere<StateEntity>): Promise<StateEntity | null>;

    /**
     * 세션(t_session) 등록
     */
    insertSession(entity: SessionEntity): Promise<void>;

    /**
     * 세션 refresh(t_session_refresh) 등록
     */
    insertSessionRefresh(entity: SessionRefreshEntity): Promise<void>;
}
```

---

## 3. Repository 구현 — `user.repository.ts`

```typescript
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

    async findOne(where: FindOptionsWhere<UserEntity>): Promise<UserEntity | null> {
        try {
            return await this.repository.findOne({where, loadRelationIds: true});
        } catch (error) {
            throw new InternalServerErrorException({message: '사용자 조회에 실패했습니다. 관리자에게 문의해주세요.'});
        }
    }

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

    async findOneState(where: FindOptionsWhere<StateEntity>): Promise<StateEntity | null> {
        try {
            return await this.stateRepository.findOne({where, loadRelationIds: true});
        } catch (error) {
            throw new InternalServerErrorException({message: '상태 조회에 실패했습니다. 관리자에게 문의해주세요.'});
        }
    }

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

    async insertSessionRefresh(entity: SessionRefreshEntity): Promise<void> {
        try {
            await this.sessionRefreshRepository.insert(entity);
        } catch (error) {
            if (error.errno === 1062 && error.sqlMessage.indexOf('UK_SessionRefresh_RefreshHash') !== -1) {
                throw new BadRequestException({message: '중복된 refresh token 이 존재합니다.'});
            }
            throw new InternalServerErrorException({message: 'refresh 토큰 등록에 실패했습니다. 관리자에게 문의해주세요.'});
        }
    }
}
```

---

## 4. Service — `user.service.ts` 에 `signIn` 추가

> **큐 적용**: INSERT 가 2건(t_session, t_session_refresh) 포함되므로 `@UseQueue('user-consumer', 'user-service-sign-in')` 적용.

```typescript
import { JwtService } from '@nestjs/jwt';
import { matchBcrypt } from '@root/common/utils/bcrypt';
import { sha256Hex } from '@root/common/utils/hash';
import { encryptAesGcm } from '@root/common/utils/cipher';
import { extractJwtExpiresAt } from '@root/common/utils/jwt';
import { SessionEntity } from './entities/session.entity';
import { SessionRefreshEntity } from './entities/session-refresh.entity';
import { UserSignInDto, UserSignInResultDto } from './dto/user-sign-in.dto';
import { v4 as uuidv4 } from 'uuid';

// constructor 에 JwtService 추가
constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepositoryInterface,
    private readonly jwtService: JwtService,
) {}

/**
 * 사용자 로그인
 */
@UseQueue('user-consumer', 'user-service-sign-in')
@Transactional()
async signIn(dto: UserSignInDto): Promise<UserSignInResultDto> {
    // 1) 사용자 조회
    const user = await this.userRepository.findOne({login_id: dto.login_id});
    if (!user) {
        const message = '아이디 또는 비밀번호가 올바르지 않습니다.';
        throw new HttpException({message, validationErrors: createValidationError('login_id', message)}, HttpStatus.BAD_REQUEST);
    }

    // 2) 비밀번호 검증
    const passOk = await matchBcrypt(dto.login_pw, user.login_pw);
    if (!passOk) {
        const message = '아이디 또는 비밀번호가 올바르지 않습니다.';
        throw new HttpException({message, validationErrors: createValidationError('login_id', message)}, HttpStatus.BAD_REQUEST);
    }

    // 3) 로그인 가능 상태 확인
    const state = await this.userRepository.findOneState({state_id: user.state_id});
    if (!state || state.is_login_able !== 1) {
        const message = '로그인이 제한된 계정입니다.';
        throw new HttpException({message, validationErrors: createValidationError('login_id', message)}, HttpStatus.BAD_REQUEST);
    }

    // 4) 세션 생성 (is_delete 는 default 0 적용)
    const session_id = uuidv4().replace(/-/g, '');
    const sessionEntity = new SessionEntity();
    sessionEntity.session_id = session_id;
    sessionEntity.user_id = user.user_id;
    await this.userRepository.insertSession(sessionEntity);

    // 5) 토큰 서명 + 만료 시각 추출 (JWT exp 클레임을 Single Source of Truth 로 사용)
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

    // 6) refresh 저장 (hash + encrypted, before_refresh_hash = null)
    const refreshEntity = new SessionRefreshEntity();
    refreshEntity.session_id = session_id;
    refreshEntity.refresh_hash = sha256Hex(refresh_token);
    refreshEntity.refresh_encrypted = encryptAesGcm(refresh_token);
    refreshEntity.before_refresh_hash = null;
    refreshEntity.end_at = refresh_expires_at;
    await this.userRepository.insertSessionRefresh(refreshEntity);

    return {access_token, access_expires_at, refresh_token, refresh_expires_at};
}
```

---

## 5. Controller — `user.controller.ts` 에 엔드포인트 추가

```typescript
import { ApiOkResponse } from '@nestjs/swagger';
import { UserSignInDto, UserSignInResultDto } from './dto/user-sign-in.dto';

/**
 * 사용자 로그인
 */
@Post('/sign-in')
@HttpCode(200)
@ApiOperation({summary: '사용자 로그인'})
@ApiBody({type: UserSignInDto})
@ApiOkResponse({description: '로그인 성공', type: UserSignInResultDto})
@ApiBadRequestResponse({description: '유효성 오류 / 인증 실패 / 로그인 제한 계정', type: ApiBadRequestResultDto})
@ApiInternalServerErrorResponse({description: '서버 오류', type: ApiFailResultDto})
async signIn(@Body() dto: UserSignInDto): Promise<UserSignInResultDto> {
    return this.userService.signIn(dto);
}
```

> 공개 엔드포인트 — `@UseGuards` 없음.

---

## 6. 테스트 케이스 — `src/api/v1/user/test/userSignIn.spec.ts`

```
[SUCCESS]           정상 로그인 → 200 + {access_token, refresh_token}
[FAIL:validation]   login_id/login_pw 전체 누락 → 400 validationErrors

[FAIL:duplicate]    t_session         — session_id 중복(errno 1062 + PK_Session) → 400
[FAIL:duplicate]    t_session_refresh — refresh_hash 중복(errno 1062 + UK_SessionRefresh_RefreshHash) → 400

[FAIL:service]      존재하지 않는 login_id → 400 "아이디 또는 비밀번호가..."
[FAIL:service]      비밀번호 불일치 → 400 "아이디 또는 비밀번호가..."
[FAIL:service]      is_login_able=0 상태 → 400 "로그인이 제한된 계정입니다."

[FAIL:repository]   findOne(user) DB 오류 → 500
[FAIL:repository]   findOneState DB 오류 → 500
[FAIL:repository]   insertSession (non-1062) DB 오류 → 500
[FAIL:repository]   insertSessionRefresh (non-1062) DB 오류 → 500
```

### 필수 boilerplate

```typescript
jest.mock('typeorm-transactional', () => ({
    initializeTransactionalContext: jest.fn(),
    Transactional: () => (_target: any, _key: string, descriptor: PropertyDescriptor) => descriptor,
}));
jest.mock('@root/modules/queue/use-queue.decorator', () => ({
    UseQueue: () => () => {},
}));
jest.mock('@root/common/utils/bcrypt', () => ({
    matchBcrypt: jest.fn(),
    getBcrypt: jest.fn(),
}));
jest.mock('@root/common/utils/cipher', () => ({
    encryptAesGcm: jest.fn(() => 'ENC'),
    decryptAesGcm: jest.fn(),
}));
jest.mock('@root/common/utils/hash', () => ({
    sha256Hex: jest.fn(() => 'HASH'),
}));
jest.mock('@root/common/utils/jwt', () => ({
    extractJwtExpiresAt: jest.fn(() => new Date(Date.now() + 60_000)),
}));
```

JwtService mock provider:
```typescript
const mockJwtService = {
    sign: jest.fn(() => 'tok.tok.tok'),
};
```

---

## 7. Response 코드

| 상태코드 | 원인 |
|----------|------|
| 200 | 로그인 성공 |
| 400 | validation 실패 / 아이디·비번 불일치 / 로그인 제한 계정 / session_id·refresh_hash 중복 (매우 드묾) |
| 500 | DB 오류 (findOne / findOneState / insertSession / insertSessionRefresh 각 catch) |
