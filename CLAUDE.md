# CLAUDE.md

## 메모리 시스템

메모리는 사용자 로컬이 아닌 **프로젝트 내 `.harness/memory/`** 에 저장한다 (팀 공유 가능).
- 인덱스: `.harness/memory/MEMORY.md`
- 메모리 파일: `.harness/memory/<name>.md`
- 시스템 기본 경로(`~/.claude/projects/.../memory/`)는 사용하지 않는다.

### 저장 대상

이 프로젝트만의 특정 규칙이 필요할 때 `.harness/memory/`에 정리한다.
- 코드나 파일을 보면 알 수 있는 내용은 저장하지 않는다.
- 도메인별 구현 현황, 기능 단위 작업 사항은 저장하지 않는다.

---

## ⚠️ 주의사항

`npm run` 명령은 반드시 사용자가 직접 실행 (Claude 실행 금지)
단, `npm test`는 예외 — 구현 완료 후 Claude가 Bash 도구로 직접 실행

---

## 도메인 생성 명령

→ [docs/domain-create.md](docs/domain-create.md)

---

## Harness Engineering

이 프로젝트는 **Harness Engineering** 방식으로 운영됩니다.
Claude는 harness-config.json의 규칙과 아래 워크플로를 반드시 따릅니다.

### 워크플로
```
① 사람 → 기능을 구두로 설명
② Claude → .harness/plan/request/<domain>/<featureName>-request.md 초안 작성 (request.template.md 기반)
③ 사람 → request 파일 보완 후 Claude에게 work 작성 지시
④ Claude → .harness/plan/work/<domain>/<featureName>-work.md 작성 (work.template.md 기반)
⑤ 사람 → work 파일 검토 후 Claude에게 직접 구현 지시
⑥ Claude → 구현 코드 + src/api/v1/<domain>/test/<feature>.spec.ts 동시 생성
⑦ Claude → Bash로 해당 기능 spec만 실행 (`npm test -- --testPathPatterns=<featureName>`) → 실패 시 에러 분석 후 수정 (최대 10회)
⑧ Claude → 리포트 생성: `.harness/reports/<domain>/<featureName>-report.md`
⑨ 사람 → git commit 시 Husky가 전체 `npm test` 자동 실행 → 회귀 보장
```

### 리포트 규칙
- 템플릿: `.harness/reporters/work-summary.template.md`
- 저장 위치: `.harness/reports/<domain>/<featureName>-report.md`
- 생성 타이밍: `npm test` 전체 통과 직후 (⑥ 완료 시)
- 포함 내용:
  - 기능 요약 (feature_goal, domain, API)
  - 생성/수정된 파일 목록
  - 테스트 결과 (스위트 수, 통과/실패)
  - 자가 수복 이력 (재시도가 있었을 경우 원인·수정 내용)
  - 잔여 이슈

### 파일 명명 규칙
- request 파일: `<featureName>-request.md` → `.harness/plan/request/<domain>/`
- work 파일: `<featureName>-work.md` → `.harness/plan/work/<domain>/`
- 구두 요청 시 work 파일만 생성 가능

### Work 파일 규칙
- 템플릿: `.harness/plan/work.template.md` 기반으로 작성
- 모든 섹션 필수 포함: 기능 요약 / 파일 목록 / DTO / Repository Interface / Repository 구현 / Service / Controller / 테스트 케이스 / Response 코드
- 코드 블록은 실제 구현 가능한 수준으로 작성 (대략적 스케치 금지)
- frontmatter 없음 — approved/implemented 상태 관리 불필요
- **work 파일 저장 즉시** PostToolUse 훅이 `validate-work.js`를 자동 실행하여 독립 검증. 실패 시 즉시 수정 후 재저장
- **work 파일 작성 완료 직후**, `.harness/checklists/work-review.md`의 모든 항목을 대조하여 결과를 대화에 출력 (✅/❌ 형식). 미충족 항목은 즉시 work 파일 수정 후 재출력

