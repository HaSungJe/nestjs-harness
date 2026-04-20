# Work Plan 승인 체크리스트

work 파일을 검토한 후 아래 항목을 확인하고 구현을 승인하세요.

## 아키텍처
- [ ] 도메인 경로가 `src/api/v1/<domain>/` 구조를 따르는가
- [ ] module / controller / service / repository / symbols 파일이 모두 포함되어 있는가
- [ ] `app.module.ts` 등록 계획이 포함되어 있는가

## Entity / DB
- [ ] PK, UK, FK constraint 명시가 있는가
- [ ] `@Unique()` 데코레이터 사용 (column unique 금지)
- [ ] `@ManyToOne` + `@JoinColumn({foreignKeyConstraintName})` 포함

## API
- [ ] Route가 `/api/v1/<domain>/...` 형식인가
- [ ] Path param이 snake_case이며 `@Param() dto` 방식인가
- [ ] Swagger 데코레이터 계획이 포함되어 있는가

## 테스트
- [ ] `src/api/v1/<domain>/test/<feature>.spec.ts` 생성 계획이 있는가
- [ ] [SUCCESS] × 1, [FAIL:validation] × 1, [FAIL:duplicate] × N, [FAIL:service] × N, [FAIL:repository] × N 포함

## 기타
- [ ] 에러 메시지 key가 `validationErrors`인가
- [ ] Repository에 `try/catch` + `loadRelationIds: true` 계획이 있는가
