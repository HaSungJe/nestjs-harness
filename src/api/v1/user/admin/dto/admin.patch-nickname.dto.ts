import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';

/**
 * 관리자 회원 닉네임 변경 DTO
 */
export class AdminPatchNicknameDto {
    @ApiProperty({ description: '회원 ID', required: true })
    @IsNotEmpty({ message: '회원 ID를 입력해주세요.' })
    user_id: string;

    @ApiProperty({ description: '새 닉네임', required: true })
    @IsNotEmpty({ message: '닉네임을 입력해주세요.' })
    new_nickname: string;
}
