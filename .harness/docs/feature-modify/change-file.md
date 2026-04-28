# Change 파일 규칙

기존 기능에 대한 변경요청을 회차별로 기록하는 문서. 원본 work.md 를 수정하지 않고, change 파일을 누적해 변경 이력을 추적한다.

## 파일 명명 / 위치

- 위치: `.harness/output/change/<domain>/<featureName>-change-<YYMMDD>-<N>.md`
- `<YYMMDD>`: 변경요청일 (오늘 날짜를 6자리로). 예: `260428`
- `<N>`: 같은 날 기존 change 파일 개수 + 1
- 예시:
  - `signUp-change-260428-1.md` — 4월 28일 첫 번째 변경요청
  - `signUp-change-260428-2.md` — 같은 날 두 번째 변경요청
  - `signUp-change-260501-1.md` — 5월 1일 첫 번째 변경요청 (날짜가 바뀌면 N 은 1부터)

### N 결정 절차

```bash
ls .harness/output/change/<domain>/<featureName>-change-<YYMMDD>-*.md 2>/dev/null | wc -l
```

위 결과에 1 을 더한 값이 새 파일의 `<N>`. 결과가 0 이면 N=1.

## 작성 규칙

- 템플릿: `.harness/templates/change.md` 기반으로 작성
- 필수 섹션:
  - 메타 (원본 work / request / 이전 회차 change 경로 명시)
  - 변경요청 사유
  - 변경 범위 (영향 분석) — 수정 대상 / 신규 추가 / 삭제 / 영향받는 파일
  - 변경 후 스펙 — 원본 work.md 의 7개 섹션 중 변경되는 것만 발췌. 변경 없는 섹션은 "변경 없음" 으로 명시
- 선택 섹션:
  - 사전 구현 필요 항목 (새 인프라 의존이 생긴 경우만)
  - 확정 설계 결정사항 (애매한 항목이 있는 경우만)
- **frontmatter 쓰지 않음** — 원본 request.md 만 frontmatter 사용. change 는 일반 마크다운

## 변경 범위 작성 시 확인 항목

영향 범위 식별을 위해 원본 work.md 와 대조:

- 어떤 DTO 클래스/필드가 추가·삭제·변경되는가
- 어떤 Repository 메서드 시그니처가 바뀌는가
- 어떤 Service 메서드의 분기·트랜잭션 범위가 바뀌는가
- 어떤 Controller 엔드포인트의 path/method/Swagger 데코레이터가 바뀌는가
- `affected_tables` 가 추가·삭제되는가 (duplicate 테스트 케이스 수에 영향)
- 새 service throw 분기가 생기는가 (`[FAIL:service]` 케이스 추가)
- 새 repository catch 블록이 생기는가 (`[FAIL:repository]` 케이스 추가)
- 응답 코드가 추가·삭제되는가

## 테스트 케이스 변경 규칙

원본 spec 파일의 모든 케이스를 다 다시 적지 않는다. **변경분만** 기재:

- 추가될 케이스: `[FAIL:service] 새 분기 X — Y 메시지`
- 수정될 케이스: `[SUCCESS] entity 컬럼 set 검증에 새 컬럼 nickname 추가`
- 삭제될 케이스: `[FAIL:duplicate] t_user_profile 중복 — 테이블 제거로 삭제`

변경 없는 케이스는 "변경 없음" 으로 통일.

## 회차 간 비교 가능성

같은 날 여러 회차가 발생할 수 있고, 다른 날 회차도 누적된다. 각 change 파일은 **독립적으로 읽어도** 그 회차의 변경 내용을 이해할 수 있게 작성한다:

- "메타" 섹션의 `이전 회차 change` 필드로 직전 회차를 명시
- "변경 전" 컬럼은 직전 회차 시점의 스펙(또는 원본 work.md 시점) 을 기준으로 작성
- "변경 후" 컬럼은 이번 회차 적용 후 스펙

## 검증

change 파일 작성 직후 Claude 는 아래 항목을 자가 점검 후 ✅/❌ 로 출력:

- [ ] 파일 저장 위치가 `.harness/output/change/<domain>/<featureName>-change-<YYMMDD>-<N>.md` 규약을 따름
- [ ] frontmatter 없음
- [ ] 메타 섹션의 원본 work / request / 이전 회차 경로가 실제 존재하는 파일을 가리킴
- [ ] 변경 범위 섹션이 원본 work.md 의 변경 대상을 모두 식별 (누락 없음)
- [ ] 변경 후 스펙의 코드 블록이 실제 구현 가능한 수준
- [ ] `affected_tables` 가 바뀌면 `[FAIL:duplicate]` 케이스 변경에 반영됨
- [ ] service throw 분기·repository catch 블록 변경이 `[FAIL:service]`/`[FAIL:repository]` 케이스 변경에 반영됨
- [ ] 사전 구현 필요 항목이 있을 경우, 해당 인프라가 `src/` 에 없는 것을 Bash 로 확인했음
- [ ] 확정 설계 결정사항이 있을 경우, 모든 항목이 `[ ]` 형태로 답변 대기 상태

미충족 항목이 있으면 즉시 change 파일 수정 후 재출력.

## 원본 보존

- **원본 request.md / work.md 는 절대 수정하지 않는다** — 참조만
- 변경된 내용은 오로지 새 change 파일에만 기록
- 이유: 초기 설계와 변경 이력의 분리, 회차별 비교 가능성 확보
