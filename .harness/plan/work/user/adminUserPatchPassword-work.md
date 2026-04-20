# Work Plan — adminUserPatchPassword

## 기능 요약
- **기능**: 관리자용 회원 비밀번호 변경
- **API**: `PATCH /api/v1/admin/user/password`
- **도메인**: user

---

## 파일 목록

| 파일 | 작업 |
|------|------|
| `src/api/v1/user/admin/dto/admin.patch-password.dto.ts` | 신규 생성 |
| `src/api/v1/user/admin/interfaces/admin.user.repository.interface.ts` | update 범용 메서드 추가 |
| `src/api/v1/user/admin/repositories/admin.user.repository.ts` | update 범용 메서드 추가 |
| `src/api/v1/user/admin/admin.user.service.ts` | patchPassword 메서드 추가 |
| `src/api/v1/user/admin/admin.user.controller.ts` | PATCH /password 엔드포인트 추가 |
| `src/api/v1/user/admin/test/adminUserPatchPassword.spec.ts` | 신규 생성 |

`user.module.ts`, `user.symbols.ts` — 변경 없음

---

## 1. DTO

```typescript
// src/api/v1/user/admin/dto/admin.patch-password.dto.ts

import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, Length } from 'class-validator';

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
```

---

## 2. Repository Interface

```typescript
/**
 * 회원 정보 업데이트
 *
 * @param where
 * @param entity
 */
update(where: FindOptionsWhere<UserEntity>, entity: UserEntity): Promise<void>;
```

---

## 3. Repository 구현

```typescript
/**
 * 회원 정보 업데이트
 *
 * @param where
 * @param entity
 */
async update(where: FindOptionsWhere<UserEntity>, entity: UserEntity): Promise<void> {
    try {
        await this.repository.update(where, entity);
    } catch (error) {
        throw error;
    }
}
```

---

## 4. Service

```typescript
/**
 * 관리자 회원 비밀번호 변경
 *
 * @param dto
 */
@UseQueue('user-consumer', 'admin-user-service-patch-password')
@Transactional()
async patchPassword(dto: AdminPatchPasswordDto): Promise<void> {
    if (dto.new_login_pw !== dto.new_login_pw2) {
        const message = '비밀번호가 일치하지 않습니다.';
        const validationErrors = createValidationError('new_login_pw2', message);
        throw new HttpException({ message, validationErrors }, HttpStatus.BAD_REQUEST);
    }

    const user = await this.adminUserRepository.findById(dto.user_id);
    if (!user) {
        throw new NotFoundException({ message: '존재하지 않는 회원입니다.' });
    }

    try {
        const entity = new UserEntity();
        entity.login_pw = await getBcrypt(dto.new_login_pw);
        await this.adminUserRepository.update({ user_id: dto.user_id }, entity);
    } catch (error) {
        throw error;
    }
}
```

---

## 5. Controller

```typescript
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
```

---

## 6. 테스트 케이스

```
[SUCCESS]           정상적으로 비밀번호 변경
[FAIL:validation]   user_id · new_login_pw · new_login_pw2 전체 누락
[FAIL:service]      new_login_pw !== new_login_pw2 (400)
[FAIL:service]      존재하지 않는 user_id (404)
[FAIL:repository]   DB 오류 (500)
```

---

## 7. Response 코드

| 상태코드 | 원인 |
|----------|------|
| 200 | 성공 |
| 400 | validation 실패, 비밀번호 불일치 |
| 401 | 인증 실패 |
| 403 | 관리자 권한 없음 |
| 404 | 존재하지 않는 회원 |
| 500 | DB 오류 |
