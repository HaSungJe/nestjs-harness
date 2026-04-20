import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, Length } from 'class-validator';

/**
 * 관리자 회원 비밀번호 변경 DTO
 */
export class AdminPatchPasswordDto {
    @ApiProperty({ description: '회원 ID', required: true })
    @IsNotEmpty({ message: '회원 ID를 입력해주세요.' })
    user_id: string;

    @ApiProperty({ description: '새 비밀번호', required: true })
    @Length(6, 20, { message: '비밀번호는 6자 이상 20자 이하로 입력해주세요.' })
    @IsNotEmpty({ message: '새 비밀번호를 입력해주세요.' })
    new_login_pw: string;

    @ApiProperty({ description: '새 비밀번호 확인', required: true })
    @Length(6, 20, { message: '비밀번호는 6자 이상 20자 이하로 입력해주세요.' })
    @IsNotEmpty({ message: '새 비밀번호를 한번 더 입력해주세요.' })
    new_login_pw2: string;
}
