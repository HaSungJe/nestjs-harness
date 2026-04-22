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

# Y | N — 이 기능이 INSERT/UPDATE/DELETE를 한 건이라도 포함하면 기본 "Y" (BullMQ로 직렬화).
# affected_tables가 비어있는 SELECT 전용이면 "N".
# write 작업이 있는데도 "N"으로 두려면 사유를 아래 본문 "큐 미사용 사유" 섹션에 명시할 것.
queue_required: "Y"
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

<!--
  코드 컨벤션·docs 만으로 결정이 어려운 항목은 여기에 질문으로 나열.
  Claude 가 초안 작성 시 "해당 기능에 관련된 항목만" 골라 [ ] 체크리스트로 추가 (무관 항목은 삭제).
  사용자가 답(Y/N 또는 값)을 채운 뒤 work 파일 작성으로 진행.
  미답 항목이 있으면 Claude 는 work 파일을 작성하지 않는다.

  → 카테고리 상세: CLAUDE.md "확정 설계 결정사항 규칙" 참고
-->
## 확정 설계 결정사항

### A. 인증·권한 (모든 API 필수)
- [ ] 인증 필요 여부 (PassportJwtAuthGuard, Y/N):
- [ ] 권한 제한 (@Roles 값 / 없음):

### B. 큐 (INSERT/UPDATE/DELETE 포함 시)
- [ ] 큐 적용 여부 (Y/N):
<!-- N 인 경우 "큐 미사용 사유" 섹션 아래에 추가 -->

### C. 응답 형식
- [ ] 성공 응답 형식 (204 / ResultDto):
- [ ] 단일 조회 래퍼 필드명 (info / item) — 단일 조회일 때만:

### D. 목록 API (GET list — 해당 시만)
- [ ] 페이지네이션 적용 여부 (Y/N):
- [ ] 정렬·필터 옵션 (필드·값 범위·기본값):

### E. 트랜잭션
- [ ] @Transactional 적용 여부 (Y/N):

### F. Entity (신규 Entity 또는 기존 확장 시만)
- [ ] 신규 Entity 생성 vs 기존 컬럼 추가:
- [ ] Unique constraint (컬럼 조합 + 이름 / 없음):
- [ ] FK 관계 (대상 Entity + onDelete/onUpdate / 없음):
- [ ] 인덱스 추가 (컬럼 + 이름 / 없음):

### G. 유틸·공용 모듈 (필요 시만)
- [ ] 새 util 범위 (전역 / 도메인 / 불필요):
- [ ] 공용 Entity/Repository (shared/ 배치 / 불필요):

### H. 기타 (해당 시만)
- [ ] 스케줄러 연계 (cron 필요 여부):
- [ ] 외부 시스템 연동 (메일·푸시·외부 API 등):
- [ ] errno 1062 처리 대상 constraint:

<!-- queue_required: "N"으로 둔 경우에만 작성. write 작업이 있음에도 큐가 불필요한 이유를 명시. -->
<!-- ## 큐 미사용 사유 -->
<!-- 예: 본인 회원만 변경하므로 동시성 충돌 불가 / read-only 집계 트리거만 호출 등 -->

