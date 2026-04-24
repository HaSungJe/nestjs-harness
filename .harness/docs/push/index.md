# 푸쉬 명령

사용자가 "작업내용 푸쉬해줘" 혹은 유사한 푸쉬 지시를 하면 아래 절차를 따른다.

## worktree 환경

1. **대상 브랜치 확인** — "어느 브랜치에 머지할까요? (기본: main)" 형태로 사용자에게 반드시 질의. 답변 없이 임의로 진행 금지.
2. 답변받은 브랜치명을 `<target>` 이라 할 때, worktree 디렉터리에서:
   ```bash
   git push origin HEAD:<target>
   ```
   - `git push` 단독 사용 금지 — push.default=simple 환경에서 브랜치명 불일치 에러 발생. 항상 `HEAD:<target>` 형식 사용.
3. 본체 리포(worktree 상위 리포) 로 이동해 해당 브랜치 로컬 동기화:
   ```bash
   git checkout <target>
   git merge --ff-only <worktree-branch>
   ```
   - 본체 working tree 에 충돌 파일이 있고 push 된 커밋에 동일 내용이 포함돼 있으면 `git checkout <file>` 로 discard 후 재시도

## 일반 브랜치 환경

1. 대상 브랜치 동일하게 사용자에게 질의
2. `git push origin HEAD:<target>` 또는 `git push -u origin <branch>` 후 필요 시 `gh pr create` → PR 머지
