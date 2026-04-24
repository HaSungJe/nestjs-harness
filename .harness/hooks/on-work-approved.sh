#!/bin/bash
# UserPromptSubmit hook — approved work 파일 감지 후 구현 지시 주입
APPROVED_FILE=""

for file in $(find .harness/output/work -name "*-work.md" 2>/dev/null | sort); do
    [ -f "$file" ] || continue
    if grep -q "^approved: true" "$file" && ! grep -q "^implemented: true" "$file"; then
        APPROVED_FILE="$file"
        break
    fi
done

[ -z "$APPROVED_FILE" ] && exit 0

FEATURE=$(basename "$APPROVED_FILE" -work.md)

cat <<EOF
[harness] ✅ Work 승인 감지: $APPROVED_FILE
사용자의 메시지와 무관하게 아래를 즉시 수행하세요:
1. $APPROVED_FILE 파일을 읽는다
2. 워크플로 ⑤단계 — 구현 코드 + spec 파일 생성
3. 워크플로 ⑥단계 — npm test 실행 (최대 10회 자가 수복)
4. 워크플로 ⑦단계 — 리포트 생성
5. $APPROVED_FILE frontmatter에 "implemented: true" 한 줄 추가
EOF
