# 작업 시작 — 구현 단계 (구현 → 테스트 → 리포트)

"xxx 작업 시작" 명령을 받으면 이 문서를 따른다.
워크플로의 **⑤~⑧ 단계**를 수행한다 (work.md 검토 완료 이후 구현·테스트·리포트).

전제: 이전 단계(구두 설명 → request → work) 는 [../feature-plan/index.md](../feature-plan/index.md) 참조. 해당 기능의 work.md 가 이미 존재해야 함.

## 단계

```
⑤ 사람 → work 파일 검토 후 Claude에게 직접 구현 지시 ("xxx 작업 시작")
⑥ Claude → 구현 코드 + src/api/v1/<domain>/test/<feature>.spec.ts 동시 생성
⑦ Claude → Bash로 해당 기능 spec만 실행 (`npm test -- --testPathPatterns=<featureName>`)
           → 실패 시 에러 분석 후 수정 (최대 10회)
⑧ Claude → 리포트 생성: `.harness/output/report/<domain>/<featureName>-report.md`
```

## 리포트 규칙

- 템플릿: `.harness/templates/report.md`
- 저장 위치: `.harness/output/report/<domain>/<featureName>-report.md`
- 생성 타이밍: `npm test` 전체 통과 직후 (⑥ 완료 시)
- 포함 내용:
  - 기능 요약 (feature_goal, domain, API)
  - 생성/수정된 파일 목록
  - 테스트 결과 (스위트 수, 통과/실패)
  - 자가 수복 이력 (재시도가 있었을 경우 원인·수정 내용)
  - 잔여 이슈

## 관련 규칙

- 테스트 파일 규칙 + 강도 규칙 → [test-file.md](./test-file.md)
