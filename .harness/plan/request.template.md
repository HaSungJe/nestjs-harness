---
# 예: "회원가입" — 이 기능이 무엇을 하는지 한 줄 요약
feature_goal: "관리자용 회원가입" 

# 예: "user" — src/api/v1/ 아래 도메인명 (파일 경로에 직접 사용)
domain: "user" 

# GET | POST | PATCH | PUT | DELETE
api_method: "POST" 

# 예: "/api/v1/user/admin/sign"
api_path: "/api/v1/user/admin/sign" 

# 예: ["user", "user_profile"] — INSERT/UPDATE/DELETE 대상 테이블 (duplicate 테스트 케이스 수 결정)
affected_tables: ["t_user"]
---

<!-- 이 기능이 왜 필요한지, 무엇을 하는지 설명 -->
## 기능 설명
관리자가 직접 회원가입을 처리하기 위한 기능

<!-- Method, Path, Request Body/Params, Response 형태 -->
## API Spec
- Method: POST
- Path: /api/v1/user/admin/sign
- Request Body:
    - login_id: string (필수, 2~16자리)
    - email: string (필수, 이메일여부 확인)
    - login_pw: string (필수, 6~20자리)
    - login_pw2: string (필수, 6~20자리, login_pw와 동일해야함.)
    - nickname: string (필수)
- Response: 200 void

<!-- 중복 체크, 권한, 조건 분기 등 -->
## 비즈니스 규칙
- 관리자 권한 체크

<!-- 관련 도메인, 참고할 기존 코드, 특이사항 -->
## 참고사항
- /api/v1/user/sign
