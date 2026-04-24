#!/bin/bash
# PostToolUse hook — 테스트 자동 실행 및 자가 수복 루프
INPUT=$(cat)
FILE=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')
RETRY_FILE=".harness/.retry-count"
SPEC_FILE=".harness/.current-spec"
MAX_RETRY=10

# spec 파일 저장 시 → 최초 실행
# retry 진행 중 + 구현 파일 수정 시 → 재실행
IS_SPEC=false
IS_RETRY_IMPL=false
[[ "$FILE" == *.spec.ts ]] && IS_SPEC=true
[[ "$FILE" == src/api/v1/*.ts && "$FILE" != *.spec.ts && -f "$RETRY_FILE" ]] && IS_RETRY_IMPL=true

if [ "$IS_SPEC" = false ] && [ "$IS_RETRY_IMPL" = false ]; then
  exit 0
fi

# 최초 spec 저장 시 대상 파일 기록
if [ "$IS_SPEC" = true ]; then
  echo "$FILE" > "$SPEC_FILE"
fi

# retry 카운트 읽기
count=0
if [ -f "$RETRY_FILE" ]; then
  count=$(cat "$RETRY_FILE")
fi

if [ "$count" -ge "$MAX_RETRY" ]; then
  echo "[harness] STOP: 최대 재시도 횟수(${MAX_RETRY}회) 초과 — 사람에게 에스컬레이션이 필요합니다."
  rm -f "$RETRY_FILE" "$SPEC_FILE"
  exit 1
fi

# STEP 1: 해당 spec 파일만 실행 (빠른 피드백)
CURRENT_SPEC=$(cat "$SPEC_FILE" 2>/dev/null)
echo "[harness] 단위 테스트 실행 중... $CURRENT_SPEC (시도 $((count + 1))/${MAX_RETRY})"
UNIT_OUTPUT=$(npm test -- --testPathPatterns="$(basename $CURRENT_SPEC)" 2>&1)
UNIT_EXIT=$?

if [ $UNIT_EXIT -ne 0 ]; then
  count=$((count + 1))
  echo "$count" > "$RETRY_FILE"
  echo "[harness] ❌ 단위 테스트 실패 (${count}/${MAX_RETRY})"
  echo ""
  echo "$UNIT_OUTPUT"
  echo ""
  if [ "$count" -lt "$MAX_RETRY" ]; then
    echo "[harness] 위 에러를 분석하여 코드를 수정해주세요. (남은 시도: $((MAX_RETRY - count))회)"
  else
    echo "[harness] 마지막 시도입니다. 수정 후 저장하면 최종 테스트가 실행됩니다."
  fi
  exit 1
fi

echo "[harness] ✅ 단위 테스트 통과"

# STEP 2: 전체 테스트 실행 (회귀 확인)
echo "[harness] 전체 회귀 테스트 실행 중..."
FULL_OUTPUT=$(npm test 2>&1)
FULL_EXIT=$?

if [ $FULL_EXIT -ne 0 ]; then
  echo "[harness] ❌ 회귀 테스트 실패 — 기존 코드에 영향이 발생했습니다. 사람에게 에스컬레이션이 필요합니다."
  echo ""
  echo "$FULL_OUTPUT"
  rm -f "$RETRY_FILE" "$SPEC_FILE"
  exit 1
fi

echo "[harness] ✅ 전체 회귀 테스트 통과 — 구현 완료"
rm -f "$RETRY_FILE" "$SPEC_FILE"
exit 0
