# 기능 수정 — 변경요청 → 구현 사이클

기존에 만들어진 기능에 대한 변경요청부터 구현·테스트·리포트 추기까지 한 사이클로 처리한다. feature-plan/feature-implement 와 평행한 흐름이며, 두 명령으로 단계가 나뉜다:

- `xxx 기능 수정` — 변경요청 단계 (change 문서 작성)
- `xxx 수정 시작` — 구현·테스트·report 추기 단계

## 단계 개요

```
① 사람 → "xxx 기능 수정" + 변경사항 구두 설명
①.5 Claude → 전제 검증 (원본 work.md / report.md 존재 확인)
①.6 Claude → 브랜치 분기 질의 (feature-plan 패턴 재사용)
② Claude → 기존 request/work/report 읽고 영향 범위 파악
③ Claude → change-<YYMMDD>-<N>.md 초안 작성
           (모호한 결정사항 있으면 "확정 설계 결정사항" 섹션에 [ ] 로 나열)
④ 사람 → change 파일 검토 + 결정사항 답변 → "xxx 수정 시작"
⑤ Claude → 전제 재검증 (change.md 존재 + 결정사항 답변 완료)
⑥ Claude → 구현 + spec 수정/추가
⑦ Claude → 테스트 실행 → 자가 수복 (최대 10회)
⑧ Claude → 기존 report.md 끝에 "## 수정 - <YYMMDD>-<N>" 섹션 추가
```

---

## ⚠️ ① 단계 전제 조건 (필수 사전 검증)

`xxx 기능 수정` 명령을 받으면 change.md 작성 **전에** 아래를 순서대로 확인:

1. **원본 work.md 존재 여부** — `.harness/output/work/<domain>/<featureName>-work.md` 가 실제로 존재하는가?
   - 존재하지 않으면 **즉시 중단** 하고 안내:
     > "해당 기능의 work 파일이 없습니다. 기존에 만들어진 기능이 아닙니다. `<featureName> 기능 생성` 으로 신규 생성하세요."
2. **원본 report.md 존재 여부** — `.harness/output/report/<domain>/<featureName>-report.md` 가 존재하는가?
   - 존재하지 않으면 **즉시 중단** 하고 안내:
     > "해당 기능의 report 파일이 없습니다. 구현이 완료되지 않은 기능에 대한 수정은 `xxx 작업 시작` 으로 처리하세요."

전제 위반이면 ① 단계 이하 진입 금지.

## ①.6 브랜치 분기 질의

전제 검증 통과 후 change.md 작성 **직전** 에 사용자에게 다음을 질의:

> "이 수정 작업을 위한 새 작업 브랜치를 만들까요? (예 / 아니오)
>  - 예 → `feature/<domain>-<랜덤6>` 브랜치 생성 후 그 위에서 진행. 푸쉬 시 자동으로 현재 브랜치(`<base>`) 로 머지.
>  - 아니오 → 현재 브랜치(`<base>`) 에서 그대로 진행. 푸쉬 시 일반 절차."

분기 처리 절차는 **feature-plan 의 [브랜치 자동화] 규칙을 그대로 재사용** — [../feature-plan/index.md](../feature-plan/index.md) 의 "브랜치 자동화" 섹션 참고. state 파일(`.harness/.auto-branch-state.json`) 갱신·푸쉬 시 머지 동작 모두 동일.

## ② 단계 — 영향 범위 파악

다음 파일을 읽어 변경요청이 닿는 범위를 식별:

- `.harness/output/request/<domain>/<featureName>-request.md`
- `.harness/output/work/<domain>/<featureName>-work.md`
- `.harness/output/report/<domain>/<featureName>-report.md`
- 같은 도메인 내 이전 회차 change 파일 (있을 경우)

식별 시 확인 항목:
- 어떤 DTO / Repository 메서드 / Service 메서드 / Controller 엔드포인트가 영향받는지
- `affected_tables` 가 바뀌는지 (duplicate 테스트 케이스 수에 영향)
- 새 service throw 분기 / repository catch 블록이 추가되는지
- 응답 코드가 바뀌는지

## ③ 단계 — change 파일 초안 작성

- 템플릿: `.harness/templates/change.md`
- 저장 위치: `.harness/output/change/<domain>/<featureName>-change-<YYMMDD>-<N>.md`
- 파일 작성 규칙 상세 → [change-file.md](./change-file.md)
- "확정 설계 결정사항" 작성 가이드는 feature-plan 의 [design-decisions.md](../feature-plan/design-decisions.md) 와 동일

---

## ⚠️ ⑤ 단계 전제 조건 (필수 사전 검증)

