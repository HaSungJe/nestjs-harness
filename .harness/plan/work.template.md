# Work Plan — {featureName}

## 기능 요약
- **기능**: {feature_goal}
- **API**: `{api_method} {api_path}`
- **도메인**: {domain}

---

## 파일 목록

| 파일 | 작업 |
|------|------|
| `src/api/v1/{domain}/dto/{file}.dto.ts` | 신규 생성 |
| `src/api/v1/{domain}/interfaces/{domain}.repository.interface.ts` | 메서드 추가 |
| `src/api/v1/{domain}/repositories/{domain}.repository.ts` | 메서드 추가 |
| `src/api/v1/{domain}/{domain}.service.ts` | 메서드 추가 |
| `src/api/v1/{domain}/{domain}.controller.ts` | 엔드포인트 추가 |
| `src/api/v1/{domain}/test/{featureName}.spec.ts` | 신규 생성 |

<!-- 변경 없는 파일도 명시: `xxx.module.ts` — 변경 없음 -->

---

## 1. DTO

```typescript
// 필요한 DTO 클래스 작성 (QueryDto / ParamDto / ItemDto / ResultDto)
```

---

## 2. Repository Interface

```typescript
// 추가할 메서드 시그니처
```

---

## 3. Repository 구현

```typescript
// 구현 코드 (try/catch 포함)
```

---

## 4. Service

```typescript
// 구현 코드 (@UseQueue / @Transactional 필요 시 포함)
```

---

## 5. Controller

```typescript
// 엔드포인트 + Swagger 데코레이터
```

---

## 6. 테스트 케이스

```
[SUCCESS]           정상 흐름
[FAIL:validation]   필수 필드 전체 누락
[FAIL:duplicate]    {테이블명} — {컬럼} 중복   ← affected_tables 기반, 해당 없으면 생략
[FAIL:service]      {service throw 분기마다}
[FAIL:repository]   {repository catch 블록마다}
```

---

## 7. Response 코드

| 상태코드 | 원인 |
|----------|------|
| 200 | 성공 |
<!-- 발생 가능한 에러 코드 전부 기재 -->
