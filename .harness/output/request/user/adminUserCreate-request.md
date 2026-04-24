---
feature_goal: "관리자용 사용자 등록"
domain: "user"
api_method: "POST"
api_path: "/api/v1/user/admin/create"
affected_tables: ["t_user"]
---

## 기능 설명
관리자가 신규 사용자를 직접 등록하는 기능

## API Spec
- Method: POST
- Path: /api/v1/user/admin/create
- Request Body:
    - login_id: string (필수)
    - login_pw: string (필수)
    - name: string (필수)
    - nickname: string (필수)
    - auth_id: string (필수) — 권한 ID
    - team_id: string (선택) — 팀 ID
    - position_id: string (선택) — 직급 ID
- Response: 200 void

## 비즈니스 규칙
- ADMIN 또는 SUPER_ADMIN 권한 필요
- login_id 중복 불가
- state_id는 등록 시 'ACTIVE' 고정
- user_id는 uuid로 생성

## 참고사항
- t_user insert
