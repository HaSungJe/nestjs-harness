# nestjs-harness

NestJS 11 기반 백엔드 보일러플레이트.
**Harness Engineering** 방식으로 AI(Claude)와 협업하는 구조화된 개발 워크플로를 포함합니다.

---

## Stack

| 분류 | 기술 |
|------|------|
| Framework | NestJS 11 |
| ORM | TypeORM 0.3 (MySQL) |
| Auth | JWT + Passport |
| Queue | BullMQ + Redis |
| Docs | Swagger |
| Runtime | Node.js + TypeScript 5 |

---

## Harness Engineering

AI 코딩 어시스턴트(Claude)를 **구조적으로 제어**하기 위한 하네스 시스템을 포함합니다.

### 워크플로

```
① 사람이 request 작성  →  ② 훅 자동 검증  →  ③ Claude가 work 계획 작성
④ 사람 승인            →  ⑤ 구현 + 테스트 생성  →  ⑥ 자가 수정 루프 (최대 3회)
                                                    ⑦ 리포트 생성
```

### 핵심 파일

```
.harness/
├── harness-config.json               # 하네스 전체 규칙
├── plan/
│   ├── request.template.md            # 요청 작성 양식
│   ├── request/<domain>/             # 도메인별 요청 파일
│   └── work/<domain>/                # 도메인별 구현 계획
├── specs/
│   ├── request.schema.json           # Request 유효성 JSON Schema
│   └── validate-request.js           # 검증 스크립트
├── triggers/on-request-written.sh    # PostToolUse 훅 (jq 감지)
├── checklists/work-review.md         # 승인 체크리스트
└── reporters/work-summary.template.md
```

### 자동 트리거 (PostToolUse 훅)

`.claude/settings.json`에 등록된 훅이 `Write` 도구 실행 시 자동으로 동작합니다.

```
Claude가 .harness/plan/request/plan-N-request.md 저장
  → jq로 파일 경로 감지
  → validate-request.js 실행
  → 필수 항목 누락 시 STOP / 통과 시 work 작성 진행
```

### 테스트 자동 생성

구현 시 기능별 spec 파일을 함께 생성합니다.

```
src/api/v1/<domain>/test/<feature>.spec.ts

  [SUCCESS]          × 1  — 정상 흐름
  [FAIL:validation]  × 1  — 필수 필드 전체 누락
  [FAIL:duplicate]   × N  — INSERT 테이블마다
  [FAIL:service]     × N  — service throw마다
  [FAIL:repository]  × N  — repository catch마다
```

---

## 시작하기

### 1. 환경변수 설정

`.env` 파일을 프로젝트 루트에 생성합니다.

```env
# Server
NODE_ENV=development
SERVER_NAME=Nest11
SERVER=DEV
SERVER_PORT=3001

# Swagger
SWAGGER_URL=http://localhost:3001
SWAGGER_PATH=api-docs

# MySQL
TYPEORM_SYNC=T
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_DB=test_db
MYSQL_ID=root
MYSQL_PW=1234

# JWT
JWT_SECRET=your_jwt_secret

# Redis (BullMQ)
BULLMQ_REDIS_HOST=localhost
BULLMQ_REDIS_PORT=6379
```

### 2. Redis 실행 (Docker)

```bash
npm run redis:up
```

### 3. 패키지 설치 및 앱 실행

```bash
npm install
npm run dev
```

---

## 프로젝트 구조

```
src/
├── api/v1/<domain>/       # Feature 모듈 — controller/service/repository
├── shared/                # 공유 Entity/Repository (controller 없음)
├── common/                # DTO, 유틸리티 (no @Module)
├── modules/
│   ├── queue/             # BullMQ 인프라
│   ├── typeorm/
│   └── firebase-cloud-message/
├── guards/                # JWT Auth, Roles
└── main.ts
```

---

## BullMQ Write Queue

Write API(INSERT/UPDATE/DELETE)의 동시성 문제를 해결하기 위한 **`@UseQueue` 커스텀 데코레이터**를 포함합니다.

```typescript
// @UseQueue를 반드시 @Transactional() 위에 배치
@UseQueue('user-consumer', 'user-service-sign')
@Transactional()
async sign(dto: SignDto): Promise<void> {
    // 기존 로직 그대로
}
```

- 같은 `consumerKey` → Worker 1개, concurrency 1 → FIFO 직렬 처리
- 다른 `consumerKey` 간 병렬 처리
- Bull Board 대시보드: `http://localhost:${SERVER_PORT}/queues`

---

## API 문서

```
http://localhost:3001/api-docs
```

---

## 주요 npm 스크립트

```bash
npm run dev          # 개발 서버 (watch)
npm run build        # 빌드
npm run redis:up     # Redis 컨테이너 시작
npm run redis:down   # Redis 컨테이너 종료
```
