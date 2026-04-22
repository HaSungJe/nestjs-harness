import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional } from 'class-validator';

export class UserSignInDto {
    @ApiProperty({description: '아이디', required: true})
    @IsNotEmpty({message: '아이디를 입력해주세요.'})
    login_id: string;

    @ApiProperty({description: '비밀번호', required: true})
    @IsNotEmpty({message: '비밀번호를 입력해주세요.'})
    login_pw: string;

    @ApiProperty({description: '디바이스 OS (모바일 로그인 시 전달)', required: false})
    @IsOptional()
    device_os?: string;

    @ApiProperty({description: '디바이스 토큰 (모바일 로그인 시 전달)', required: false})
    @IsOptional()
    device_token?: string;
}

export class UserSignInResultDto {
    @ApiProperty({description: 'access token (JWT)'})
    access_token: string;

    @ApiProperty({description: 'access token 만료 시각 (ISO 8601)', type: String, format: 'date-time'})
    access_expires_at: Date;

    @ApiProperty({description: 'refresh token (JWT)'})
    refresh_token: string;

    @ApiProperty({description: 'refresh token 만료 시각 (ISO 8601)', type: String, format: 'date-time'})
    refresh_expires_at: Date;
}
