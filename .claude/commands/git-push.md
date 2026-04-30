---
description: 커밋된 변경분 원격으로 푸쉬 (자동 브랜치 모드면 base 머지 후 push)
argument-hint: (선택) 대상 브랜치 / 추가 지시
---

`.harness/docs/git-push/index.md` 의 절차를 그대로 따른다. `$ARGUMENTS` 가 비어있지 않으면 사용자가 추가로 전달한 컨텍스트(특정 브랜치 지정 등)로 해석.

이 슬래시 커맨드는 한국어 키워드 `작업내용 푸쉬해줘` 와 동등한 진입점이다.

⚠️ 푸쉬할 커밋이 없으면 진입하지 않고 중단. 매 호출마다 푸쉬 대상 커밋 + 브랜치를 사용자에게 확인받은 뒤에만 `git push` 실행. 자동 브랜치 모드면 `<feature> → <base>` ff-only 머지 후 base 푸쉬 + 로컬 feature 삭제.
