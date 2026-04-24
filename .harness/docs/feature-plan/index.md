# 기능 생성 — 기획 단계 (request → work)

"xxx 기능 생성" 명령을 받으면 이 문서를 따른다.
워크플로의 **①~④ 단계**를 수행한다 (구두 설명 → request.md → work.md 작성까지).

## 단계

```
① 사람 → 기능을 구두로 설명
② Claude → .harness/output/request/<domain>/<featureName>-request.md 초안 작성 (.harness/templates/request.md 기반).
           코드 컨벤션만으로 판단이 애매한 항목은 request.md "확정 설계 결정사항" 섹션에 질문으로 나열 (답은 비워둠)
③ 사람 → request 파일 보완 + "확정 설계 결정사항" 답변 후 Claude에게 work 작성 지시
④ Claude → "확정 설계 결정사항" 답변 반영하여 .harness/output/work/<domain>/<featureName>-work.md 작성
           (.harness/templates/work.md 기반). 미답 항목이 있으면 작성 중단하고 사용자에게 재질의
```

## 파일 명명 규칙

- request 파일: `<featureName>-request.md` → `.harness/output/request/<domain>/`
- work 파일: `<featureName>-work.md` → `.harness/output/work/<domain>/`
- 구두 요청 시 work 파일만 생성 가능

## 관련 규칙

- 확정 설계 결정사항 (request.md 질문 작성 시) → [design-decisions.md](./design-decisions.md)
- work 파일 작성 규칙 → [work-file.md](./work-file.md)

## 이후 단계

work 파일 검토 완료 후 사용자가 "xxx 작업 시작" 으로 다음 단계 지시 → [../feature-implement/index.md](../feature-implement/index.md)
