jest.mock('typeorm-transactional', () => ({
    initializeTransactionalContext: jest.fn(),
    Transactional: () => (_target: any, _key: string, descriptor: PropertyDescriptor) => descriptor,
}));

import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, HttpStatus, INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import request = require('supertest');
import { UserController } from '../user.controller';
import { UserService } from '../user.service';
import { USER_REPOSITORY } from '../user.symbols';
import { BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { PassportJwtAuthGuard } from '@root/guards/passport.jwt.auth/passport.jwt.auth.guard';
import { RolesGuard } from '@root/guards/roles/roles.guard';

const mockUserRepository = {
    findOne: jest.fn(),
    insert: jest.fn(),
};

const mockJwtService = {
    sign: jest.fn(() => 'tok.tok.tok'),
};

const validBody = {
    login_id: 'testuser1',
    login_pw: 'password123',
    login_pw2: 'password123',
    name: '홍길동',
    nickname: '길동이',
    auth_id: 'USER',
};

describe('POST /api/v1/user/admin/create', () => {
    let app: INestApplication;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [UserController],
            providers: [
                UserService,
                {provide: USER_REPOSITORY, useValue: mockUserRepository},
                {provide: JwtService, useValue: mockJwtService},
            ],
        })
        .overrideGuard(PassportJwtAuthGuard).useValue({canActivate: () => true})
        .overrideGuard(RolesGuard).useValue({canActivate: () => true})
        .compile();

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
    });

    afterAll(async () => {
        await app.close();
    });

    it('[SUCCESS] 정상 등록', async () => {
        mockUserRepository.findOne.mockResolvedValue(null);
        mockUserRepository.insert.mockResolvedValue(undefined);

        await request(app.getHttpServer())
            .post('/api/v1/user/admin/create')
            .send(validBody)
            .expect(204);
    });

    it('[FAIL:validation] 필수 필드 전체 누락', async () => {
        await request(app.getHttpServer())
            .post('/api/v1/user/admin/create')
            .send({})
            .expect(400);
    });

    it('[FAIL:duplicate] t_user — login_id 중복 (repository insert 1062)', async () => {
        mockUserRepository.findOne.mockResolvedValue(null);
        mockUserRepository.insert.mockRejectedValue(
            new BadRequestException({message: '중복된 로그인 ID가 존재합니다.'})
        );

        await request(app.getHttpServer())
            .post('/api/v1/user/admin/create')
            .send(validBody)
            .expect(400);
    });

    it('[FAIL:service] 비밀번호 불일치', async () => {
        await request(app.getHttpServer())
            .post('/api/v1/user/admin/create')
            .send({...validBody, login_pw2: 'different'})
            .expect(400);
    });

    it('[FAIL:service] login_id 이미 사용 중', async () => {
        mockUserRepository.findOne.mockResolvedValue({user_id: 'existing'});

        await request(app.getHttpServer())
            .post('/api/v1/user/admin/create')
            .send(validBody)
            .expect(400);
    });

    it('[FAIL:repository] findOne 실패', async () => {
        mockUserRepository.findOne.mockRejectedValue(
            new InternalServerErrorException({message: '사용자 조회에 실패했습니다. 관리자에게 문의해주세요.'})
        );

        await request(app.getHttpServer())
            .post('/api/v1/user/admin/create')
            .send(validBody)
            .expect(500);
    });

    it('[FAIL:repository] insert 실패', async () => {
        mockUserRepository.findOne.mockResolvedValue(null);
        mockUserRepository.insert.mockRejectedValue(
            new InternalServerErrorException({message: '사용자 등록에 실패했습니다. 관리자에게 문의해주세요.'})
        );

        await request(app.getHttpServer())
            .post('/api/v1/user/admin/create')
            .send(validBody)
            .expect(500);
    });
});
