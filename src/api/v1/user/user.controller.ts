import { Body, Controller, HttpCode, Ip, Post, UseGuards } from '@nestjs/common';
import { ApiBadRequestResponse, ApiBody, ApiInternalServerErrorResponse, ApiNoContentResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PassportJwtAuthGuard } from '@root/guards/passport.jwt.auth/passport.jwt.auth.guard';
import { RolesGuard } from '@root/guards/roles/roles.guard';
import { Roles } from '@root/guards/roles/roles.decorator';
import { ApiBadRequestResultDto, ApiFailResultDto } from '@root/common/dto/global.result.dto';
import { UserService } from './user.service';
import { AdminUserCreateDto } from './dto/admin-user-create.dto';
import { UserSignInDto, UserSignInResultDto } from './dto/user-sign-in.dto';
import { UserRefreshDto, UserRefreshResultDto } from './dto/user-refresh.dto';

@ApiTags('회원')
@Controller('/api/v1/user')
export class UserController {
    constructor(private readonly userService: UserService) {}

    /**
     * 관리자 - 사용자 등록
     */
    @Post('/admin/create')
    @HttpCode(204)
    @UseGuards(PassportJwtAuthGuard, RolesGuard)
    @Roles('ADMIN', 'SUPER_ADMIN')
    @ApiOperation({summary: '관리자 - 사용자 등록'})
    @ApiNoContentResponse({description: '성공'})
    @ApiBadRequestResponse({description: '유효성 오류 / 비밀번호 불일치 / 중복 로그인 ID', type: ApiBadRequestResultDto})
    @ApiInternalServerErrorResponse({description: '서버 오류', type: ApiFailResultDto})
    async adminCreate(@Body() dto: AdminUserCreateDto): Promise<void> {
        return this.userService.adminCreate(dto);
    }

    /**
     * 사용자 로그인
     */
    @Post('/sign-in')
    @HttpCode(200)
    @ApiOperation({summary: '사용자 로그인'})
    @ApiBody({type: UserSignInDto})
    @ApiOkResponse({description: '로그인 성공', type: UserSignInResultDto})
    @ApiBadRequestResponse({description: '유효성 오류 / 인증 실패 / 로그인 제한 계정', type: ApiBadRequestResultDto})
    @ApiInternalServerErrorResponse({description: '서버 오류', type: ApiFailResultDto})
    async signIn(@Body() dto: UserSignInDto, @Ip() ip: string): Promise<UserSignInResultDto> {
        return this.userService.signIn(dto, ip ?? null);
    }

    /**
     * 사용자 로그인 refresh
     */
    @Post('/refresh')
    @HttpCode(200)
    @ApiOperation({summary: '사용자 로그인 refresh'})
    @ApiBody({type: UserRefreshDto})
    @ApiOkResponse({description: 'refresh 성공', type: UserRefreshResultDto})
    @ApiBadRequestResponse({description: '유효성 오류 / 토큰 유효하지 않음 / 토큰 만료', type: ApiBadRequestResultDto})
    @ApiInternalServerErrorResponse({description: '서버 오류', type: ApiFailResultDto})
    async refresh(@Body() dto: UserRefreshDto, @Ip() ip: string): Promise<UserRefreshResultDto> {
        return this.userService.refresh(dto, ip ?? null);
    }
}
