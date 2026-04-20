---
feature_goal: "관리자 회원 상세 조회"
domain: "user"
api_method: "GET"
api_path: "/api/v1/admin/user/:user_id"
affected_tables: []
---

## 기능 설명
관리자가 특정 회원의 상세 정보를 조회하는 기능

## API Spec
- Method: GET
- Path: /api/v1/admin/user/:user_id
- Path Param:
  - user_id: string (필수)
- Response: 200
  - info:
    - user_id: string
    - login_id: string
    - name: string
    - nickname: string
    - create_at: string
    - auth_id: string
    - auth_name: string
    - state_id: string
    - state_name: string

## 비즈니스 규칙
- 관리자 권한 체크 (@Auths('ADMIN'))
- 존재하지 않는 user_id 요청 시 404

## 참고사항
- /api/v1/admin/user/list 패턴 참고