### 테스트 파일 규칙
- 위치: 해당 기능의 controller와 같은 레벨의 `test/` 폴더
  - 예: `src/api/v1/user/admin/test/<feature>.spec.ts`
  - 예: `src/api/v1/user/user/test/<feature>.spec.ts`
- 구성:
  - `[SUCCESS]` × 1 — 정상 흐름
  - `[FAIL:validation]` × 1 — 필수 필드 전체 누락
  - `[FAIL:duplicate]` × N — INSERT 대상 테이블마다
  - `[FAIL:service]` × N — service throw 분기마다
  - `[FAIL:repository]` × N — repository catch 블록마다
- **필수 boilerplate** — 모든 spec 파일 상단에 반드시 포함:
  ```typescript
  jest.mock('typeorm-transactional', () => ({
      initializeTransactionalContext: jest.fn(),
      Transactional: () => (_target: any, _key: string, descriptor: PropertyDescriptor) => descriptor,
  }));
  ```

---

## Architecture

NestJS 11 + TypeORM (MySQL) + JWT Passport + Swagger

```
src/
├── api/v1/<domain>/   # Feature modules — controller 있음
├── shared/            # 공유 Entity/Repository — controller 없음
├── common/            # DTO/utils only (no @Module)
├── modules/           # 인프라 @Module (TypeORM, Redis 등)
├── guards/            # Auth guards, strategies
└── main.ts
```

→ 상세: [docs/architecture.md](docs/architecture.md)

## Naming Conventions

- Entity: `*Entity` suffix. Constraint: `Entity` 제거한 짧은 이름
- DTO: `*.dto.ts` / Utils: 전역 `src/common/utils/`, 도메인 `<domain>.util.ts`
- **DTO 파일 합치기**: 같은 기능(query + result 등)의 DTO는 하나의 파일에 작성 (예: `get-blood-glucose.dto.ts`)
- **VO 사용 금지** — 쿼리 결과 타입은 `ItemDto`로 통일
- **DTO suffix 규칙**: `QueryDto`(목록 조회) / `ParamDto`(path param) / `ItemDto`(개별 항목) / `ResultDto`(응답 최상위)
- API route: `/api/v1/<domain>/...`
- Path param: snake_case (`visit_round_id`), 전 레이어 통일
- **`@Param()` DTO 필수** — `@Param('key')` 방식 금지
- **컨트롤러 메서드 파라미터 한 줄** — 멀티라인 금지
- **validation error key**: 항상 `validationErrors`

## Repository 핵심 규칙

- **범용 메서드 우선** — 단순 CRUD는 `find / findOne / update / insert / delete / count` 형태로 통일. 범용으로 처리 가능한 경우 기능별 전용 메서드 생성 지양
- **WHERE 조건은 서비스에서 구성** — 레포지토리는 전달받은 조건을 실행만 함. 조건 로직을 레포지토리 내부에 두지 않는다
- **where 파라미터 타입**: 반드시 `FindOptionsWhere<XxxEntity>` 사용 (`Partial<XxxEntity>` 금지)
- 복잡한 조인 · 집계 · 페이지네이션은 기능별 메서드 허용 (QueryBuilder 사용 시)
- 모든 메서드 `try/catch` + `throw error` 필수
- `findOne` / `find` 시 `loadRelationIds: true` 필수 (FK 컬럼 undefined 방지)

→ 상세: [docs/repository.md](docs/repository.md)

## Pagination

- Query 파라미터: 컨트롤러에서 `new XxxDto(query)` 생성 후 전달
- 서비스 4단계: `totalCount(null)` → `count(dto)` → `Pagination(count)` → list
- Pagination 객체명은 항상 `pagination`
- Pagination 생성 시 `all_search_yn` 반드시 포함:
  ```typescript
  const pagination = new Pagination({totalCount: count, page: dto.page, size: dto.size, pageSize: dto.pageSize, all_search_yn: dto.all_search_yn});
  ```

## Query DTO 생성자 규칙

