---
feature_goal: "관리자용 회원 탈퇴처리"
domain: "user"
api_method: "DELETE"
api_path: "/api/v1/admin/user/:user_id"
affected_tables: ["t_user"]
---

## 기능 설명
관리자가 특정 회원을 탈퇴 처리하는 기능

## API Spec
- Method: DELETE
- Path: /api/v1/admin/user/:user_id
- Path Param:
  - user_id: string (필수)
- Response: 200 void

## 비즈니스 규칙
- 관리자 권한 체크 (@Roles('ADMIN'))
- 존재하지 않는 user_id 시 404
- 이미 탈퇴된 회원(state_id === 'LEAVE') 시 400

## 참고사항
- state_id를 'LEAVE'로 변경 (실제 삭제 아님, soft delete)
- adminUserPatchNickname 패턴 참고
