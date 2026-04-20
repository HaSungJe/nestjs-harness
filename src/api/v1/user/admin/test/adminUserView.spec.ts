import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { AdminUserService } from '../admin.user.service';
import { AdminUserViewItemDto } from '../dto/admin.view.dto';
import { ADMIN_USER_REPOSITORY } from '../../user.symbols';

jest.mock('typeorm-transactional', () => ({
    initializeTransactionalContext: jest.fn(),
    Transactional: () => (_target: any, _key: string, descriptor: PropertyDescriptor) => descriptor,
}));

const mockViewItem: AdminUserViewItemDto = {
    user_id: 'abc123',
    login_id: 'testadmin',
    name: '홍길동',
    nickname: 'tester',
    create_at: '2026-04-20 00:00',
    auth_id: 'USER',
    auth_name: '일반회원',
    state_id: 'DONE',
    state_name: '정상',
};

describe('AdminUserService.view', () => {
    let service: AdminUserService;
    let mockRepo: Record<string, jest.Mock>;

    beforeEach(async () => {
        mockRepo = {
            findById: jest.fn(),
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
    it('[SUCCESS] 유효한 user_id 입력 시 회원 상세 정보 반환', async () => {
        mockRepo.findById.mockResolvedValue(mockViewItem);
        const result = await service.view('abc123');
        expect(result).toEqual({info: mockViewItem});
    });

    // ❌ service throw — 존재하지 않는 회원
    it('[FAIL:service] 존재하지 않는 user_id 시 404', async () => {
        mockRepo.findById.mockResolvedValue(null);
        await expect(service.view('notexist')).rejects.toMatchObject({status: HttpStatus.NOT_FOUND});
    });

    // ❌ repository throw — DB 오류
    it('[FAIL:repository] DB 오류 시 500', async () => {
        mockRepo.findById.mockRejectedValue(new InternalServerErrorException({message: '회원 정보 조회에 실패했습니다. 관리자에게 문의해주세요.'}));
        await expect(service.view('abc123')).rejects.toMatchObject({status: HttpStatus.INTERNAL_SERVER_ERROR});
    });
});
