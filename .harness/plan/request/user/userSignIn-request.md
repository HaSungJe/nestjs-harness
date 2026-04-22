---
feature_goal: "사용자 로그인"
domain: "user"
api_method: "POST"
api_path: "/api/v1/user/sign-in"
affected_tables: ["t_session", "t_session_refresh"]
---

## 기능 설명
login_id + login_pw 로 로그인하여 JWT access/refresh 토큰을 발급받는 API.
로그인 시 세션 레코드(`t_session`)와 최초 refresh 토큰 레코드(`t_session_refresh`)를 함께 생성한다.

## API Spec
- Method: POST
- Path: /api/v1/user/sign-in
- 인증: 불필요 (공개 엔드포인트)
- Request Body:
    - login_id: string (필수)
    - login_pw: string (필수)
- Response: 200
    - access_token: string — JWT (payload: `{type: 'access', user_id, session_id}`)
    - access_expires_at: string (ISO 8601) — 만료 시각 (+20m). 프론트 쿠키 `expires` 지정용
    - refresh_token: string — JWT (payload: `{type: 'refresh', user_id, session_id}`)
    - refresh_expires_at: string (ISO 8601) — 만료 시각 (+1d). 프론트 쿠키 `expires` 지정용

## 비즈니스 규칙

### 인증 검증
- `t_user` 에서 `login_id` 로 사용자 조회 → 없으면 "아이디 또는 비밀번호가 올바르지 않습니다." (구체적 사유 숨김)
- `matchBcrypt(input, stored)` 로 비밀번호 검증 → 불일치 시 동일 메시지
- `t_state` 조회하여 `is_login_able = 1` 확인 → 아니면 "로그인이 제한된 계정입니다."

### 세션·토큰 생성
- `session_id = uuidv4().replace(/-/g, '')` (dashes 제거, 32자)
- `t_session` INSERT — `{session_id, user_id, is_delete: 0, login_at: NOW(), logout_at: null}` (is_delete=0 은 default 적용)
- access_token 서명 — payload `{type: 'access', user_id, session_id}`, 만료 20m
- refresh_token 서명 — payload `{type: 'refresh', user_id, session_id}`, 만료 1d
- `t_session_refresh` INSERT — `{session_id, refresh_hash: SHA256(refresh_token), refresh_encrypted: AES_GCM(refresh_token), before_refresh_hash: null, end_at: NOW()+1d}`
- 응답으로 평문 `access_token`, `refresh_token` 반환

### 보안 설계
- refresh_token 은 **절대 평문으로 DB에 저장하지 않음**
  - `refresh_hash` — 조회용 SHA-256 해시
  - `refresh_encrypted` — 복원용 AES-256-GCM 암호문 (grace window·체인 재사용 플로우에서만 복호화)
- 암호화 키: `process.env.TOKEN_CIPHER_KEY` (32 bytes hex)
- `t_session.is_delete` 가 1 로 변경되면 이 세션의 access·refresh 토큰은 모두 무효로 간주 (JWT strategy 측 검증 강화 필요 — 별도 범위)

### 큐·트랜잭션
- **큐 미적용** — 개인 단위 기능 (CLAUDE.md 규칙)
- `@Transactional()` 적용 — t_session / t_session_refresh 두 INSERT 를 원자적 처리

## 선결 작업 (엔티티 정비 — 별도 커밋 권장)

본 feature 구현 전에 아래 엔티티 정비가 필요함:

1. 파일/클래스 rename
   - `login.entity.ts` → `session.entity.ts`, `LoginEntity` → `SessionEntity`
   - `login-refresh.entity.ts` → `session-refresh.entity.ts`, `LoginRefreshEntity` → `SessionRefreshEntity`
2. 컬럼·제약조건
   - `t_session`: PK `session_id`, FK `FK_Session_User`, `is_delete` (0=정상, 1=삭제, default 0), `login_at`, `logout_at` — **현 엔티티 그대로 유지** (logout 시 `logout_at` 자동 설정은 logout feature 에서 별도 처리)
   - `t_session_refresh`: PK `session_refresh_id`, FK `FK_SessionRefresh_Session`, `refresh_hash varchar(64) UNIQUE`, `refresh_encrypted varchar(1024)`, `before_refresh_hash varchar(64) NULL`, `end_at`, `create_at`
3. 공통 유틸 신설
   - `src/common/utils/cipher.ts` — `encryptAesGcm / decryptAesGcm`
   - `src/common/utils/hash.ts` — `sha256Hex`
4. 환경변수
   - `.env`, `.env.test` 에 `TOKEN_CIPHER_KEY` 추가 (32 bytes hex — 예: `openssl rand -hex 32`)

## 참고사항
- bcrypt util: `src/common/utils/bcrypt.ts` — `matchBcrypt`
- JWT 전략: `src/guards/passport.jwt.auth/passport.jwt.auth.strategy.ts`
  - 현재 access 검증만 있음 — `session_id` 기반 `is_login=1` 체크 추가는 **본 feature 범위 밖** (별도 개선 티켓)
- JwtService: `@nestjs/jwt` 의 `JwtService` 주입 (PassPortJwtAuthModule 이 이미 `JwtModule.register` 수행)
- Refresh API (`POST /api/v1/user/refresh`) 는 **별도 feature** — 체인 플로우·grace window·B요청 멱등 처리는 그쪽에서 다룸
