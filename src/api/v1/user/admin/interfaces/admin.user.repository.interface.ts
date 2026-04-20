import { AdminUserListDto, AdminUserListItemDto } from "../dto/admin.list.dto";
import { AdminUserViewItemDto } from "../dto/admin.view.dto";
import { FindManyOptions } from "typeorm";
import { UserEntity } from "../../entities/user.entity";
import { PaginationResultDto } from "@root/common/dto/pagination.dto";

export interface AdminUserRepositoryInterface {
    /**
     * 회원 수
     * 
     * @param option 
     * @returns 
     */
    getCount(option: FindManyOptions<UserEntity>): Promise<number>;

    /**
     * 회원 목록
     *
     * @param dto
     * @returns
     */
    getUserList(dto: AdminUserListDto): Promise<{ list: Array<AdminUserListItemDto>, count: number, pagination: PaginationResultDto }>;

    /**
     * 회원 상세 조회
     *
     * @param user_id
     * @returns
     */
    findById(user_id: string): Promise<AdminUserViewItemDto | null>;

    /**
     * 회원가입
     *
     * @param user
     * @returns
     */
    sign(user: UserEntity): Promise<void>;
}
