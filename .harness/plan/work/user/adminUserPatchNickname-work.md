# Work Plan — adminUserPatchNickname

## 기능 요약
- **기능**: 관리자용 회원 닉네임 변경
- **API**: `PATCH /api/v1/admin/user/nickname`
- **도메인**: user

---

## 파일 목록

| 파일 | 작업 |
|------|------|
| `src/api/v1/user/admin/dto/admin.patch-nickname.dto.ts` | 신규 생성 |
| `src/api/v1/user/admin/admin.user.service.ts` | patchNickname 메서드 추가 |
| `src/api/v1/user/admin/admin.user.controller.ts` | PATCH /nickname 엔드포인트 추가 |
| `src/api/v1/user/admin/test/adminUserPatchNickname.spec.ts` | 신규 생성 |

`interfaces/`, `repositories/`, `user.module.ts`, `user.symbols.ts` — 변경 없음 (update/findById 이미 존재)

---

## 1. DTO

```typescript
// src/api/v1/user/admin/dto/admin.patch-nickname.dto.ts

import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';

export class AdminPatchNicknameDto {
    @ApiProperty({ description: '회원 ID', required: true })
    @IsNotEmpty({ message: '회원 ID를 입력해주세요.' })
    user_id: string;

    @ApiProperty({ description: '새 닉네임', required: true })
    @IsNotEmpty({ message: '닉네임을 입력해주세요.' })
    new_nickname: string;
}
```

---

## 2. Repository Interface

변경 없음 — `findById`, `update` 재사용

---

## 3. Repository 구현

변경 없음

---

## 4. Service

```typescript
/**
 * 관리자 회원 닉네임 변경
 *
 * @param dto
 */
@UseQueue('user-consumer', 'admin-user-service-patch-nickname')
@Transactional()
async patchNickname(dto: AdminPatchNicknameDto): Promise<void> {
    const user = await this.adminUserRepository.findById(dto.user_id);
    if (!user) {
        throw new NotFoundException({ message: '존재하지 않는 회원입니다.' });
    }

    try {
        const entity = new UserEntity();
        entity.nickname = dto.new_nickname;
        await this.adminUserRepository.update({ user_id: dto.user_id }, entity);
    } catch (error) {
        if (error.errno === 1062 && error.sqlMessage.indexOf('Unique_User_nickname') !== -1) {
            const message = '이미 사용중인 닉네임입니다.';
            throw new BadRequestException({ message });
        }
        throw error;
    }
}
```

> errno 1062 처리: `update`가 범용 메서드라 repository에서 제약 식별 불가 → service에서 처리

---

## 5. Controller

```typescript
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
```

---

## 6. 테스트 케이스

```
[SUCCESS]           정상적으로 닉네임 변경
[FAIL:validation]   user_id · new_nickname 전체 누락
[FAIL:service]      존재하지 않는 user_id (404)
[FAIL:duplicate]    t_user — nickname 중복 (400)
[FAIL:repository]   DB 오류 (500)
```

---

## 7. Response 코드

| 상태코드 | 원인 |
|----------|------|
| 200 | 성공 |
| 400 | validation 실패, 닉네임 중복 |
| 401 | 인증 실패 |
| 403 | 관리자 권한 없음 |
| 404 | 존재하지 않는 회원 |
| 500 | DB 오류 |
