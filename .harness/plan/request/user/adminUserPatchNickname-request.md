---
feature_goal: "관리자용 회원 닉네임 변경"
domain: "user"
api_method: "PATCH"
api_path: "/api/v1/admin/user/nickname"
affected_tables: ["t_user"]
---

## 기능 설명
관리자가 특정 회원의 닉네임을 변경하는 기능

## API Spec
- Method: PATCH
- Path: /api/v1/admin/user/nickname
- Request Body:
  - user_id: string (필수, @IsNotEmpty)
  - new_nickname: string (필수, @IsNotEmpty)
- Response: 200 void

## 비즈니스 규칙
- 관리자 권한 체크 (@Auths('ADMIN'))
- 존재하지 않는 user_id 시 404
- 닉네임 중복 시 400

## 참고사항
- adminUserPatchPassword 패턴 참고
- t_user.nickname — Unique_User_nickname 제약
