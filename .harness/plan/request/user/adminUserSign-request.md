---
feature_goal: "관리자용 회원가입"
domain: "user"
api_method: "POST"
api_path: "/api/v1/user/admin/sign"
affected_tables: ["t_user"]
---

## 기능 설명
관리자가 직접 회원가입을 처리하기 위한 기능

## API Spec
- Method: POST
- Path: /api/v1/user/admin/sign
- Request Body:
  - login_id: string (필수, @MinLength(2), @MaxLength(16))
  - email: string (필수, @IsEmail)
  - login_pw: string (필수, @MinLength(6), @MaxLength(20))
  - login_pw2: string (필수, @MinLength(6), @MaxLength(20), login_pw와 동일해야 함)
  - nickname: string (필수)
- Response: 200 void

## 비즈니스 규칙
- 관리자 권한 체크 (@Auths('ADMIN'))
- login_pw !== login_pw2 시 400

## 참고사항
- /api/v1/user/sign 패턴 참고
