jest.mock('typeorm-transactional', () => ({
    initializeTransactionalContext: jest.fn(),
    Transactional: () => (_target: any, _key: string, descriptor: PropertyDescriptor) => descriptor,
}));

import { Test, TestingModule } from '@nestjs/testing';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { BadRequestException, HttpStatus, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { AdminUserService } from '../admin.user.service';
import { AdminPatchNicknameDto } from '../dto/admin.patch-nickname.dto';
import { ADMIN_USER_REPOSITORY } from '../../user.symbols';

const validDto: AdminPatchNicknameDto = plainToInstance(AdminPatchNicknameDto, {
    user_id: 'abc123',
    new_nickname: 'newNick',
});

const mockUser = { user_id: 'abc123', login_id: 'testuser', name: '홍길동', nickname: 'oldNick' };

describe('AdminUserService.patchNickname', () => {
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
    it('[SUCCESS] 정상적으로 닉네임 변경', async () => {
        mockRepo.findById.mockResolvedValue(mockUser);
        mockRepo.update.mockResolvedValue(undefined);
        await expect(service.patchNickname(validDto)).resolves.toBeUndefined();
    });

    // ❌ validation — 필수 필드 전체 누락
    it('[FAIL:validation] user_id · new_nickname 전체 누락 시 오류', async () => {
        const dto = plainToInstance(AdminPatchNicknameDto, {});
        const errors = await validate(dto);
        expect(errors.map(e => e.property)).toEqual(
            expect.arrayContaining(['user_id', 'new_nickname'])
        );
    });

    // ❌ service — 존재하지 않는 회원
    it('[FAIL:service] 존재하지 않는 user_id 시 404', async () => {
        mockRepo.findById.mockResolvedValue(null);
        await expect(service.patchNickname(validDto)).rejects.toMatchObject({ status: HttpStatus.NOT_FOUND });
    });

    // ❌ duplicate — t_user nickname 중복
    it('[FAIL:duplicate] t_user — nickname 중복 시 400', async () => {
        mockRepo.findById.mockResolvedValue(mockUser);
        mockRepo.update.mockRejectedValue({ errno: 1062, sqlMessage: 'Unique_User_nickname' });
        await expect(service.patchNickname(validDto)).rejects.toMatchObject({ status: HttpStatus.BAD_REQUEST });
    });

    // ❌ repository — DB 오류
    it('[FAIL:repository] DB 오류 시 500', async () => {
        mockRepo.findById.mockResolvedValue(mockUser);
        mockRepo.update.mockRejectedValue(new InternalServerErrorException({ message: '처리에 실패했습니다.' }));
        await expect(service.patchNickname(validDto)).rejects.toMatchObject({ status: HttpStatus.INTERNAL_SERVER_ERROR });
    });
});
