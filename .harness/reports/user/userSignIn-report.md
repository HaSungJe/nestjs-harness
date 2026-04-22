# 구현 완료 리포트 — userSignIn

## 요약
- **기능**: 사용자 로그인 — access_token + refresh_token 발급 (세션/체인 회전 구조 기반). `device_os`+`device_token` 전달 시 모바일 로그인으로 인식하여 `t_user`를 업데이트하고, `t_session`에는 IP / device_os / device_token을 함께 저장
- **도메인**: user
- **API**: `POST /api/v1/user/sign-in`
- **완료일**: 2026-04-22

## 생성 / 수정된 파일
| 파일 | 변경 유형 | 설명 |
|------|-----------|------|
| `src/common/utils/hash.ts` | 생성 | SHA-256 해시 유틸 (`sha256Hex`) — refresh_hash 조회용 인덱스 생성 |
| `src/common/utils/cipher.ts` | 생성 | AES-256-GCM 암호화 유틸 — `TOKEN_CIPHER_KEY` 기반 refresh token 복원 |
| `src/common/utils/jwt.ts` | 생성 | JWT `exp` claim 추출 유틸 (`extractJwtExpiresAt`) |
| `src/api/v1/user/dto/user-sign-in.dto.ts` | 생성 | `UserSignInDto` (요청: login_id / login_pw + optional device_os / device_token) / `UserSignInResultDto` (응답: access/refresh + 만료일시) |
| `src/api/v1/user/entities/session-refresh.entity.ts` | 수정 | refresh_hash / refresh_encrypted / before_refresh_hash / end_at 컬럼 추가, `UK_SessionRefresh_RefreshHash` |
| `src/api/v1/user/interfaces/user.repository.interface.ts` | 수정 | `update` (범용) / `findOneState` / `insertSession` / `insertSessionRefresh` 추가 |
| `src/api/v1/user/repositories/user.repository.ts` | 수정 | State/Session/SessionRefresh Repository 주입, 신규 메서드 구현 (1062 제약 별 처리) + 범용 `update` |
| `src/api/v1/user/user.service.ts` | 수정 | `signIn(dto, ip)` 추가 — `@UseQueue('user-consumer','user-service-sign-in')` + `@Transactional()`. device_os+device_token 모두 있을 때만 모바일 로그인 → `userRepository.update`로 t_user device 필드 갱신, session에 ip/device_* 주입. `adminCreate`의 `randomUUID` → `uuidv4` 정리 |
| `src/api/v1/user/user.controller.ts` | 수정 | `POST /sign-in` 엔드포인트 추가 — `@Ip()` 데코레이터로 요청 IP 주입 (없으면 null 전달), `HttpCode(200)`, 가드 없음 |
| `src/api/v1/user/test/userSignIn.spec.ts` | 생성 | 14개 테스트 케이스 (SUCCESS×3 / validation×1 / duplicate×2 / service×3 / repository×5) — 모바일 로그인·ip 캡처·device 부분 누락·update 실패 케이스 포함 |
| `src/api/v1/user/test/adminUserCreate.spec.ts` | 수정 | `JwtService` mock provider 추가 (UserService 생성자 변경에 대한 회귀 대응) |
| `package.json` | 수정 | `uuid@9` + `@types/uuid@9` 명시적 선언 (phantom dep → 정식 의존성) |

## 테스트 결과
- **스위트**: 9개 / **전체**: 59개 / **통과**: 59개 / **실패**: 0개
- userSignIn 단독: 스위트 1 / 테스트 14 / 통과 14

## 자가 수복 이력
| 시도 | 실패 원인 | 수정 내용 |
|------|-----------|-----------|
| 1회 | `uuid@14`가 ESM-only라 Jest(ts-jest)가 파싱 실패 — `SyntaxError: Unexpected token 'export'` | `uuid@9` / `@types/uuid@9`로 다운그레이드하여 CJS 호환 확보 |
| 2회 | `adminUserCreate.spec.ts`에서 `JwtService` 미제공으로 DI 실패 (UserService 생성자에 JwtService 추가 영향) | `adminUserCreate.spec.ts`의 providers에 `{provide: JwtService, useValue: mockJwtService}` 추가 |

## 잔여 이슈
- 없음
