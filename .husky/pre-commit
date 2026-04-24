#!/usr/bin/env sh
# === harness-block-start ===
# 하네스 워크플로 ⑨ 단계 — src/spec 변경 시 전체 회귀 테스트.
# npm init 이 사용자 기존 .husky/pre-commit 에 이 블록을 append (중복 체크).
# 기존 훅이 없으면 이 블록만 담긴 pre-commit 을 새로 생성.
if git diff --cached --name-only | grep -qE '^src/.*\.ts$|\.spec\.ts$'; then
    npm test
else
    echo "[Test] src/ 및 spec 변경이 없어 테스트를 건너뜁니다."
fi
# === harness-block-end ===
