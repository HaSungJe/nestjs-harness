# 커밋 명령

사용자가 "작업내용 커밋해줘" 혹은 유사한 커밋 지시를 하면 아래 절차를 따른다.

## 절차

1. 변경분 전부 스테이징 — `git add -A`
   - 단, `.claude/settings.local.json` 은 세션 로컬 파일이므로 반드시 `git restore --staged` 로 제외
2. staged 변경분 중 `.harness/output/request/<domain>/<feature>-request.md` 파일을 찾아 frontmatter `feature_goal` 값을 추출
3. 커밋 메시지 형식 (HEREDOC 사용):
   ```
   <오늘 날짜 YYYY.MM.DD>

   * <feature_goal 1>
   * <feature_goal 2>
   ```
   - 제목 줄: 오늘 날짜를 `YYYY.MM.DD` 형식으로 (예: `2026.04.22`)
   - 한 줄 공백 후 본문: 각 `feature_goal` 을 `* ` 로 시작하는 bullet 로 나열
4. staged 변경분에 request.md 가 없으면 사용자에게 제목을 직접 확인 후 진행 (임의 작성 금지)
5. `--no-verify` 금지. husky 훅 실패 시 원인 조사·수정 후 재커밋
