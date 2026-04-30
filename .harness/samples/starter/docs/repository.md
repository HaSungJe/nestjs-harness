# Repository & Pagination Rules

## 기본 원칙

- 모든 repository 메서드는 `try/catch` + `throw error` 필수
- `find`/`findOne`/`findAndCount` 시 `loadRelationIds: true` 필수 (`@ManyToOne` FK 컬럼 undefined 방지)
- WHERE/ORDER BY 조건은 메서드 내부 인라인 작성 — `applyFilters()` 같은 private 헬퍼 분리 금지
- `@Query()` 값은 모두 string — 타입 변환·기본값 처리는 DTO constructor에서, 컨트롤러는 `new XxxDto(query)` 생성 후 전달
- **Pagination 메서드는 단일 함수 패턴** — 한 `getXxxList(dto)` 안에서 같은 QueryBuilder 인스턴스를 단계적으로 재사용해 `total_count` / `count` / `pagination` / `list` 모두 처리. 별도 `getXxxCount` 메서드 만들지 않음
- Pagination 은 검색 개수(`count`) 로 생성. 전체 개수(`total_count`) 로 생성 금지 — 단, 응답 본문의 `total_count` 필드에는 검색 조건 적용 전의 전체 개수가 들어감
- Path param: `@Param('key')` 방식 금지. DTO 클래스(`XxxParamDto`)로 수신, snake_case로 전 레이어 통일

## Repository 메서드 템플릿

```ts
async findById(visit_round_id: string): Promise<VisitRoundEntity | null> {
    try {
        return this.repository.findOne({where: {visit_round_id, is_delete: 0}, loadRelationIds: true});
    } catch (error) {
        throw error;
    }
}
```

## Pagination 단일 메서드 패턴

`getXxxList(dto)` 하나가 `total_count` / `count` / `pagination` / `list` 모두 처리. 같은 `QueryBuilder` 인스턴스를 단계적으로 재사용한다.

### Repository 메서드 — 단계 흐름

```ts
async getVisitRoundList(dto: VisitRoundListDto): Promise<{
    total_count: number;
    pagination: Pagination;
    list: VisitRoundItemDto[];
}> {
    try {
        const builder = this.repository.createQueryBuilder('t');

        // ① 기본 join + 기본 where (삭제 여부 등) — total_count 측정의 기준이 되는 베이스
        builder
            .leftJoin('t.hospital', 'h')
            .where('t.is_delete = 0');

        // ② total_count: 검색 조건 없이 전체 수
        const total_count: number = await builder.getCount();

        // ③ dto 기반 검색 조건 추가
        if (127 !== dto.weekday) {
            builder.andWhere('(1 << t.weekday) & :weekday > 0', {weekday: dto.weekday});
        }
        if ('ALL' !== dto.is_holiday_open) {
            builder.andWhere('t.is_holiday_open = :is_holiday_open', {is_holiday_open: dto.is_holiday_open});
        }

        // ④ count: 검색 조건 적용 후 개수
        const count: number = await builder.getCount();

        // ⑤ Pagination 생성 (count 기반)
        const pagination = new Pagination({
            total_count: count,
            page: dto.page,
            size: dto.size,
            page_size: dto.page_size,
            all_search_yn: dto.all_search_yn,
        });

        // ⑥ select / orderBy / limit / offset
        builder
            .select([
                't.visit_round_id',
                't.weekday',
                't.is_holiday_open',
                't.start_at',
                't.end_at',
            ])
            .orderBy('t.weekday', dto.sort_weekday)
            .limit(pagination.limit)
            .offset(pagination.offset);

        // ⑦ 목록 조회
        const list = await builder.getMany();

        return { total_count, pagination, list };
    } catch (error) {
        throw error;
    }
}
```

### 단계 흐름 요약

| 단계 | 동작 | 비고 |
|------|------|------|
| ① | 기본 join + 기본 where (`is_delete = 0` 등) | total_count 측정 기준 베이스 |
| ② | `total_count = builder.getCount()` | 응답 `total_count` 필드 |
| ③ | dto 기반 추가 `andWhere` | 검색 조건 |
| ④ | `count = builder.getCount()` | Pagination 생성에 사용 |
| ⑤ | `Pagination` 생성 | `count` 기반, `limit/offset` 산출 |
| ⑥ | `select / orderBy / limit / offset` | — |
| ⑦ | `list = builder.getMany()` | 페이지 데이터 |

> **주의** — `getCount()` 는 builder 의 `select / orderBy / limit / offset` 을 무시하고 별도 `count(*)` query 를 실행. 따라서 ②와 ④ 호출 시점이 builder 의 select 설정 *이전* 이어도 결과는 변하지 않음. 대신 ④ 측정 시점은 ③의 `andWhere` 가 모두 추가된 *직후* 여야 정확.

### Query DTO 생성자 예제

```ts
export class VisitRoundListDto extends PaginationDto {
    weekday?: number;
    is_holiday_open?: string;   // 'ALL' | '0' | '1'
    sort_weekday?: 'ASC' | 'DESC';

    constructor(data: any = {}) {
        super();
        this.weekday = !isNaN(parseInt(data['weekday'])) ? parseInt(data['weekday']) : 127;
        this.is_holiday_open = ['ALL', '0', '1'].includes(data['is_holiday_open']) ? data['is_holiday_open'] : 'ALL';
        this.sort_weekday = data['sort_weekday'] === 'DESC' ? 'DESC' : 'ASC';
    }
}

// Controller
async getVisitRoundList(@Query() query: VisitRoundListDto): Promise<VisitRoundListResultDto> {
    const dto = new VisitRoundListDto(query);
    return this.service.getVisitRoundList(dto);
}
```

### Service 호출 — 1줄

Repository 가 이미 `{total_count, pagination, list}` 를 묶어서 반환하므로 service 는 변환만:

```ts
async getVisitRoundList(dto: VisitRoundListDto): Promise<VisitRoundListResultDto> {
    const { total_count, pagination, list } = await this.repository.getVisitRoundList(dto);
    return { list, total_count, pagination: pagination.getPagination() };
}
```

### Path Parameter DTO 예제

- 파일명: `<entity>-param.dto.ts` / 클래스명: `<Entity>ParamDto`

```ts
export class VisitRoundParamDto {
    @ApiProperty({description: '면회 회차 ID', required: true, example: 'abc123'})
    @IsString({message: '면회 회차 ID는 문자열이어야합니다.'})
    @IsNotEmpty({message: '면회 회차 ID를 입력해주세요.'})
    visit_round_id: string;
}

// controller
@Delete('/visit-round/:visit_round_id')
async deleteVisitRound(@Param() param: VisitRoundParamDto): Promise<void> {
    await this.service.deleteVisitRound(param.visit_round_id);
}
```
