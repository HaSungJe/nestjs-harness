jest.mock('typeorm-transactional', () => ({
    initializeTransactionalContext: jest.fn(),
    Transactional: () => (_target: any, _key: string, descriptor: PropertyDescriptor) => descriptor,
}));

import { Test, TestingModule } from '@nestjs/testing';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { HttpStatus, InternalServerErrorException } from '@nestjs/common';
import { AdminUserService } from '../admin.user.service';
import { AdminWithdrawParamDto } from '../dto/admin.withdraw.dto';
import { ADMIN_USER_REPOSITORY } from '../../user.symbols';

const mockUser = { user_id: 'abc123', login_id: 'testuser', name: '홍길동', nickname: 'tester', state_id: 'DONE' };
const mockWithdrawnUser = { ...mockUser, state_id: 'LEAVE' };

describe('AdminUserService.withdraw', () => {
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
    it('[SUCCESS] 정상적으로 탈퇴처리', async () => {
        mockRepo.findById.mockResolvedValue(mockUser);
        mockRepo.update.mockResolvedValue(undefined);
        await expect(service.withdraw('abc123')).resolves.toBeUndefined();
    });

    // ❌ validation — user_id 누락
    it('[FAIL:validation] user_id 누락 시 오류', async () => {
        const dto = plainToInstance(AdminWithdrawParamDto, {});
        const errors = await validate(dto);
        expect(errors.map(e => e.property)).toEqual(
            expect.arrayContaining(['user_id'])
        );
    });

    // ❌ service — 존재하지 않는 회원
    it('[FAIL:service] 존재하지 않는 user_id 시 404', async () => {
        mockRepo.findById.mockResolvedValue(null);
        await expect(service.withdraw('abc123')).rejects.toMatchObject({ status: HttpStatus.NOT_FOUND });
    });

    // ❌ service — 이미 탈퇴된 회원
    it('[FAIL:service] 이미 탈퇴된 회원 시 400', async () => {
        mockRepo.findById.mockResolvedValue(mockWithdrawnUser);
        await expect(service.withdraw('abc123')).rejects.toMatchObject({ status: HttpStatus.BAD_REQUEST });
    });

    // ❌ repository — DB 오류
    it('[FAIL:repository] DB 오류 시 500', async () => {
        mockRepo.findById.mockResolvedValue(mockUser);
        mockRepo.update.mockRejectedValue(new InternalServerErrorException({ message: '처리에 실패했습니다.' }));
        await expect(service.withdraw('abc123')).rejects.toMatchObject({ status: HttpStatus.INTERNAL_SERVER_ERROR });
    });
});