- 생성자가 있는 Query DTO는 반드시 `constructor(data: any = {})` 형태로 선언
- `data: any` 로만 선언 시 `class-transformer`(`plainToInstance`)가 인수 없이 호출하여 런타임 에러 발생
- **`PaginationDto` extends 시** `super()` 외에 반드시 아래 4개 할당 추가 (미포함 시 `page` 등 `undefined` 발생):
  ```typescript
  this.all_search_yn = ['Y', 'N'].includes(data['all_search_yn']) ? data['all_search_yn'] : 'N';
  this.page = !isNaN(parseInt(data['page'])) ? parseInt(data['page']) : 1;
  this.size = !isNaN(parseInt(data['size'])) ? parseInt(data['size']) : 20;
  this.pageSize = !isNaN(parseInt(data['pageSize'])) ? parseInt(data['pageSize']) : 10;
  ```

→ 상세: [docs/repository.md](docs/repository.md)

## Entity Rules

- Unique: `@Unique()` 데코레이터 (`@Column({unique: true})` 금지)
- FK: `@ManyToOne` + `@JoinColumn({foreignKeyConstraintName})` 필수
- Timestamp: `@BeforeInsert`/`@BeforeUpdate` (`@CreateDateColumn` 금지)
- 컬럼 옵션 한 줄, `@Entity({name, comment})` 필수

→ 상세: [docs/entity.md](docs/entity.md)

## Error Handling

- **Repository**: 모든 메서드 반드시 try/catch. 실패 시 `throw new InternalServerErrorException({message: '~~에 실패했습니다. 관리자에게 문의해주세요.'})`
- **Repository insert/update**: errno 1062 추가 처리 — `throw new BadRequestException({message: '중복된 {xx}가 존재합니다.'})`. else 절은 `InternalServerErrorException`
- errno 1062 확인: `error.errno === 1062 && error.sqlMessage.indexOf('constraint명') !== -1`
- 범용 `update` 메서드 사용 시 errno 1062는 service에서 catch하여 처리 (repository가 제약 식별 불가)
- `createValidationError` — **service에서만** 사용. repository 금지
- Service throw: `const message = '...'; throw new HttpException({message, validationErrors: createValidationError(...)}, ...)`

→ 상세: [docs/error-handling.md](docs/error-handling.md)

## Swagger & JSDoc

- 모든 controller/service/repository 메서드에 JSDoc 필수
- 컨트롤러 메서드에 Swagger 데코레이터 필수
- 순서: `@ApiOperation` → `@ApiBody` → `@ApiOkResponse` → `@ApiBadRequestResponse` → ... → `@ApiInternalServerErrorResponse`

→ 상세: [docs/swagger-dto.md](docs/swagger-dto.md)

## Key Patterns

- Module: `@SetMetadata('type','API')` + `app.module.ts` 등록
- Repository DI: Symbol token (`<domain>.symbols.ts`) + `@Inject(TOKEN)`
- Transaction: `@Transactional()` from `typeorm-transactional`
- Scheduler: `<domain>.scheduler.ts`, plain provider (Symbol 불필요), `ScheduleModule.forRoot()` 중복 등록 금지
- Auth: `PassportJwtAuthGuard` (JWT) + `AuthGuard` + `@Roles('ADMIN')` (권한)
- **로그인 회원 정보**: 반드시 `@PassportUser() user: PassportUserResultDto` 사용 (`@Req()` 금지)
  - import: `@root/guards/passport.jwt.auth/passport.jwt.auth.decorator`
  - DTO: `@root/guards/passport.jwt.auth/passport.jwt.auth.dto`
  - 특정 필드만 필요 시: `@PassportUser('user_id') userId: string`
- Import alias: `@root/` (maps to `src/`)

## BullMQ (Write FIFO Queue)

