# Work 파일 규칙

- 템플릿: `.harness/templates/work.md` 기반으로 작성
- 모든 섹션 필수 포함: 기능 요약 / 파일 목록 / DTO / Repository Interface / Repository 구현 / Service / Controller / 테스트 케이스 / Response 코드
- 코드 블록은 실제 구현 가능한 수준으로 작성 (대략적 스케치 금지)
- frontmatter 없음 — approved/implemented 상태 관리 불필요
- **work 파일 저장 즉시** PostToolUse 훅이 `validate-work.js`를 자동 실행하여 독립 검증. 실패 시 즉시 수정 후 재저장
- **work 파일 작성 완료 직후**, [work-review.md](./work-review.md) 의 모든 항목을 대조하여 결과를 대화에 출력 (✅/❌ 형식). 미충족 항목은 즉시 work 파일 수정 후 재출력
