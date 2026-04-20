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

## 시작하기

### 1. 환경변수 설정

`.env.example`을 복사해 `.env`를 생성합니다.

```bash
cp .env.example .env
```

```env
# 실행환경
NODE_ENV=development

# Server
SERVER_NAME=nestjs-harness
SERVER=DEV
SERVER_PORT=3000

# Swagger
SWAGGER_URL=http://localhost:3000
SWAGGER_TARGET_SELECT=F
SWAGGER_TARGET=
SWAGGER_PATH=swagger

# MySQL
TYPEORM_SYNC=T
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_DB=test_database
MYSQL_ID=test
MYSQL_PW=1234

# JWT
JWT_SECRET=your_jwt_secret

# BullMQ Redis
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
├── api/v1/
│   ├── <domain>/              # Feature 모듈
│   │   ├── admin/             # 관리자 서브도메인 (있는 경우)
│   │   │   ├── dto/
│   │   │   ├── interfaces/
│   │   │   ├── repositories/
│   │   │   ├── test/
│   │   │   ├── admin.<domain>.controller.ts
│   │   │   └── admin.<domain>.service.ts
│   │   ├── user/              # 일반 사용자 서브도메인 (있는 경우)
│   │   ├── entities/          # TypeORM Entity
│   │   ├── <domain>.module.ts
│   │   └── <domain>.symbols.ts
├── shared/                    # 공유 Entity/Repository (controller 없음)
├── common/                    # DTO, 유틸리티 (no @Module)
│   ├── dto/
│   └── utils/
├── config/                    # 환경변수 설정
├── exception/                 # 전역 예외 필터
├── guards/                    # JWT Auth, Roles
│   ├── passport.jwt.auth/
│   └── roles/
└── modules/                   # 인프라 @Module
    ├── queue/                 # BullMQ
    ├── typeorm/               # TypeORM
    └── firebase-cloud-message/
```

---

## Repository 패턴

단순 CRUD는 범용 메서드로 통일하고, WHERE 조건은 서비스에서 구성해 전달합니다.

```typescript
// Interface
update(where: FindOptionsWhere<UserEntity>, entity: UserEntity): Promise<void>;

// Service — 조건을 서비스에서 구성
const entity = new UserEntity();
entity.login_pw = await getBcrypt(dto.new_login_pw);
await this.repository.update({ user_id: dto.user_id }, entity);
```

- 복잡한 조인·집계·페이지네이션은 기능별 메서드(QueryBuilder) 허용
- `update()` 시 `new XxxEntity()`로 객체 생성 → `@BeforeUpdate` 훅 자동 트리거 (`update_at` 자동 갱신)

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
- Bull Board 대시보드: `http://localhost:{SERVER_PORT}/queues`

---

## API 문서 (Swagger)

```
http://localhost:3000/swagger
```

---

## 주요 npm 스크립트

```bash
npm run dev          # 개발 서버 (watch)
npm run build        # 빌드
npm run start:prod   # 프로덕션 실행
npm run lint         # ESLint 자동 수정
npm run format       # Prettier 포맷
npm test             # 테스트 전체 실행
npm run test:watch   # 테스트 watch 모드
npm run test:cov     # 커버리지 리포트
npm run redis:up     # Redis 컨테이너 시작
npm run redis:down   # Redis 컨테이너 종료
```

---

## 도메인 생성

Claude에게 아래 명령으로 도메인 스캐폴딩을 요청합니다.

```
reserve 도메인생성
```

생성되는 파일:
```
src/api/v1/reserve/
├── entities/          # 사람이 직접 Entity 작성
├── reserve.module.ts  # 기본 NestJS 모듈 (빈 상태)
└── reserve.symbols.ts # Repository Symbol 선언 공간
```

- `app.module.ts` 자동 등록
- Entity는 사람이 직접 설계 및 작성
- 이후 기능 개발은 Harness Engineering 워크플로로 진행

---

## Harness Engineering

AI 코딩 어시스턴트(Claude)를 **구조적으로 제어**하기 위한 하네스 시스템을 포함합니다.

### 단계별 워크플로

| 단계 | 담당 | 작업 |
|------|------|------|
| ① | **사람** | 기능을 구두로 설명 |
| ② | Claude | `request.md` 초안 작성 (`request.template.md` 기반) |
| ③ | **사람** | request 파일 보완 후 Claude에게 work 작성 지시 |
| ④ | Claude | `work.md` 작성 + `work-review.md` 체크리스트 자가 검토 |
| ⑤ | **사람** | work 파일 검토 후 Claude에게 구현 지시 |
| ⑥ | Claude | 구현 코드 + `spec.ts` 동시 생성 |
| ⑦ | Claude | `npm test` 실행 → 실패 시 에러 분석 후 수정 (최대 10회) |
| ⑧ | Claude | 리포트 생성 (`.harness/reports/<domain>/<feature>-report.md`) |

### 사람이 해야 하는 일

1. **기능 설명** — Claude에게 구두로 요청
2. **request 파일 보완** — Claude가 작성한 초안에 세부 요구사항 추가 후 work 작성 지시
3. **work 파일 검토** — Claude가 작성한 구현 계획 확인 후 구현 지시

> Claude가 자동으로 처리하는 것: request 초안 / work 계획 / 체크리스트 검토 / 구현 / 테스트 / 수정 루프 / 리포트

### 핵심 파일

```
.harness/
├── harness-config.json               # 하네스 전체 규칙
├── plan/
│   ├── request.template.md            # 요청 작성 양식
│   ├── work.template.md               # 구현 계획 양식
│   ├── request/<domain>/             # 도메인별 요청 파일
│   └── work/<domain>/                # 도메인별 구현 계획
├── specs/
│   ├── request.schema.json           # Request 유효성 JSON Schema
│   └── validate-request.js           # 검증 스크립트
├── checklists/work-review.md         # work 자가 검토 체크리스트
├── reporters/work-summary.template.md
└── reports/<domain>/                 # 완료 리포트 (자동 생성)
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
