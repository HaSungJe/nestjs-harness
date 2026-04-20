import { Test, TestingModule } from '@nestjs/testing';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { BadRequestException, ForbiddenException, HttpStatus, InternalServerErrorException } from '@nestjs/common';
import { AdminUserService } from '../admin.user.service';
import { AdminSignDto } from '../dto/admin.sign.dto';
import { ADMIN_USER_REPOSITORY } from '../../user.symbols';

jest.mock('typeorm-transactional', () => ({
    initializeTransactionalContext: jest.fn(),
    Transactional: () => (_target: any, _key: string, descriptor: PropertyDescriptor) => descriptor,
}));

const validDto: AdminSignDto = plainToInstance(AdminSignDto, {
    login_id: 'testadmin',
    login_pw: 'pass1234',
    login_pw2: 'pass1234',
    name: '홍길동',
    nickname: 'tester',
});

describe('AdminUserService.sign', () => {
    let service: AdminUserService;
    let mockRepo: Record<string, jest.Mock>;

    beforeEach(async () => {
        mockRepo = {
            sign: jest.fn(),
            getCount: jest.fn(),
            getUserList: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AdminUserService,
                {provide: ADMIN_USER_REPOSITORY, useValue: mockRepo},
            ],
        }).compile();

        service = module.get<AdminUserService>(AdminUserService);
    });

    // ✅ 성공
    it('[SUCCESS] 정상 데이터 입력 시 회원가입 완료', async () => {
        mockRepo.sign.mockResolvedValue(undefined);
        await expect(service.sign(validDto)).resolves.toBeUndefined();
    });

    // ❌ validation — 필수 필드 전체 누락
    it('[FAIL:validation] login_id·login_pw·login_pw2·name·nickname 전체 누락 시 400', async () => {
        const dto = plainToInstance(AdminSignDto, {});
        const errors = await validate(dto);
        expect(errors.map(e => e.property)).toEqual(
            expect.arrayContaining(['login_id', 'login_pw', 'login_pw2', 'name', 'nickname'])
        );
    });

    // ❌ duplicate — t_user 테이블
    it('[FAIL:duplicate] t_user — login_id 중복 시 400', async () => {
        mockRepo.sign.mockRejectedValue(
            new BadRequestException({message: '이미 사용중인 아이디입니다.', validationErrors: [{type: 'isBoolean', property: 'login_id', message: '이미 사용중인 아이디입니다.'}]})
        );
        await expect(service.sign(validDto)).rejects.toMatchObject({status: HttpStatus.BAD_REQUEST});
    });

    it('[FAIL:duplicate] t_user — nickname 중복 시 400', async () => {
        mockRepo.sign.mockRejectedValue(
            new BadRequestException({message: '이미 사용중인 닉네임입니다.', validationErrors: [{type: 'isBoolean', property: 'nickname', message: '이미 사용중인 닉네임입니다.'}]})
        );
        await expect(service.sign(validDto)).rejects.toMatchObject({status: HttpStatus.BAD_REQUEST});
    });

    // ❌ service throw
    it('[FAIL:service] login_pw !== login_pw2 시 400', async () => {
        const dto = plainToInstance(AdminSignDto, {...validDto, login_pw2: 'different'});
        await expect(service.sign(dto)).rejects.toMatchObject({status: HttpStatus.BAD_REQUEST});
    });

    it('[FAIL:service] 관리자 권한 없음 시 403', async () => {
        mockRepo.sign.mockRejectedValue(new ForbiddenException({message: '권한이 없습니다.'}));
        await expect(service.sign(validDto)).rejects.toMatchObject({status: HttpStatus.FORBIDDEN});
    });

    // ❌ repository throw
    it('[FAIL:repository] DB 오류 시 500', async () => {
        mockRepo.sign.mockRejectedValue(new InternalServerErrorException({message: '회원가입 처리에 실패했습니다. 관리자에게 문의해주세요.'}));
        await expect(service.sign(validDto)).rejects.toMatchObject({status: HttpStatus.INTERNAL_SERVER_ERROR});
    });
});
