# 확정 설계 결정사항 규칙

코드 컨벤션·docs 로 일괄 판단이 어려운 항목은 Claude 가 임의 결정하지 말고 request.md "확정 설계 결정사항" 섹션에 질문으로 나열한다. 사용자가 답을 채운 뒤 work 작성으로 진행. 답변 없는 항목이 남은 상태에서 Claude 는 work 파일을 작성하지 않는다.

Claude 는 초안 작성 시 아래 카테고리에서 **해당 기능에 관련된 항목만** 골라 `[ ]` 체크리스트로 추가한다 (무관한 항목은 생략).

## A. 인증·권한 (모든 API 공통 — 필수 질문)
- 인증 필요 여부 (`PassportJwtAuthGuard` Y/N)
- 권한 제한 (`@Roles` 값, 없으면 "없음". 복수 지정 가능: 예 "ADMIN, SUPER_ADMIN")

## B. 큐 (INSERT/UPDATE/DELETE 포함 시)
- `@UseQueue` 적용 여부 (Y/N)
- N 인 경우 request.md "큐 미사용 사유" 섹션 필수

## C. 응답 형식 (GET·POST·PATCH 모두)
- 성공 응답 형식 (204 No Content / 200·`ResultDto`)
- 단일 조회 응답의 래퍼 필드명 (`info` / `item`) — 단일 리소스 조회일 때만

## D. 목록 API (GET list)
- 페이지네이션 적용 여부 (Y/N)
- 정렬·필터 옵션 목록 (필드·값 범위·기본값) — request 본문에 정리

## E. 트랜잭션
- `@Transactional()` 적용 여부 (write 는 기본 Y, 미적용 시 사유)
- 여러 service 메서드 체이닝·스케줄러 트리거 등 추가 트랜잭션 경계가 필요한 경우

## F. Entity (신규 Entity 또는 기존 Entity 확장 시)
- 신규 Entity 생성 vs 기존 Entity 컬럼 추가
- Unique constraint 적용 (컬럼 조합과 이름)
- FK 관계 (`@ManyToOne` 대상, `onDelete`/`onUpdate` 정책)
- 인덱스 추가 필요 여부

## G. 유틸·공용 모듈
- 새 util 추가 시 범위 (전역 `src/common/utils/` vs 도메인 `<domain>.util.ts`)
- 공용 Entity/Repository 가 필요한 경우 `shared/` 배치 여부

## H. 기타
- 스케줄러 연계 (cron 트리거 필요 여부)
- 외부 시스템 연동 (메일·푸시·외부 API 등)
- errno 1062 처리 지점 (범용 `update` 사용 시 service 에서 catch 할 constraint)

## 질문 형식 예시 (request.md 본문에 추가)

```markdown
## 확정 설계 결정사항
- [ ] A. 인증 필요 여부 (Y/N):
- [ ] A. 권한 제한 (@Roles 값 / 없음):
- [ ] B. 큐 적용 여부 (Y/N):
- [ ] C. 성공 응답 형식 (204 / ResultDto):
- [ ] E. @Transactional 적용 여부 (Y/N):
```