`xxx 수정 시작` 명령을 받으면 구현 진입 **전에** 아래를 순서대로 확인:

1. **change.md 존재 여부** — `.harness/output/change/<domain>/<featureName>-change-<YYMMDD>-<N>.md` 의 가장 최신 회차 파일이 존재하는가?
   - Bash 로 `ls .harness/output/change/*/<featureName>-change-*.md` 확인 → 가장 큰 `<YYMMDD>-<N>` 조합이 이번 회차
   - 존재하지 않으면 **즉시 중단** 하고 안내:
     > "해당 기능의 change 파일이 없습니다. 먼저 `<featureName> 기능 수정` 으로 change 문서를 작성하세요."
2. **change.md '확정 설계 결정사항' 미답 항목 없음** — `[ ]` 체크리스트가 모두 채워져 있어야 함. 미답 항목 있으면 중단하고 사용자에게 답변 요청.
3. **change.md '사전 구현 필요 항목' 전부 완료** — 섹션이 존재하면 모든 체크박스가 `[x]` 상태여야 함. 미완료 시 중단.

위 세 조건이 모두 만족되지 않으면 ⑥ 단계 이하 진입 금지.

## 브랜치 (⑤ 시점)

브랜치 분기 결정은 **`xxx 기능 수정` 의 ①.6 시점에 이미 끝나 있음** — 구현 시점에 별도 브랜치 질의/체크 없이 현재 브랜치에서 그대로 진행.

## ⑥~⑦ 단계 — 구현 / 테스트

- 구현은 change.md 의 "변경 후 스펙" 그대로 반영
- spec 파일 수정/추가: 새 분기 발생 시 해당 카테고리 케이스 추가, 제거된 분기는 케이스 삭제
- 테스트 실행: `npm test -- --testPathPatterns=<featureName>`
  - 실패 시 에러 분석 후 수정 (최대 10회)
- 도메인 회귀 테스트: `npm test -- --testPathPatterns=src/api/v1/<domain>` 으로 본 기능 외 spec 영향 확인
  - 수정에 의한 회귀 발견 시 즉시 처리 (기존 실패라며 떠넘기지 않음)
- 테스트 강도 규칙은 feature-implement 와 동일 → [../feature-implement/test-file.md](../feature-implement/test-file.md)

## ⑧ 단계 — report 추기

원본 report 파일은 **삭제·재작성하지 않고**, 끝에 회차별 섹션을 누적 추가:

- 위치: `.harness/output/report/<domain>/<featureName>-report.md` (기존 파일에 append)
- 헤더 형식: `## 수정 - <YYMMDD>-<N>`
- 포함 내용:
  - **변경사항 요약** — change.md 의 "변경요청 사유" 한두 줄 요약
  - **수정/추가/삭제된 파일 목록** — change.md 의 "영향받는 파일" 표 기반
  - **테스트 결과** — 스위트 수, 통과/실패
  - **자가 수복 이력** — 재시도가 있었을 경우 원인·수정 내용
  - **잔여 이슈** — 없으면 "없음"

추기 예시:

```markdown
## 수정 - 260428-1

### 변경사항 요약
관리자 회원가입 시 `nickname` 길이 제약을 2~12자에서 2~20자로 확장.

### 수정/추가/삭제된 파일
| 파일 | 변경 유형 | 설명 |
|------|-----------|------|
| `src/api/v1/user/dto/admin-sign.dto.ts` | 수정 | nickname 의 @MaxLength 12 → 20 |
| `src/api/v1/user/test/admin-sign.spec.ts` | 수정 | nickname 길이 경계 케이스 갱신 |

### 테스트 결과
- 스위트: 1 / 전체: 12 / 통과: 12 / 실패: 0

### 자가 수복 이력
없음 — 최초 실행 통과

### 잔여 이슈
없음
```

---

## 원본 보존 정책

- **request.md / work.md** — 수정 금지, 참조만
- **변경된 내용은 새 change 파일에만 기록** — 회차별로 분리되어 초기 설계 ↔ 현재 설계 비교 가능
- **report.md** — 수정 대신 끝에 추기. 한 기능의 전체 이력을 한 파일에서 추적

## 관련 규칙

- change 파일 작성 규칙 → [change-file.md](./change-file.md)
- 확정 설계 결정사항 작성 가이드 → [../feature-plan/design-decisions.md](../feature-plan/design-decisions.md)
- 테스트 강도 규칙 → [../feature-implement/test-file.md](../feature-implement/test-file.md)
- 브랜치 자동화 (state 파일 형식·푸쉬 동작) → [../feature-plan/index.md](../feature-plan/index.md) 의 "브랜치 자동화" 섹션
