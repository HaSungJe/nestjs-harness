#!/bin/bash
# PostToolUse hook — Claude가 work 파일 Write 시 자동 검증
INPUT=$(cat)
FILE=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

if [[ "$FILE" == .harness/output/work/*/*-work.md ]]; then
  echo "[harness] work 파일 감지: $FILE"
  node .harness/validators/validate-work.js "$FILE"
fi
