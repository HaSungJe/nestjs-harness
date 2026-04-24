#!/bin/bash
# PostToolUse hook — Write 도구 실행 후 request 파일 감지 및 검증
INPUT=$(cat)
FILE=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

if [[ "$FILE" == .harness/output/request/*/*-request.md ]]; then
  echo "[harness] request 파일 감지: $FILE"
  node .harness/validators/validate-request.js "$FILE"
fi
