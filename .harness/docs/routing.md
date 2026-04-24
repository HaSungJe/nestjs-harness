# Harness 인덱스

CLAUDE.md 의 명령어 라우팅이 이 파일을 가리키면, 아래 표에서 요청에 해당하는 항목을 찾아 링크된 문서를 읽고 그 규칙대로 실행한다. **해당 항목을 찾지 못하면 하네스 외의 요청으로 판단해 일반 채팅/작업으로 처리**한다.

## 기능

| 트리거 | 상세 문서 |
| --- | --- |
| 도메인 생성 (예: `user 도메인 생성`) | [domain-create/index.md](./domain-create/index.md) |
| 기능 생성 (예: `xxx 기능 생성`) | [feature-plan/index.md](./feature-plan/index.md) |
| 작업 시작 (예: `xxx 작업 시작`) | [feature-implement/index.md](./feature-implement/index.md) |

## 배포

| 트리거 | 상세 문서 |
| --- | --- |
| 커밋 (예: `작업내용 커밋해줘`) | [commit/index.md](./commit/index.md) |
| 푸쉬 (예: `작업내용 푸쉬해줘`) | [push/index.md](./push/index.md) |
