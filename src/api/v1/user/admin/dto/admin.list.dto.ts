import { ApiProperty } from "@nestjs/swagger";
import { PaginationDto, PaginationResultDto } from "@root/common/dto/pagination.dto";

/**
 * 회원 목록 Dto
 */
export class AdminUserListDto extends PaginationDto {
    @ApiProperty({description: '검색 종류. (ALL: 전체, ID: 아이디, NAME: 이름, NICKNAME: 닉네임)', required: false})
    search_type: 'ALL' | 'ID' | 'NAME' | 'NICKNAME';

    @ApiProperty({description: '검색 값', required: false})
    search_value: string;

    @ApiProperty({description: '상태 ID. (ALL: 전체, DONE: 정상, BLOCK: 정지, DELETE: 삭제)', required: false})
    state_id: string;

    constructor(data: any = {}) {
        super();
        this.all_search_yn = ['Y', 'N'].includes(data['all_search_yn']) ? data['all_search_yn'] : 'N';
        this.page = !isNaN(parseInt(data['page'])) ? parseInt(data['page']) : 1;
        this.size = !isNaN(parseInt(data['size'])) ? parseInt(data['size']) : 20;
        this.pageSize = !isNaN(parseInt(data['pageSize'])) ? parseInt(data['pageSize']) : 10;
        this.search_type = data['search_type'] ? data['search_type'] : 'ALL';
        this.search_value = data['search_value'] ? data['search_value'] : '';
        this.state_id = data['state_id'] ? data['state_id'] : 'ALL';
    }
}

/**
 * 회원 항목
 */
export class AdminUserListItemDto {
    @ApiProperty({description: '회원 ID', required: true})
    user_id: string;

    @ApiProperty({description: '권한 ID', required: true})
	auth_id: string;

    @ApiProperty({description: '권한명', required: true})
	auth_name: string;

    @ApiProperty({description: '상태 ID', required: true})
	state_id: string;

    @ApiProperty({description: '상태명', required: true})
	state_name: string;

    @ApiProperty({description: '로그인 가능 여부(Y/N)', required: true})
	login_able_yn: 'Y' | 'N'; 

    @ApiProperty({description: '이름', required: true})
	name: string;

    @ApiProperty({description: '닉네임', required: true})
	nickname: string;

    @ApiProperty({description: '생성일', required: true})
	create_at: string;
}

/**
 * 회원 목록 반환 Dto
 */
export class AdminUserListResultDto {
    @ApiProperty({description: '총 개수', required: true})
    total_count: number;

    @ApiProperty({description: '페이지 정보', required: true, type: () => PaginationResultDto})
    pagination: PaginationResultDto;

    @ApiProperty({description: '회원 목록', required: true, type: () => [AdminUserListItemDto]})
    list: AdminUserListItemDto[];
}