# Work Plan — adminUserCreate

## 기능 요약
- **기능**: 관리자용 사용자 등록
- **API**: `POST /api/v1/user/admin/create`
- **도메인**: user

---

## 파일 목록

| 파일 | 작업 |
|------|------|
| `src/api/v1/user/dto/admin-user-create.dto.ts` | 신규 생성 |
| `src/api/v1/user/interfaces/user.repository.interface.ts` | 신규 생성 |
| `src/api/v1/user/repositories/user.repository.ts` | 신규 생성 |
| `src/api/v1/user/user.service.ts` | 신규 생성 |
| `src/api/v1/user/user.controller.ts` | 신규 생성 |
| `src/api/v1/user/user.module.ts` | providers/controllers 등록 |
| `src/api/v1/user/user.symbols.ts` | Symbol 추가 |
| `src/api/v1/user/test/adminUserCreate.spec.ts` | 신규 생성 |

---

## 1. DTO

```typescript
// src/api/v1/user/dto/admin-user-create.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

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
```

---

## 2. Repository Interface

```typescript
// src/api/v1/user/interfaces/user.repository.interface.ts
import { FindOptionsWhere } from 'typeorm';
import { UserEntity } from '../entities/user.entity';

export interface UserRepositoryInterface {
    /**
     * 사용자 단건 조회
     */
    findOne(where: FindOptionsWhere<UserEntity>): Promise<UserEntity | null>;

    /**
     * 사용자 등록
     */
    insert(entity: UserEntity): Promise<void>;
}
```

---

## 3. Repository 구현

```typescript
// src/api/v1/user/repositories/user.repository.ts
import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import { UserEntity } from '../entities/user.entity';
import { UserRepositoryInterface } from '../interfaces/user.repository.interface';

@Injectable()
export class UserRepository implements UserRepositoryInterface {
    constructor(
        @InjectRepository(UserEntity)
        private readonly repository: Repository<UserEntity>,
    ) {}

    /**
     * 사용자 단건 조회
     */
    async findOne(where: FindOptionsWhere<UserEntity>): Promise<UserEntity | null> {
        try {
            return await this.repository.findOne({where, loadRelationIds: true});
        } catch (error) {
            throw new InternalServerErrorException({message: '사용자 조회에 실패했습니다. 관리자에게 문의해주세요.'});
        }
    }

    /**
     * 사용자 등록
     */
    async insert(entity: UserEntity): Promise<void> {
        try {
            await this.repository.insert(entity);
        } catch (error) {
            if (error.errno === 1062 && error.sqlMessage.indexOf('UK_User_LoginId') !== -1) {
                throw new BadRequestException({message: '중복된 로그인 ID가 존재합니다.'});
            }
            throw new InternalServerErrorException({message: '사용자 등록에 실패했습니다. 관리자에게 문의해주세요.'});
        }
    }
}
```

---

## 4. Service

```typescript
// src/api/v1/user/user.service.ts
import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { Transactional } from 'typeorm-transactional';
import { getBcrypt } from '@root/common/utils/bcrypt';
import { createValidationError } from '@root/common/utils/validation';
import { UserEntity } from './entities/user.entity';
import { AdminUserCreateDto } from './dto/admin-user-create.dto';
import { USER_REPOSITORY } from './user.symbols';
import { UserRepositoryInterface } from './interfaces/user.repository.interface';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class UserService {
    constructor(
        @Inject(USER_REPOSITORY)
        private readonly userRepository: UserRepositoryInterface,
    ) {}

    /**
     * 관리자용 사용자 등록
     */
    @UseQueue('user-consumer', 'user-service-admin-create')
    @Transactional()
    async adminCreate(dto: AdminUserCreateDto): Promise<void> {
        if (dto.login_pw !== dto.login_pw2) {
            const message = '비밀번호가 일치하지 않습니다.';
            throw new HttpException({message, validationErrors: createValidationError('login_pw2', message)}, HttpStatus.BAD_REQUEST);
        }

        const existing = await this.userRepository.findOne({login_id: dto.login_id});
        if (existing) {
            const message = '이미 사용 중인 로그인 ID입니다.';
            throw new HttpException({message, validationErrors: createValidationError('login_id', message)}, HttpStatus.BAD_REQUEST);
        }

        const entity = new UserEntity();
        entity.user_id = uuidv4();
        entity.login_id = dto.login_id;
        entity.login_pw = await getBcrypt(dto.login_pw);
        entity.name = dto.name;
        entity.nickname = dto.nickname;
        entity.auth_id = dto.auth_id;
        entity.state_id = 'ACTIVE';
        entity.team_id = dto.team_id ?? null;
        entity.position_id = dto.position_id ?? null;

        await this.userRepository.insert(entity);
    }
}
```

---

## 5. Controller

```typescript
// src/api/v1/user/user.controller.ts
import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { ApiBadRequestResponse, ApiInternalServerErrorResponse, ApiNoContentResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PassportJwtAuthGuard } from '@root/guards/passport.jwt.auth/passport.jwt.auth.guard';
import { RolesGuard } from '@root/guards/roles/roles.guard';
import { Roles } from '@root/guards/roles/roles.decorator';
import { ApiBadRequestResultDto, ApiFailResultDto } from '@root/common/dto/global.result.dto';
import { UserService } from './user.service';
import { AdminUserCreateDto } from './dto/admin-user-create.dto';

@ApiTags('회원')
@Controller('api/v1/user')
export class UserController {
    constructor(private readonly userService: UserService) {}

    /**
     * 관리자 - 사용자 등록
     */
    @Post('admin/create')
    @HttpCode(204)
    @UseGuards(PassportJwtAuthGuard, RolesGuard)
    @Roles('ADMIN', 'SUPER_ADMIN')
    @ApiOperation({summary: '관리자 - 사용자 등록'})
    @ApiNoContentResponse({description: '성공'})
    @ApiBadRequestResponse({description: '유효성 오류 / 중복 로그인 ID', type: ApiBadRequestResultDto})
    @ApiInternalServerErrorResponse({description: '서버 오류', type: ApiFailResultDto})
    async adminCreate(@Body() dto: AdminUserCreateDto): Promise<void> {
        return this.userService.adminCreate(dto);
    }
}
```

---

## 6. 테스트 케이스

```
[SUCCESS]              정상 등록
[FAIL:validation]      필수 필드 전체 누락 (login_id, login_pw, name, nickname, auth_id)
[FAIL:duplicate]       t_user — login_id 중복 (repository insert 1062)
[FAIL:service]         비밀번호 불일치 (login_pw !== login_pw2)
[FAIL:service]         login_id 이미 사용 중 (findOne 결과 존재)
[FAIL:repository]      findOne 실패 (InternalServerErrorException)
[FAIL:repository]      insert 실패 (InternalServerErrorException)
```

---

## 7. Response 코드

| 상태코드 | 원인 |
|----------|------|
| 204 | 성공 |
| 400 | 필수 필드 누락 / login_id 중복 / 이미 사용 중인 로그인 ID |
| 401 | 인증 실패 (JWT 없음 또는 만료) |
| 403 | 권한 없음 (ADMIN, SUPER_ADMIN 아닌 경우) |
| 500 | 서버 오류 |
