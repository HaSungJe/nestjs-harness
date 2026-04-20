import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';

/**
 * 관리자 회원 탈퇴처리 Param DTO
 */
export class AdminWithdrawParamDto {
    @ApiProperty({ description: '회원 ID', required: true })
    @IsNotEmpty({ message: '회원 ID를 입력해주세요.' })
    user_id: string;
}
