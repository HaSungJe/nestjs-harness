---
feature_goal: "관리자용 회원 비밀번호 변경"
domain: "user"
api_method: "PATCH"
api_path: "/api/v1/admin/user/password"
affected_tables: ["t_user"]
---

## 기능 설명
관리자가 특정 회원의 비밀번호를 변경하는 기능

## API Spec
- Method: PATCH
- Path: /api/v1/admin/user/password
- Request Body:
  - user_id: string (필수, @IsNotEmpty)
  - new_login_pw: string (필수, @MinLength(6), @MaxLength(20))
  - new_login_pw2: string (필수, @MinLength(6), @MaxLength(20), new_login_pw와 동일해야 함)
- Response: 200 void

## 비즈니스 규칙
- 관리자 권한 체크 (@Auths('ADMIN'))
- new_login_pw !== new_login_pw2 시 400
- 존재하지 않는 user_id 시 404

## 참고사항
- 기존 /api/v1/admin/user/:user_id (view) 패턴 참고
- 비밀번호 해시: bcrypt (기존 sign 로직 참고)
