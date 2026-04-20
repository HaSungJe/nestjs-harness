#!/bin/bash
# PostToolUse hook — Claude가 work 파일 Write 시 자동 검증
INPUT=$(cat)
FILE=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

if [[ "$FILE" == .harness/plan/work/*/*-work.md ]]; then
  echo "[harness] work 파일 감지: $FILE"
  node .harness/specs/validate-work.js "$FILE"
fi
