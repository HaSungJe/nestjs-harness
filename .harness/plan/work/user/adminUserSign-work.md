# Work Plan — adminUserSign

## 수정/생성 파일 목록

| 파일 | 작업 |
|------|------|
| `src/api/v1/user/admin/dto/admin.sign.dto.ts` | 신규 생성 |
| `src/api/v1/user/admin/interfaces/admin.user.repository.interface.ts` | sign 메서드 추가 |
| `src/api/v1/user/admin/repositories/admin.user.repository.ts` | sign 메서드 추가 |
| `src/api/v1/user/admin/admin.user.service.ts` | sign 메서드 추가 |
| `src/api/v1/user/admin/admin.user.controller.ts` | POST /admin/sign 엔드포인트 추가 |
| `src/api/v1/user/admin/test/adminUserSign.spec.ts` | 신규 생성 |

`user.module.ts`, `user.symbols.ts` — 변경 없음 (ADMIN_USER_REPOSITORY 이미 등록됨)

---

## 1. DTO — admin.sign.dto.ts

```typescript
export class AdminSignDto {
    @IsNotEmpty() @Length(2, 16) login_id: string;
    @IsNotEmpty() @Length(6, 20) login_pw: string;
    @IsNotEmpty() @Length(6, 20) login_pw2: string;
    @IsNotEmpty() name: string;
    @IsNotEmpty() nickname: string;
}
```

---

## 2. Repository Interface — sign 추가

```typescript
sign(user: UserEntity): Promise<void>;
```

---

## 3. AdminUserRepository — sign 추가

```typescript
async sign(user: UserEntity): Promise<void> {
    try {
        await this.repository.insert(user);
    } catch (error) {
        if (error.errno === 1062 && error.sqlMessage.indexOf('Unique_User_loginId') !== -1) {
            throw new BadRequestException({message: '이미 사용중인 아이디입니다.', validationErrors: createValidationError('login_id', ...)})
        } else if (error.errno === 1062 && error.sqlMessage.indexOf('Unique_User_nickname') !== -1) {
            throw new BadRequestException({message: '이미 사용중인 닉네임입니다.', validationErrors: createValidationError('nickname', ...)})
        } else {
            throw new InternalServerErrorException({message: '회원가입 처리에 실패했습니다. 관리자에게 문의해주세요.'})
        }
    }
}
```

---

## 4. AdminUserService — sign 추가

```typescript
@UseQueue('user-consumer', 'admin-user-service-sign')
@Transactional()
async sign(dto: AdminSignDto): Promise<void> {
    if (dto.login_pw !== dto.login_pw2) {
        throw new HttpException({message: '비밀번호가 일치하지 않습니다.', validationErrors: createValidationError('login_pw2', ...)}, 400)
    }
    try {
        const user = new UserEntity();
        user.user_id = UUID().replaceAll('-', '');
        user.login_id = dto.login_id;
        user.login_pw = await getBcrypt(dto.login_pw);
        user.name = dto.name;
        user.nickname = dto.nickname;
        user.auth_id = 'USER';
        user.state_id = 'DONE';
        await this.adminUserRepository.sign(user);
    } catch (error) {
        throw error;
    }
}
```

---

## 5. AdminUserController — POST /admin/sign 추가

```typescript
@Post('/sign')
@UseGuards(PassportJwtAuthGuard, RolesGuard)
@Roles('ADMIN, SUPER_ADMIN')
@ApiOperation({summary: '관리자 회원가입'})
@ApiBody({type: AdminSignDto})
@ApiOkResponse()
@ApiBadRequestResponse()
@ApiForbiddenResponse()
@ApiConflictResponse()
@ApiInternalServerErrorResponse()
async sign(@Body() dto: AdminSignDto): Promise<void> { ... }
```

---

## 6. 테스트 — adminUserSign.spec.ts

```
[SUCCESS]          정상 데이터로 회원가입 완료
[FAIL:validation]  login_id·login_pw·login_pw2·name·nickname 전체 누락
[FAIL:duplicate]   t_user — login_id 중복
[FAIL:duplicate]   t_user — nickname 중복
[FAIL:service]     login_pw !== login_pw2
[FAIL:service]     관리자 권한 없음 (403)
[FAIL:repository]  DB 오류 (500)
```

---

## Response 정리

| 상태코드 | 원인 |
|----------|------|
| 200 | 성공 |
| 400 | validation 실패, login_pw 불일치, login_id/nickname 중복 |
| 403 | 관리자 권한 없음 |
| 500 | DB 오류 |
