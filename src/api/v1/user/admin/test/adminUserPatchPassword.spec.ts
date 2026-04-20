jest.mock('typeorm-transactional', () => ({
    initializeTransactionalContext: jest.fn(),
    Transactional: () => (_target: any, _key: string, descriptor: PropertyDescriptor) => descriptor,
}));

import { Test, TestingModule } from '@nestjs/testing';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { HttpStatus, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { AdminUserService } from '../admin.user.service';
import { AdminPatchPasswordDto } from '../dto/admin.patch-password.dto';
import { ADMIN_USER_REPOSITORY } from '../../user.symbols';

const validDto: AdminPatchPasswordDto = plainToInstance(AdminPatchPasswordDto, {
    user_id: 'abc123',
    new_login_pw: 'newpass1234',
    new_login_pw2: 'newpass1234',
});

const mockUser = { user_id: 'abc123', login_id: 'testuser', name: '홍길동', nickname: 'tester' };

describe('AdminUserService.patchPassword', () => {
    let service: AdminUserService;
    let mockRepo: Record<string, jest.Mock>;

    beforeEach(async () => {
        mockRepo = {
            sign: jest.fn(),
            getCount: jest.fn(),
            getUserList: jest.fn(),
            findById: jest.fn(),
            update: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AdminUserService,
                { provide: ADMIN_USER_REPOSITORY, useValue: mockRepo },
            ],
        }).compile();

        service = module.get<AdminUserService>(AdminUserService);
    });

    // ✅ 성공
    it('[SUCCESS] 정상적으로 비밀번호 변경', async () => {
        mockRepo.findById.mockResolvedValue(mockUser);
        mockRepo.update.mockResolvedValue(undefined);
        await expect(service.patchPassword(validDto)).resolves.toBeUndefined();
    });

    // ❌ validation — 필수 필드 전체 누락
    it('[FAIL:validation] user_id · new_login_pw · new_login_pw2 전체 누락 시 오류', async () => {
        const dto = plainToInstance(AdminPatchPasswordDto, {});
        const errors = await validate(dto);
        expect(errors.map(e => e.property)).toEqual(
            expect.arrayContaining(['user_id', 'new_login_pw', 'new_login_pw2'])
        );
    });

    // ❌ service — 비밀번호 불일치
    it('[FAIL:service] new_login_pw !== new_login_pw2 시 400', async () => {
        const dto = plainToInstance(AdminPatchPasswordDto, { ...validDto, new_login_pw2: 'different' });
        await expect(service.patchPassword(dto)).rejects.toMatchObject({ status: HttpStatus.BAD_REQUEST });
    });

    // ❌ service — 존재하지 않는 회원
    it('[FAIL:service] 존재하지 않는 user_id 시 404', async () => {
        mockRepo.findById.mockResolvedValue(null);
        await expect(service.patchPassword(validDto)).rejects.toMatchObject({ status: HttpStatus.NOT_FOUND });
    });

    // ❌ repository — DB 오류
    it('[FAIL:repository] DB 오류 시 500', async () => {
        mockRepo.findById.mockResolvedValue(mockUser);
        mockRepo.update.mockRejectedValue(new InternalServerErrorException({ message: '처리에 실패했습니다.' }));
        await expect(service.patchPassword(validDto)).rejects.toMatchObject({ status: HttpStatus.INTERNAL_SERVER_ERROR });
    });
});
