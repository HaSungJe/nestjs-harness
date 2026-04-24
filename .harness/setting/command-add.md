# 명령 추가 · 제거 · 이름 변경 절차

명령어 라우팅 패턴 전체 설명은 [command-routing.md](./command-routing.md) 참조.

---

## 새 명령 추가

### ① `.harness/docs/<command>/index.md` 생성

명령 1개당 **폴더 1개, index.md 1개**. 하위 규칙이 없는 명령도 동일 구조 유지 (일관성).

```
.harness/docs/<command>/
├── index.md           # 메인 실행 규칙 (필수)
└── <sub-rule>.md      # (선택) 단계별 세부 규칙
```

index.md 권장 섹션:

````markdown
# <명령 이름> — 한 줄 설명

"xxx <키워드>" 명령을 받으면 이 문서를 따른다.

## 단계
1. ...
2. ...

## 관련 규칙 (하위 규칙이 있을 때만)
- <역할> → [sub-rule.md](./sub-rule.md)

## 이후 단계 (다음 명령으로 이어질 때만)
→ [../<next-command>/index.md](../<next-command>/index.md)
````

### ② `.harness/harness.md` 인덱스에 1행 추가

````markdown
| 키워드N (예: `xxx 키워드N`) | [docs/<commandN>/index.md](./docs/<commandN>/index.md) |
````

적절 카테고리가 없으면 섹션 신설.

### ③ CLAUDE.md / AGENTS.md 라우팅 블록에 키워드 1줄 추가

````markdown
- `키워드N` (예: `xxx 키워드N`) — 설명
````

### ④ 검증 체크리스트

- [ ] 키워드가 기존 명령과 겹치지 않는가
- [ ] 이전·이후 단계가 있는 명령이면 양방향 링크(`이후 단계` / `전제`) 걸었는가
- [ ] `.harness/harness.md` 트리거 문구가 CLAUDE.md 키워드와 일치하는가 (Claude 가 찾을 수 있어야 함)

### 키워드 작성 요령

- 전체 키워드는 3~7개 내외 유지 — 너무 많으면 일반 요청까지 오인
- 한국어 동사/명사 중심이 잘 동작 (예: `커밋`, `푸쉬`, `도메인 생성`)
- 기존 명령과 키워드 중복 금지

---

## 명령 제거 / 이름 변경

- [ ] `.harness/docs/<command>/` 폴더 삭제 또는 rename
- [ ] `.harness/harness.md` 해당 행 삭제 / 수정
- [ ] CLAUDE.md / AGENTS.md 해당 키워드 bullet 삭제 / 수정
- [ ] 다른 `index.md` 에서 `../<old>/index.md` 링크 검색·갱신