### 인프라
- Redis: `docker-compose.yml` → `npm run redis:up` / `npm run redis:down`
- `.env`: `BULLMQ_REDIS_HOST`, `BULLMQ_REDIS_PORT` 필수
- 패키지: `@nestjs/bullmq`, `bullmq`, `@bull-board/api`, `@bull-board/nestjs`, `@bull-board/express`
- `QueueModule` (`@Global`) → `app.module.ts` 최상단 import
- Bull Board 대시보드: `/queues`

### 핵심 파일
```
src/modules/queue/
├── queue.module.ts              # BullModule.forRoot() 전역 등록
├── write-queue.registry.ts      # consumerKey별 Queue/Worker/handlers 관리
├── queue-processing.context.ts  # AsyncLocalStorage — Worker 실행 컨텍스트 감지
└── use-queue.decorator.ts       # @UseQueue() 데코레이터
```

### `@UseQueue(consumerKey, jobKey)` 사용 규칙

- **적용 대상**: 여러 사용자 간 순서 보장이 필요한 INSERT/UPDATE/DELETE 메서드 — 개인 단위 기능(로그인, 탈퇴 등)은 적용 불필요
- **데코레이터 순서**: `@UseQueue` 반드시 `@Transactional()` **위**에 배치
  ```typescript
  @UseQueue('user-consumer', 'user-service-sign')  // ← 위 (바깥 래퍼)
  @Transactional()                                  // ← 아래 (안쪽)
  async sign(dto: SignDto) { ... }
  ```
- **컨슈머 단위**: 같은 `consumerKey`는 Worker 1개 + concurrency:1 → FIFO 직렬 처리
- **동작 투명성**: 컨트롤러·서비스 호출 코드 변경 없음. 응답은 동기 유지(`waitUntilFinished`)

### consumerKey 명명 예시
| 도메인 | consumerKey | jobKey 예시 |
|--------|-------------|-------------|
| 회원 | `user-consumer` | `user-service-sign`, `user-service-patch-nickname` |
| 게시판 | `board-consumer` | `board-insert`, `board-update`, `board-delete` |

### 서버 시작 시 큐 사전 생성
- `@UseQueue` 데코레이터 적용 시점(클래스 로드)에 consumerKey가 정적으로 수집됨
- `WriteQueueRegistry.onModuleInit()`에서 수집된 모든 consumerKey의 Queue/Worker를 미리 생성
- 서버 시작 직후 bull-board(`/queues`)에서 이전 이력 즉시 확인 가능

### 신규 도메인 적용
1. Service write 메서드에 `@UseQueue('xxx-consumer', 'xxx-job')` 추가만
2. `app.module.ts`, `QueueModule` 추가 수정 불필요 (`@Global`로 자동 적용)

## Repository update 패턴

- `repository.update(where, entity)` 호출 시 `new XxxEntity()`로 객체 생성 후 필드 할당하여 전달
- 이 방식은 `@BeforeUpdate` 훅을 트리거하므로 `update_at` 수동 주입 불필요
- 잘못된 예: `repository.update({id}, {field1, field2})` — 리터럴 객체는 `@BeforeUpdate` 미트리거
- 올바른 예:
  ```typescript
  const entity = new XxxEntity();
  entity.field1 = value1;
  entity.field2 = value2;
  await repository.update({id}, entity);
  ```

→ 상세: [docs/architecture.md](docs/architecture.md)

## Checklist

- [ ] `validationErrors` key 일관 사용 (pipe + 수동 throw)
- [ ] Entity: PK/UK/IDX/FK constraint 명시, `@Unique()` 데코레이터 사용
- [ ] FK: `@ManyToOne` + `@JoinColumn({foreignKeyConstraintName})`
- [ ] Path param: `@Param() param: XxxParamDto`, snake_case 전 레이어 통일
- [ ] Repository: try/catch, `loadRelationIds: true`, 인라인 조건
- [ ] Query: `new XxxDto(query)` 인스턴스 생성, `pagination` 객체명 통일, 생성자는 `constructor(data: any = {})` 형태
- [ ] Controller 파라미터 한 줄, JSDoc + Swagger 데코레이터 완비
