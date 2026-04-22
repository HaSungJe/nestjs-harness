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

import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, HttpException, HttpStatus, INestApplication, InternalServerErrorException, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import request = require('supertest');
import { UserController } from '../user.controller';
import { UserService } from '../user.service';
import { USER_REPOSITORY } from '../user.symbols';
import { matchBcrypt } from '@root/common/utils/bcrypt';

const mockUserRepository = {
    findOne: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    findOneState: jest.fn(),
    insertSession: jest.fn(),
    insertSessionRefresh: jest.fn(),
};

const mockJwtService = {
    sign: jest.fn(() => 'tok.tok.tok'),
};

const validBody = {
    login_id: 'testuser1',
    login_pw: 'password123',
};

const mockUserRow = {
    user_id: 'u1',
    login_id: 'testuser1',
    login_pw: 'hashed_pw',
    state_id: 'ACTIVE',
};

describe('POST /api/v1/user/sign-in', () => {
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
        mockJwtService.sign.mockReturnValue('tok.tok.tok');
    });

    afterAll(async () => {
        await app.close();
    });

    it('[SUCCESS] 정상 로그인', async () => {
        mockUserRepository.findOne.mockResolvedValue(mockUserRow);
        (matchBcrypt as jest.Mock).mockResolvedValue(true);
        mockUserRepository.findOneState.mockResolvedValue({state_id: 'ACTIVE', is_login_able: 1});
        mockUserRepository.insertSession.mockResolvedValue(undefined);
        mockUserRepository.insertSessionRefresh.mockResolvedValue(undefined);

        const res = await request(app.getHttpServer())
            .post('/api/v1/user/sign-in')
            .send(validBody)
            .expect(200);

        expect(res.body).toHaveProperty('access_token');
        expect(res.body).toHaveProperty('access_expires_at');
        expect(res.body).toHaveProperty('refresh_token');
        expect(res.body).toHaveProperty('refresh_expires_at');
        // 비모바일 로그인 — device 수정 호출되지 않음
        expect(mockUserRepository.update).not.toHaveBeenCalled();
        // ip는 supertest 요청의 소스 ip(loopback)로 세션에 주입됨
        const sessionArg = mockUserRepository.insertSession.mock.calls[0][0];
        expect(typeof sessionArg.ip === 'string' && sessionArg.ip.length > 0).toBe(true);
        expect(sessionArg.device_os).toBeUndefined();
        expect(sessionArg.device_token).toBeUndefined();
    });

    it('[SUCCESS] 모바일 로그인 — t_user device_os/token 업데이트 + t_session 반영', async () => {
        mockUserRepository.findOne.mockResolvedValue(mockUserRow);
        (matchBcrypt as jest.Mock).mockResolvedValue(true);
        mockUserRepository.findOneState.mockResolvedValue({state_id: 'ACTIVE', is_login_able: 1});
        mockUserRepository.update.mockResolvedValue(undefined);
        mockUserRepository.insertSession.mockResolvedValue(undefined);
        mockUserRepository.insertSessionRefresh.mockResolvedValue(undefined);

        await request(app.getHttpServer())
            .post('/api/v1/user/sign-in')
            .send({...validBody, device_os: 'iOS', device_token: 'dev-token-abc'})
            .expect(200);

        expect(mockUserRepository.update).toHaveBeenCalledTimes(1);
        const [whereArg, patchArg] = mockUserRepository.update.mock.calls[0];
        expect(whereArg).toEqual({user_id: 'u1'});
        expect(patchArg.device_os).toBe('iOS');
        expect(patchArg.device_token).toBe('dev-token-abc');

        const sessionArg = mockUserRepository.insertSession.mock.calls[0][0];
        expect(sessionArg.device_os).toBe('iOS');
        expect(sessionArg.device_token).toBe('dev-token-abc');
    });

    it('[SUCCESS] device_os/token 일부만 전달 → 모바일로 인식하지 않음', async () => {
        mockUserRepository.findOne.mockResolvedValue(mockUserRow);
        (matchBcrypt as jest.Mock).mockResolvedValue(true);
        mockUserRepository.findOneState.mockResolvedValue({state_id: 'ACTIVE', is_login_able: 1});
        mockUserRepository.insertSession.mockResolvedValue(undefined);
        mockUserRepository.insertSessionRefresh.mockResolvedValue(undefined);

        await request(app.getHttpServer())
            .post('/api/v1/user/sign-in')
            .send({...validBody, device_os: 'iOS'})
            .expect(200);

        expect(mockUserRepository.update).not.toHaveBeenCalled();
        const sessionArg = mockUserRepository.insertSession.mock.calls[0][0];
        expect(sessionArg.device_os).toBeUndefined();
        expect(sessionArg.device_token).toBeUndefined();
    });

    it('[FAIL:validation] 필수 필드 전체 누락', async () => {
        await request(app.getHttpServer())
            .post('/api/v1/user/sign-in')
            .send({})
            .expect(400);
    });

    it('[FAIL:duplicate] t_session — session_id 중복 (repository insertSession 1062)', async () => {
        mockUserRepository.findOne.mockResolvedValue(mockUserRow);
        (matchBcrypt as jest.Mock).mockResolvedValue(true);
        mockUserRepository.findOneState.mockResolvedValue({state_id: 'ACTIVE', is_login_able: 1});
        mockUserRepository.insertSession.mockRejectedValue(
            new BadRequestException({message: '중복된 세션 ID가 존재합니다.'})
        );

        await request(app.getHttpServer())
            .post('/api/v1/user/sign-in')
            .send(validBody)
            .expect(400);
    });

    it('[FAIL:duplicate] t_session_refresh — refresh_hash 중복 (repository insertSessionRefresh 1062)', async () => {
        mockUserRepository.findOne.mockResolvedValue(mockUserRow);
        (matchBcrypt as jest.Mock).mockResolvedValue(true);
        mockUserRepository.findOneState.mockResolvedValue({state_id: 'ACTIVE', is_login_able: 1});
        mockUserRepository.insertSession.mockResolvedValue(undefined);
        mockUserRepository.insertSessionRefresh.mockRejectedValue(
            new BadRequestException({message: '중복된 refresh token 이 존재합니다.'})
        );

        await request(app.getHttpServer())
            .post('/api/v1/user/sign-in')
            .send(validBody)
            .expect(400);
    });

    it('[FAIL:service] 존재하지 않는 login_id', async () => {
        mockUserRepository.findOne.mockResolvedValue(null);

        await request(app.getHttpServer())
            .post('/api/v1/user/sign-in')
            .send(validBody)
            .expect(400);
    });

    it('[FAIL:service] 비밀번호 불일치', async () => {
        mockUserRepository.findOne.mockResolvedValue(mockUserRow);
        (matchBcrypt as jest.Mock).mockResolvedValue(false);

        await request(app.getHttpServer())
            .post('/api/v1/user/sign-in')
            .send(validBody)
            .expect(400);
    });

    it('[FAIL:service] 로그인 제한 계정 (is_login_able=0)', async () => {
        mockUserRepository.findOne.mockResolvedValue(mockUserRow);
        (matchBcrypt as jest.Mock).mockResolvedValue(true);
        mockUserRepository.findOneState.mockResolvedValue({state_id: 'ON_LEAVE', is_login_able: 0});

        await request(app.getHttpServer())
            .post('/api/v1/user/sign-in')
            .send(validBody)
            .expect(400);
    });

    it('[FAIL:repository] findOne(user) 실패', async () => {
        mockUserRepository.findOne.mockRejectedValue(
            new InternalServerErrorException({message: '사용자 조회에 실패했습니다. 관리자에게 문의해주세요.'})
        );

        await request(app.getHttpServer())
            .post('/api/v1/user/sign-in')
            .send(validBody)
            .expect(500);
    });

    it('[FAIL:repository] findOneState 실패', async () => {
        mockUserRepository.findOne.mockResolvedValue(mockUserRow);
        (matchBcrypt as jest.Mock).mockResolvedValue(true);
        mockUserRepository.findOneState.mockRejectedValue(
            new InternalServerErrorException({message: '상태 조회에 실패했습니다. 관리자에게 문의해주세요.'})
        );

        await request(app.getHttpServer())
            .post('/api/v1/user/sign-in')
            .send(validBody)
            .expect(500);
    });

    it('[FAIL:repository] update(device) 실패 — 모바일 로그인', async () => {
        mockUserRepository.findOne.mockResolvedValue(mockUserRow);
        (matchBcrypt as jest.Mock).mockResolvedValue(true);
        mockUserRepository.findOneState.mockResolvedValue({state_id: 'ACTIVE', is_login_able: 1});
        mockUserRepository.update.mockRejectedValue(
            new InternalServerErrorException({message: '사용자 수정에 실패했습니다. 관리자에게 문의해주세요.'})
        );

        await request(app.getHttpServer())
            .post('/api/v1/user/sign-in')
            .send({...validBody, device_os: 'iOS', device_token: 'dev-token-abc'})
            .expect(500);
    });

    it('[FAIL:repository] insertSession 실패 (non-1062)', async () => {
        mockUserRepository.findOne.mockResolvedValue(mockUserRow);
        (matchBcrypt as jest.Mock).mockResolvedValue(true);
        mockUserRepository.findOneState.mockResolvedValue({state_id: 'ACTIVE', is_login_able: 1});
        mockUserRepository.insertSession.mockRejectedValue(
            new InternalServerErrorException({message: '세션 등록에 실패했습니다. 관리자에게 문의해주세요.'})
        );

        await request(app.getHttpServer())
            .post('/api/v1/user/sign-in')
            .send(validBody)
            .expect(500);
    });

    it('[FAIL:repository] insertSessionRefresh 실패 (non-1062)', async () => {
        mockUserRepository.findOne.mockResolvedValue(mockUserRow);
        (matchBcrypt as jest.Mock).mockResolvedValue(true);
        mockUserRepository.findOneState.mockResolvedValue({state_id: 'ACTIVE', is_login_able: 1});
        mockUserRepository.insertSession.mockResolvedValue(undefined);
        mockUserRepository.insertSessionRefresh.mockRejectedValue(
            new InternalServerErrorException({message: 'refresh 토큰 등록에 실패했습니다. 관리자에게 문의해주세요.'})
        );

        await request(app.getHttpServer())
            .post('/api/v1/user/sign-in')
            .send(validBody)
            .expect(500);
    });
});
