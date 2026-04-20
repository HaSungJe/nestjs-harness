import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBadRequestResponse, ApiBearerAuth, ApiBody, ApiForbiddenResponse, ApiInternalServerErrorResponse, ApiNoContentResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from "@nestjs/swagger";

import { AdminUserService } from "./admin.user.service";
import { AdminUserListDto, AdminUserListResultDto } from "./dto/admin.list.dto";
import { AdminSignDto } from "./dto/admin.sign.dto";
import { AdminPatchPasswordDto } from "./dto/admin.patch-password.dto";
import { AdminPatchNicknameDto } from "./dto/admin.patch-nickname.dto";
import { AdminUserViewParamDto, AdminUserViewResultDto } from "./dto/admin.view.dto";
import { ApiBadRequestResultDto, ApiFailResultDto } from "@root/common/dto/global.result.dto";
import { PassportJwtAuthGuard } from "@root/guards/passport.jwt.auth/passport.jwt.auth.guard";
import { RolesGuard } from "@root/guards/roles/roles.guard";
import { Roles } from "@root/guards/roles/roles.decorator";

@ApiTags('회원 관리')
@Controller('api/v1/admin/user')
@ApiBearerAuth('accessToken')
export class AdminUserController {
    constructor(
        private readonly service: AdminUserService
    ) {}

    /**
     * 관리자 회원가입
     *
     * @param dto
     * @returns
     */
    @Post('/sign')
    @UseGuards(PassportJwtAuthGuard, RolesGuard)
    @Roles('ADMIN, SUPER_ADMIN')
    @ApiOperation({summary: '관리자 회원가입'})
    @ApiBody({type: AdminSignDto})
    @ApiNoContentResponse()
    @ApiBadRequestResponse({type: ApiBadRequestResultDto})
    @ApiForbiddenResponse({type: ApiFailResultDto})
    @ApiInternalServerErrorResponse({type: ApiFailResultDto})
    async sign(@Body() dto: AdminSignDto): Promise<void | ApiBadRequestResultDto | ApiFailResultDto> {
        try {
            await this.service.sign(dto);
        } catch (error) {
            throw error;
        }
    }

    /**
     * 관리자 회원 비밀번호 변경
     *
     * @param dto
     */
    @Patch('/password')
    @UseGuards(PassportJwtAuthGuard, RolesGuard)
    @Roles('ADMIN, SUPER_ADMIN')
    @ApiOperation({ summary: '관리자 회원 비밀번호 변경' })
    @ApiBody({ type: AdminPatchPasswordDto })
    @ApiOkResponse()
    @ApiBadRequestResponse({ type: ApiBadRequestResultDto })
    @ApiUnauthorizedResponse({ type: ApiFailResultDto })
    @ApiForbiddenResponse({ type: ApiFailResultDto })
    @ApiNotFoundResponse({ type: ApiFailResultDto })
    @ApiInternalServerErrorResponse({ type: ApiFailResultDto })
    async patchPassword(@Body() dto: AdminPatchPasswordDto): Promise<void | ApiBadRequestResultDto | ApiFailResultDto> {
        try {
            await this.service.patchPassword(dto);
        } catch (error) {
            throw error;
        }
    }

    /**
     * 관리자 회원 닉네임 변경
     *
     * @param dto
     */
    @Patch('/nickname')
    @UseGuards(PassportJwtAuthGuard, RolesGuard)
    @Roles('ADMIN, SUPER_ADMIN')
    @ApiOperation({ summary: '관리자 회원 닉네임 변경' })
    @ApiBody({ type: AdminPatchNicknameDto })
    @ApiOkResponse()
    @ApiBadRequestResponse({ type: ApiBadRequestResultDto })
    @ApiUnauthorizedResponse({ type: ApiFailResultDto })
    @ApiForbiddenResponse({ type: ApiFailResultDto })
    @ApiNotFoundResponse({ type: ApiFailResultDto })
    @ApiInternalServerErrorResponse({ type: ApiFailResultDto })
    async patchNickname(@Body() dto: AdminPatchNicknameDto): Promise<void | ApiBadRequestResultDto | ApiFailResultDto> {
        try {
            await this.service.patchNickname(dto);
        } catch (error) {
            throw error;
        }
    }

    /**
     * 관리자 회원 상세 조회
     *
     * @param param
     * @returns
     */
    @Get('/:user_id')
    @UseGuards(PassportJwtAuthGuard, RolesGuard)
    @Roles('ADMIN, SUPER_ADMIN')
    @ApiOperation({summary: '관리자 회원 상세 조회'})
    @ApiOkResponse({type: AdminUserViewResultDto})
    @ApiUnauthorizedResponse({type: ApiFailResultDto})
    @ApiForbiddenResponse({type: ApiFailResultDto})
    @ApiNotFoundResponse({type: ApiFailResultDto})
    @ApiInternalServerErrorResponse({type: ApiFailResultDto})
    async view(@Param() param: AdminUserViewParamDto): Promise<AdminUserViewResultDto | ApiFailResultDto> {
        try {
            return await this.service.view(param.user_id);
        } catch (error) {
            throw error;
        }
    }

    /**
     * 회원 목록
     *
     * @param dto
     * @returns
     */
    @Get('/list')
    @UseGuards(PassportJwtAuthGuard, RolesGuard)
    @Roles('ADMIN, SUPER_ADMIN')
    @ApiOperation({summary: '회원 목록'})
    @ApiOkResponse({type: AdminUserListResultDto})
    @ApiInternalServerErrorResponse({type: ApiFailResultDto})
    async list(@Query() dto: AdminUserListDto): Promise<AdminUserListResultDto | ApiFailResultDto> {
        try {
            return await this.service.list(dto);
        } catch (error) {
            throw error;
        }
    }
}