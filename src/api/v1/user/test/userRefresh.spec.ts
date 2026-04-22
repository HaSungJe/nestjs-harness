jest.mock('typeorm-transactional', () => ({
    initializeTransactionalContext: jest.fn(),
    Transactional: () => (_target: any, _key: string, descriptor: PropertyDescriptor) => descriptor,
}));
jest.mock('@root/modules/queue/use-queue.decorator', () => ({
    UseQueue: () => () => {},
}));
jest.mock('@root/common/utils/bcrypt', () => ({
    getBcrypt: jest.fn(),
    matchBcrypt: jest.fn(),
}));
jest.mock('@root/common/utils/hash', () => ({
    sha256Hex: jest.fn((v: string) => `HASH(${v})`),
}));
jest.mock('@root/common/utils/cipher', () => ({
    encryptAesGcm: jest.fn(() => 'ENC'),
    decryptAesGcm: jest.fn(() => 'restored.refresh.token'),
}));
jest.mock('@root/common/utils/jwt', () => ({
    extractJwtExpiresAt: jest.fn(() => new Date(Date.now() + 60_000)),
}));

import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, HttpException, HttpStatus, INestApplication, InternalServerErrorException, ValidationPipe } from '@nestjs/common';
import { JwtService, TokenExpiredError } from '@nestjs/jwt';
import request = require('supertest');
import { UserController } from '../user.controller';
import { UserService } from '../user.service';
import { USER_REPOSITORY } from '../user.symbols';

const mockUserRepository = {
    findOne: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    findOneState: jest.fn(),
    findOneSession: jest.fn(),
    findOneSessionRefresh: jest.fn(),
    insertSession: jest.fn(),
    insertSessionRefresh: jest.fn(),
};

const mockJwtService = {
    sign: jest.fn(() => 'new.tok.tok'),
    verify: jest.fn(),
};

const validPayload = {type: 'refresh', user_id: 'u1', session_id: 'sess1'};
const validBody = {refresh_token: 'submitted.refresh.jwt'};

const mockSession = {
    session_id: 'sess1',
    user_id: 'u1',
    ip: '::ffff:127.0.0.1',
    is_delete: 0,
};

const mockSubmitted = {
    session_refresh_id: 1,
    session_id: 'sess1',
    refresh_hash: 'HASH(submitted.refresh.jwt)',
    refresh_encrypted: 'ENC',
    before_refresh_hash: null,
    end_at: new Date(Date.now() + 60_000),
};

const mockRotated = {
    session_refresh_id: 2,
    session_id: 'sess1',
    refresh_hash: 'HASH(rotated.refresh.jwt)',
    refresh_encrypted: 'ENC',
    before_refresh_hash: 'HASH(submitted.refresh.jwt)',
    end_at: new Date(Date.now() + 60_000),
};

