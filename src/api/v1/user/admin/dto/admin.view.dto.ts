import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty } from "class-validator";

/**
 * 관리자 회원 상세 조회 Param DTO
 */
export class AdminUserViewParamDto {
    @ApiProperty({description: '회원 ID', required: true})
    @IsNotEmpty({message: '회원 ID를 입력해주세요.'})
    user_id: string;
}

/**
 * 관리자 회원 상세 항목
 */
export class AdminUserViewItemDto {
    @ApiProperty({description: '회원 ID', required: true})
    user_id: string;

    @ApiProperty({description: '로그인 ID', required: true})
    login_id: string;

    @ApiProperty({description: '이름', required: true})
    name: string;

    @ApiProperty({description: '닉네임', required: true})
    nickname: string;

    @ApiProperty({description: '가입일', required: true})
    create_at: string;

    @ApiProperty({description: '권한 ID', required: true})
    auth_id: string;

    @ApiProperty({description: '권한명', required: true})
    auth_name: string;

    @ApiProperty({description: '상태 ID', required: true})
    state_id: string;

    @ApiProperty({description: '상태명', required: true})
    state_name: string;
}

/**
 * 관리자 회원 상세 조회 반환 DTO
 */
export class AdminUserViewResultDto {
    @ApiProperty({description: '회원 상세 정보', required: true, type: () => AdminUserViewItemDto})
    info: AdminUserViewItemDto;
}
