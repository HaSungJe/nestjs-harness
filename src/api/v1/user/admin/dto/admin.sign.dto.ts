import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, Length } from "class-validator";

/**
 * 관리자 회원가입 DTO
 */
export class AdminSignDto {
    @ApiProperty({description: '로그인 ID', required: true})
    @Length(2, 16, {message: '아이디는 2자 이상 16자 이하로 입력해주세요.'})
    @IsNotEmpty({message: '아이디를 입력해주세요.'})
    login_id: string;

    @ApiProperty({description: '로그인 PW', required: true})
    @Length(6, 20, {message: '비밀번호는 6자 이상 20자 이하로 입력해주세요.'})
    @IsNotEmpty({message: '비밀번호를 입력해주세요.'})
    login_pw: string;

    @ApiProperty({description: '로그인 PW 확인', required: true})
    @Length(6, 20, {message: '비밀번호는 6자 이상 20자 이하로 입력해주세요.'})
    @IsNotEmpty({message: '비밀번호를 한번 더 입력해주세요.'})
    login_pw2: string;

    @ApiProperty({description: '이름', required: true})
    @IsNotEmpty({message: '이름을 입력해주세요.'})
    name: string;

    @ApiProperty({description: '닉네임', required: true})
    @IsNotEmpty({message: '닉네임을 입력해주세요.'})
    nickname: string;
}
