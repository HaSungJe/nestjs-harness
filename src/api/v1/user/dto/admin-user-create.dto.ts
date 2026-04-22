import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class AdminUserCreateDto {
    @ApiProperty({description: '로그인 ID (소문자·숫자만, 6~30자)', required: true})
    @IsString({message: '로그인 ID는 문자열이어야 합니다.'})
    @IsNotEmpty({message: '로그인 ID를 입력해주세요.'})
    @MinLength(6, {message: '로그인 ID는 최소 6자 이상이어야 합니다.'})
    @MaxLength(30, {message: '로그인 ID는 최대 30자까지 입력할 수 있습니다.'})
    @Matches(/^[a-z0-9]+$/, {message: '로그인 ID는 소문자와 숫자만 사용할 수 있습니다.'})
    login_id: string;

    @ApiProperty({description: '비밀번호 (최대 20자)', required: true})
    @IsString({message: '비밀번호는 문자열이어야 합니다.'})
    @IsNotEmpty({message: '비밀번호를 입력해주세요.'})
    @MaxLength(20, {message: '비밀번호는 최대 20자까지 입력할 수 있습니다.'})
    login_pw: string;

    @ApiProperty({description: '비밀번호 확인 (최대 20자)', required: true})
    @IsString({message: '비밀번호 확인은 문자열이어야 합니다.'})
    @IsNotEmpty({message: '비밀번호 확인을 입력해주세요.'})
    @MaxLength(20, {message: '비밀번호 확인은 최대 20자까지 입력할 수 있습니다.'})
    login_pw2: string;

    @ApiProperty({description: '이름 (한글·영문만, 2~50자)', required: true})
    @IsString({message: '이름은 문자열이어야 합니다.'})
    @IsNotEmpty({message: '이름을 입력해주세요.'})
    @MinLength(2, {message: '이름은 최소 2자 이상이어야 합니다.'})
    @MaxLength(50, {message: '이름은 최대 50자까지 입력할 수 있습니다.'})
    @Matches(/^[가-힣a-zA-Z]+$/, {message: '이름은 한글과 영문만 사용할 수 있습니다.'})
    name: string;

    @ApiProperty({description: '닉네임 (한글·영문·숫자만, 2~50자)', required: true})
    @IsString({message: '닉네임은 문자열이어야 합니다.'})
    @IsNotEmpty({message: '닉네임을 입력해주세요.'})
    @MinLength(2, {message: '닉네임은 최소 2자 이상이어야 합니다.'})
    @MaxLength(50, {message: '닉네임은 최대 50자까지 입력할 수 있습니다.'})
    @Matches(/^[가-힣a-zA-Z0-9]+$/, {message: '닉네임은 한글, 영문, 숫자만 사용할 수 있습니다.'})
    nickname: string;

    @ApiProperty({description: '권한 ID', required: true})
    @IsString({message: '권한 ID는 문자열이어야 합니다.'})
    @IsNotEmpty({message: '권한 ID를 입력해주세요.'})
    auth_id: string;

    @ApiProperty({description: '팀 ID', required: false})
    @IsString({message: '팀 ID는 문자열이어야 합니다.'})
    @IsOptional()
    team_id?: string;

    @ApiProperty({description: '직급 ID', required: false})
    @IsString({message: '직급 ID는 문자열이어야 합니다.'})
    @IsOptional()
    position_id?: string;
}
