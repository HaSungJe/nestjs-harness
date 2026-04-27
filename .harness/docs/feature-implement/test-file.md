# 테스트 파일 규칙

이 문서는 **하네스 공통의 테스트 방식·구조·강도 규칙**을 정의한다. assertion 에 사용할 구체 값(에러 키, 응답 래퍼 필드명, path param 형식 등)은 프로젝트 `CLAUDE.md` 의 해당 규칙을 그대로 assert 한다.

## 테스트 방식

모든 spec 은 **mock 기반 unit test 로만 작성**한다.

- 실제 DB / 외부 API / 외부 서비스 접근 금지
- repository · util · 외부 클라이언트는 모두 `jest.fn()` / `jest.mock(...)` 로 대체
- 데코레이터성 외부 라이브러리(예: `@Transactional` 계열)도 `jest.mock(...)` 로 처리 — 원본 descriptor 를 그대로 반환하도록 fake 하여 메서드가 그대로 실행되게 함
- ValidationPipe · Reflector 같은 NestJS 내장은 실제로 주입해 검증 (외부 I/O 가 아님 → unit test 범주)
- E2E / 통합 테스트가 필요한 프로젝트는 이 문서를 프로젝트 측에서 override

## 위치·구성

- 위치 기본값: `harness-config.json.harness_rules.test_spec_path` 패턴을 따름 (프로젝트에서 override 가능)
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

## 테스트 강도 규칙 (의미 있는 검증)

HTTP 상태코드만 확인하는 "값 만들어서 반환 확인" 수준의 테스트 금지. 각 케이스는 아래 기준을 **모두** 만족해야 한다.

### [SUCCESS] 강제 assertion (회귀 방지)
- 모든 repository / util mock 의 **호출 횟수**(`toHaveBeenCalledTimes`) 확인
- 모든 repository / util mock 의 **호출 인자**(`toHaveBeenCalledWith`) 확인
- write 메서드의 경우 entity 인자의 **의도한 컬럼만 set / 의도 외 컬럼은 `undefined`** 검증 (다른 컬럼 오염 방지)
- 이유: 단순 상태코드만 보면 "다른 사용자 레코드 업데이트" "평문 저장" "wrong argument order" 같은 치명적 버그가 통과

### [FAIL:validation] / [FAIL:service] short-circuit 검증
- **실패 지점까지** 호출된 mock 의 **호출 횟수**(`toHaveBeenCalledTimes`) + **호출 인자**(`toHaveBeenCalledWith`) 확인
- 실패 분기 이후 단계의 mock 은 **`.not.toHaveBeenCalled()`** 로 호출되지 않았음을 모두 확인
- 응답 본문의 `message` 가 service 에서 던진 메시지와 정확히 일치하는지 확인
- validation 에러의 경우 에러 구조(필드명·키 이름 등)가 프로젝트 CLAUDE.md 규칙과 일치하는지 확인
- 목표: 테스트만 봐도 "어느 단계까지 실행되다 왜 멈췄는지" 추적 가능해야 함

### [FAIL:repository] 격리 검증
- **실패 지점까지** 호출된 mock 의 **호출 횟수**(`toHaveBeenCalledTimes`) + **호출 인자**(`toHaveBeenCalledWith`) 확인
  - write 메서드는 [SUCCESS] 와 동일하게 인자로 전달된 entity 의 컬럼 값까지 검증
- 실패 지점 **이후** 단계의 mock 은 **`.not.toHaveBeenCalled()`** 로 호출되지 않았음을 모두 확인
- 응답 `message` 가 repository 에서 던진 메시지와 정확히 일치하는지 확인
- 목표: 테스트만 봐도 "어느 repository 호출에서 실패했고, 그 전까지 어떤 데이터가 흘렀는지" 추적 가능해야 함

### 금지 사항
- repository/util mock 에 아무 assertion 없이 상태코드만 검사하는 케이스
- `expect.anything()` 남용 (구체적 값을 알 수 있으면 구체 값으로 검증)
