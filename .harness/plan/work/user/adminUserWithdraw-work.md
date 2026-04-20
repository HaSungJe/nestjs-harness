# Work Plan — adminUserWithdraw

## 기능 요약
- **기능**: 관리자용 회원 탈퇴처리
- **API**: `DELETE /api/v1/admin/user/:user_id`
- **도메인**: user

---

## 파일 목록

| 파일 | 작업 |
|------|------|
| `src/api/v1/user/admin/dto/admin.withdraw.dto.ts` | 신규 생성 (ParamDto) |
| `src/api/v1/user/admin/admin.user.service.ts` | withdraw 메서드 추가 |
| `src/api/v1/user/admin/admin.user.controller.ts` | DELETE /:user_id 엔드포인트 추가 |
| `src/api/v1/user/admin/test/adminUserWithdraw.spec.ts` | 신규 생성 |

`interfaces/`, `repositories/`, `user.module.ts`, `user.symbols.ts` — 변경 없음 (update/findById 재사용)

---

## 1. DTO

```typescript
// src/api/v1/user/admin/dto/admin.withdraw.dto.ts

import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';

export class AdminWithdrawParamDto {
    @ApiProperty({ description: '회원 ID', required: true })
    @IsNotEmpty({ message: '회원 ID를 입력해주세요.' })
    user_id: string;
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
 * 관리자 회원 탈퇴처리
 *
 * @param user_id
 */
@UseQueue('user-consumer', 'admin-user-service-withdraw')
@Transactional()
async withdraw(user_id: string): Promise<void> {
    const user = await this.adminUserRepository.findById(user_id);
    if (!user) {
        throw new NotFoundException({ message: '존재하지 않는 회원입니다.' });
    }
    if (user.state_id === 'LEAVE') {
        const message = '이미 탈퇴처리된 회원입니다.';
        throw new HttpException({ message }, HttpStatus.BAD_REQUEST);
    }

    try {
        const entity = new UserEntity();
        entity.state_id = 'LEAVE';
        await this.adminUserRepository.update({ user_id }, entity);
    } catch (error) {
        throw error;
    }
}
```

---

## 5. Controller

```typescript
/**
 * 관리자 회원 탈퇴처리
 *
 * @param param
 */
@Delete('/:user_id')
@UseGuards(PassportJwtAuthGuard, RolesGuard)
@Roles('ADMIN, SUPER_ADMIN')
@ApiOperation({ summary: '관리자 회원 탈퇴처리' })
@ApiOkResponse()
@ApiBadRequestResponse({ type: ApiBadRequestResultDto })
@ApiUnauthorizedResponse({ type: ApiFailResultDto })
@ApiForbiddenResponse({ type: ApiFailResultDto })
@ApiNotFoundResponse({ type: ApiFailResultDto })
@ApiInternalServerErrorResponse({ type: ApiFailResultDto })
async withdraw(@Param() param: AdminWithdrawParamDto): Promise<void | ApiBadRequestResultDto | ApiFailResultDto> {
    try {
        await this.service.withdraw(param.user_id);
    } catch (error) {
        throw error;
    }
}
```

---

## 6. 테스트 케이스

```
[SUCCESS]           정상적으로 탈퇴처리
[FAIL:validation]   user_id 누락
[FAIL:service]      존재하지 않는 user_id (404)
[FAIL:service]      이미 탈퇴된 회원 (400)
[FAIL:repository]   DB 오류 (500)
```

---

## 7. Response 코드

| 상태코드 | 원인 |
|----------|------|
| 200 | 성공 |
| 400 | validation 실패, 이미 탈퇴된 회원 |
| 401 | 인증 실패 |
| 403 | 관리자 권한 없음 |
| 404 | 존재하지 않는 회원 |
| 500 | DB 오류 |
