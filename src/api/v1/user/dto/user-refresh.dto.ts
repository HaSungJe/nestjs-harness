import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';

export class UserRefreshDto {
    @ApiProperty({description: 'refresh token (JWT)', required: true})
    @IsNotEmpty({message: 'refresh token 을 입력해주세요.'})
    refresh_token: string;
}

export class UserRefreshResultDto {
    @ApiProperty({description: 'access token (JWT)'})
    access_token: string;

    @ApiProperty({description: 'access token 만료 시각 (ISO 8601)', type: String, format: 'date-time'})
    access_expires_at: Date;

    @ApiProperty({description: 'refresh token (JWT)'})
    refresh_token: string;

    @ApiProperty({description: 'refresh token 만료 시각 (ISO 8601)', type: String, format: 'date-time'})
    refresh_expires_at: Date;
}