describe('POST /api/v1/user/refresh', () => {
    let app: INestApplication;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [UserController],
            providers: [
                UserService,
                {provide: USER_REPOSITORY, useValue: mockUserRepository},
                {provide: JwtService, useValue: mockJwtService},
            ],
        }).compile();

        app = module.createNestApplication();
        app.useGlobalPipes(new ValidationPipe({
            whitelist: true,
            transform: true,
            exceptionFactory: (errors) => {
                const validationErrors = errors.map((e) => ({
                    type: 'isBoolean',
                    property: e.property,
                    message: Object.values(e.constraints || {})[0] || '',
                }));
                return new HttpException({message: '입력값을 확인해주세요.', validationErrors}, HttpStatus.BAD_REQUEST);
            },
        }));
        await app.init();

        jest.clearAllMocks();
        mockJwtService.sign.mockReturnValue('new.tok.tok');
        mockJwtService.verify.mockReturnValue(validPayload);
    });

    afterAll(async () => {
        await app.close();
    });

    it('[SUCCESS] A 경로 — 정상 회전. 새 refresh_token 발급, INSERT 호출됨', async () => {
        mockUserRepository.findOneSessionRefresh
            .mockResolvedValueOnce(null)          // rotated 조회: 없음
            .mockResolvedValueOnce(mockSubmitted); // submitted 조회: 있음
        mockUserRepository.findOneSession.mockResolvedValue(mockSession);
        mockUserRepository.insertSessionRefresh.mockResolvedValue(undefined);

        const res = await request(app.getHttpServer())
            .post('/api/v1/user/refresh')
            .send(validBody)
            .expect(200);

        expect(res.body).toHaveProperty('access_token');
        expect(res.body).toHaveProperty('refresh_token');
        expect(mockUserRepository.insertSessionRefresh).toHaveBeenCalledTimes(1);
        const insertArg = mockUserRepository.insertSessionRefresh.mock.calls[0][0];
        expect(insertArg.before_refresh_hash).toBe('HASH(submitted.refresh.jwt)');
        expect(insertArg.session_id).toBe('sess1');
    });

    it('[SUCCESS] A 경로 — 요청 ip=null → ip 조건 WHERE 에서 생략, 나머지 정상이면 통과', async () => {
        mockUserRepository.findOneSessionRefresh
            .mockResolvedValueOnce(null)
            .mockResolvedValueOnce(mockSubmitted);
        mockUserRepository.findOneSession.mockResolvedValue(mockSession);
        mockUserRepository.insertSessionRefresh.mockResolvedValue(undefined);

        // supertest 는 connection.remoteAddress 로 자동으로 ip 를 채우기 때문에
        // 컨트롤러의 @Ip() 는 항상 값이 들어옴. "ip=null" 시나리오는 service 를 직접 호출해서 재현.
        const service = app.get(UserService);
        const result = await service.refresh(validBody as any, null);

        expect(result.access_token).toBeTruthy();
        expect(mockUserRepository.findOneSession).toHaveBeenCalledTimes(1);
        const whereArg = mockUserRepository.findOneSession.mock.calls[0][0];
        expect(whereArg.session_id).toBe('sess1');
        expect(whereArg.is_delete).toBe(0);
        expect(whereArg.ip).toBeUndefined();
    });

    it('[SUCCESS] B 경로 — rotated 레코드 존재 → 복원된 refresh_token 반환, INSERT 호출 없음', async () => {
        mockUserRepository.findOneSessionRefresh
            .mockResolvedValueOnce(mockRotated)    // rotated 조회: 있음
            .mockResolvedValueOnce(mockSubmitted); // submitted 조회 (validateAndLoadSession 에서)
        mockUserRepository.findOneSession.mockResolvedValue(mockSession);

        const res = await request(app.getHttpServer())
            .post('/api/v1/user/refresh')
            .send(validBody)
            .expect(200);

        expect(res.body.refresh_token).toBe('restored.refresh.token');
        expect(mockUserRepository.insertSessionRefresh).not.toHaveBeenCalled();
    });

    it('[SUCCESS] A 경로 INSERT 1062(UK_SessionRefresh_BeforeRefreshHash) 후 B 재진입 — 복원 토큰 반환', async () => {
        mockUserRepository.findOneSessionRefresh
            .mockResolvedValueOnce(null)           // 첫 rotated 조회: 없음
            .mockResolvedValueOnce(mockSubmitted)  // submitted 조회 (A 경로 validate)
            .mockResolvedValueOnce(mockRotated)    // winner 조회 (catch 후)
            .mockResolvedValueOnce(mockSubmitted); // replyRotated 내부 validate
        mockUserRepository.findOneSession.mockResolvedValue(mockSession);
        mockUserRepository.insertSessionRefresh.mockRejectedValue(
            new BadRequestException({message: '이미 회전된 refresh token 입니다.', errorCode: 'REFRESH_ALREADY_ROTATED'}),
        );

        const res = await request(app.getHttpServer())
            .post('/api/v1/user/refresh')
            .send(validBody)
            .expect(200);

        expect(res.body.refresh_token).toBe('restored.refresh.token');
        expect(mockUserRepository.insertSessionRefresh).toHaveBeenCalledTimes(1);
    });

    it('[FAIL:validation] 필수 필드 전체 누락 (`{}`) → 400', async () => {
        await request(app.getHttpServer())
            .post('/api/v1/user/refresh')
            .send({})
            .expect(400);
    });

    it('[FAIL:service] JWT 서명 오류 → 400 "유효하지 않습니다."', async () => {
        mockJwtService.verify.mockImplementation(() => { throw new Error('invalid signature'); });

        const res = await request(app.getHttpServer())
            .post('/api/v1/user/refresh')
            .send(validBody)
            .expect(400);

        expect(res.body.message).toContain('유효하지 않습니다');
    });

    it('[FAIL:service] JWT 만료 (TokenExpiredError) → 400 "만료되었습니다."', async () => {
        mockJwtService.verify.mockImplementation(() => { throw new TokenExpiredError('jwt expired', new Date()); });

        const res = await request(app.getHttpServer())
            .post('/api/v1/user/refresh')
            .send(validBody)
            .expect(400);

        expect(res.body.message).toContain('만료');
    });

    it('[FAIL:service] payload.type !== "refresh" → 400 "유효하지 않습니다."', async () => {
        mockJwtService.verify.mockReturnValue({type: 'access', user_id: 'u1', session_id: 'sess1'});

        const res = await request(app.getHttpServer())
            .post('/api/v1/user/refresh')
            .send(validBody)
            .expect(400);

        expect(res.body.message).toContain('유효하지 않습니다');
    });

    it('[FAIL:service] submitted·rotated 모두 매칭 실패 (존재 없음) → 400', async () => {
        mockUserRepository.findOneSessionRefresh
            .mockResolvedValueOnce(null)  // rotated 없음
            .mockResolvedValueOnce(null); // submitted 없음 (만료 또는 미존재)

        await request(app.getHttpServer())
            .post('/api/v1/user/refresh')
            .send(validBody)
            .expect(400);
    });

    it('[FAIL:service] A 경로 — findOneSession null (is_delete=1 or ip 불일치) → 400', async () => {
        mockUserRepository.findOneSessionRefresh
            .mockResolvedValueOnce(null)           // rotated 없음
            .mockResolvedValueOnce(mockSubmitted); // submitted 있음
        mockUserRepository.findOneSession.mockResolvedValue(null); // WHERE 에서 걸러짐

        await request(app.getHttpServer())
            .post('/api/v1/user/refresh')
            .send(validBody)
            .expect(400);
    });

    it('[FAIL:service] B 경로 — submitted 가 이미 만료 → 400', async () => {
        mockUserRepository.findOneSessionRefresh
            .mockResolvedValueOnce(mockRotated)  // rotated 있음
            .mockResolvedValueOnce(null);        // submitted 만료로 걸러짐

        await request(app.getHttpServer())
            .post('/api/v1/user/refresh')
            .send(validBody)
            .expect(400);
    });

    it('[FAIL:service] B 경로 — findOneSession 이 null (세션 무효/IP 불일치) → 400', async () => {
        mockUserRepository.findOneSessionRefresh
            .mockResolvedValueOnce(mockRotated)    // rotated 있음
            .mockResolvedValueOnce(mockSubmitted); // submitted 있음
        mockUserRepository.findOneSession.mockResolvedValue(null); // 세션 WHERE 조건 실패

        await request(app.getHttpServer())
            .post('/api/v1/user/refresh')
            .send(validBody)
            .expect(400);
    });

    it('[FAIL:duplicate] UK_SessionRefresh_RefreshHash 충돌 → 400 "중복된 refresh token"', async () => {
        mockUserRepository.findOneSessionRefresh
            .mockResolvedValueOnce(null)
            .mockResolvedValueOnce(mockSubmitted);
        mockUserRepository.findOneSession.mockResolvedValue(mockSession);
        mockUserRepository.insertSessionRefresh.mockRejectedValue(
            new BadRequestException({message: '중복된 refresh token 이 존재합니다.'}),
        );

        const res = await request(app.getHttpServer())
            .post('/api/v1/user/refresh')
            .send(validBody)
            .expect(400);

        expect(res.body.message).toContain('중복된 refresh token');
    });

    it('[FAIL:repository] findOneSessionRefresh 실패 → 500', async () => {
        mockUserRepository.findOneSessionRefresh.mockRejectedValue(
            new InternalServerErrorException({message: 'refresh 토큰 조회에 실패했습니다. 관리자에게 문의해주세요.'}),
        );

        await request(app.getHttpServer())
            .post('/api/v1/user/refresh')
            .send(validBody)
            .expect(500);
    });

    it('[FAIL:repository] findOneSession 실패 → 500', async () => {
        mockUserRepository.findOneSessionRefresh
            .mockResolvedValueOnce(null)
            .mockResolvedValueOnce(mockSubmitted);
        mockUserRepository.findOneSession.mockRejectedValue(
            new InternalServerErrorException({message: '세션 조회에 실패했습니다. 관리자에게 문의해주세요.'}),
        );

        await request(app.getHttpServer())
            .post('/api/v1/user/refresh')
            .send(validBody)
            .expect(500);
    });

    it('[FAIL:repository] insertSessionRefresh 실패 (non-1062) → 500', async () => {
        mockUserRepository.findOneSessionRefresh
            .mockResolvedValueOnce(null)
            .mockResolvedValueOnce(mockSubmitted);
        mockUserRepository.findOneSession.mockResolvedValue(mockSession);
        mockUserRepository.insertSessionRefresh.mockRejectedValue(
            new InternalServerErrorException({message: 'refresh 토큰 등록에 실패했습니다. 관리자에게 문의해주세요.'}),
        );

        await request(app.getHttpServer())
            .post('/api/v1/user/refresh')
            .send(validBody)
            .expect(500);
    });
});
