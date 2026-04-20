# Work Plan — adminUserView

## 수정/생성 파일 목록

| 파일 | 작업 |
|------|------|
| `src/api/v1/user/admin/dto/view.dto.ts` | 신규 생성 (ParamDto + InfoDto + ResultDto 한 파일) |
| `src/api/v1/user/admin/interfaces/admin.user.repository.interface.ts` | findById 메서드 추가 |
| `src/api/v1/user/admin/repositories/admin.user.repository.ts` | findById 메서드 추가 |
| `src/api/v1/user/admin/admin.user.service.ts` | view 메서드 추가 |
| `src/api/v1/user/admin/admin.user.controller.ts` | GET /admin/user/:user_id 엔드포인트 추가 |
| `src/api/v1/user/admin/test/adminUserView.spec.ts` | 신규 생성 |

`user.module.ts`, `user.symbols.ts` — 변경 없음

---

## 1. DTO — view.dto.ts

```typescript
// Path Param
export class AdminUserViewParamDto {
    @IsNotEmpty() user_id: string;
}

// Item (조회 결과 항목)
export class AdminUserViewItemDto {
    user_id: string;
    login_id: string;
    name: string;
    nickname: string;
    create_at: string;
    auth_id: string;
    auth_name: string;
    state_id: string;
    state_name: string;
}

// Result
export class AdminUserViewResultDto {
    info: AdminUserViewItemDto;
}
```

---

## 3. Repository Interface — findById 추가

```typescript
findById(user_id: string): Promise<AdminUserViewItemDto | null>;
```

---

## 4. AdminUserRepository — findById 추가

```typescript
async findById(user_id: string): Promise<AdminUserViewItemDto | null> {
    try {
        const builder = this.repository.createQueryBuilder('u');
        builder.select(`
              u.user_id
            , u.login_id
            , u.name
            , u.nickname
            , date_format(u.create_at, '%Y-%m-%d %H:%i') as create_at
            , a.auth_id
            , a.auth_name
            , s.state_id
            , s.state_name
        `);
        builder.innerJoin('t_auth', 'a', 'u.auth_id = a.auth_id');
        builder.innerJoin('t_state', 's', 'u.state_id = s.state_id');
        builder.where('u.user_id = :user_id', { user_id });
        return builder.getRawOne<AdminUserViewItemDto>();
    } catch (error) {
        throw new InternalServerErrorException({message: '회원 정보 조회에 실패했습니다. 관리자에게 문의해주세요.'});
    }
}
```

---

## 5. AdminUserService — view 메서드 추가

```typescript
async view(user_id: string): Promise<AdminUserViewResultDto> {
    try {
        const info = await this.adminUserRepository.findById(user_id);
        if (!info) {
            throw new NotFoundException({message: '존재하지 않는 회원입니다.'});
        }
        return { info };
    } catch (error) {
        throw error;
    }
}
```

---

## 6. AdminUserController — GET /admin/user/:user_id 추가

```typescript
@Get('/:user_id')
@UseGuards(PassportJwtAuthGuard, RolesGuard)
@Roles('ADMIN, SUPER_ADMIN')
@ApiOperation({summary: '관리자 회원 상세 조회'})
@ApiOkResponse({type: AdminUserViewResultDto})
@ApiNotFoundResponse({type: ApiFailResultDto})
@ApiForbiddenResponse({type: ApiFailResultDto})
@ApiInternalServerErrorResponse({type: ApiFailResultDto})
async view(@Param() param: AdminUserViewParamDto): Promise<AdminUserViewResultDto>
```

---

## 7. 테스트 — adminUserView.spec.ts

```
[SUCCESS]          정상 user_id로 조회 시 info 반환
[FAIL:validation]  user_id 누락
[FAIL:service]     존재하지 않는 user_id → 404
[FAIL:service]     관리자 권한 없음 → 403
[FAIL:repository]  DB 오류 → 500
```

---

## Response 정리

| 상태코드 | 원인 |
|----------|------|
| 200 | 성공 |
| 403 | 관리자 권한 없음 |
| 404 | 존재하지 않는 user_id |
| 500 | DB 오류 |
