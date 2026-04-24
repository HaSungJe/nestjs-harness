# 테스트 파일 규칙

## 위치·구성

- 위치: 해당 기능의 controller와 같은 레벨의 `test/` 폴더
  - 예: `src/api/v1/user/test/<feature>.spec.ts`
- 구성:
  - `[SUCCESS]` × 1 — 정상 흐름
  - `[FAIL:validation]` × 3~5 — **대표 분기 샘플링**. 모든 필드·모든 규칙 1:1 매핑 금지. 아래 카테고리 중 DTO 에 존재하는 것만 골라 각 카테고리당 1개씩:
    - 필수(`@IsNotEmpty`): "전체 필드 누락" 1개로 모든 필수 규칙을 한 번에 트리거 (필드별 N개 금지)
    - 길이 경계(`@MinLength`/`@MaxLength`): 대표 필드 1개씩 경계값 테스트 (각 경계 1개)
    - 타입(`@IsString`/`@IsNumber` 등): 대표 필드 1개 타입 위반
    - 포맷(`@Matches`/`@IsEmail` 등): 대표 필드 1개 패턴 위반
    - 범위(`@Min`/`@Max`): 대표 필드 1개 범위 위반
  - `[FAIL:duplicate]` × N — INSERT 대상 테이블마다
  - `[FAIL:service]` × N — service throw 분기마다
  - `[FAIL:repository]` × N — repository catch 블록마다

## 필수 boilerplate

모든 spec 파일 상단에 반드시 포함:

```typescript
jest.mock('typeorm-transactional', () => ({
    initializeTransactionalContext: jest.fn(),
    Transactional: () => (_target: any, _key: string, descriptor: PropertyDescriptor) => descriptor,
}));
```

## 테스트 강도 규칙 (의미 있는 검증)

HTTP 상태코드만 확인하는 "값 만들어서 반환 확인" 수준의 테스트 금지. 각 케이스는 아래 기준을 **모두** 만족해야 한다.

### [SUCCESS] 강제 assertion (회귀 방지)
- 모든 repository / util mock 의 **호출 횟수**(`toHaveBeenCalledTimes`) 확인
- 모든 repository / util mock 의 **호출 인자**(`toHaveBeenCalledWith`) 확인 — where 조건, bcrypt 입력 순서, 해시 대상 비번 등
- write 메서드의 경우 entity 인자의 **의도한 컬럼만 set / 의도 외 컬럼은 `undefined`** 검증 (다른 컬럼 오염 방지)
- 이유: 단순 상태코드만 보면 "다른 사용자 레코드 업데이트" "평문 저장" "wrong bcrypt argument order" 같은 치명적 버그가 통과

### [FAIL:validation] / [FAIL:service] short-circuit 검증
- 에러 분기 발생 시 **그 이후 단계의 repository/util mock 은 호출되지 않았음**을 `.not.toHaveBeenCalled()` 로 확인
- 응답 본문의 `validationErrors[0].property` 가 예상 필드와 일치하는지 확인

### [FAIL:repository] 격리 검증
- 실패 지점 이후의 mock 이 호출되지 않았음을 확인
- 응답 `message` 가 repository 에서 던진 메시지와 일치하는지 확인

### 금지 사항
- repository/util mock 에 아무 assertion 없이 상태코드만 검사하는 케이스
- `expect.anything()` 남용 (구체적 값을 알 수 있으면 구체 값으로 검증)
