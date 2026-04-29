import { DataSource } from 'typeorm';
import { API_LOG_AHEAD_PARTITIONS, API_LOG_PARTITION_LOCK, API_LOG_RETENTION_MONTHS } from '../api-log.constants';
import { ApiLogPartitionService } from '../api-log.partition.service';

/**
 * DataSource 모킹 — query 호출 순서를 시퀀스로 검증.
 */
function buildDataSourceMock() {
    return {
        query: jest.fn(),
        getMetadata: jest.fn().mockReturnValue({tableName: 't_api_log'}),
    } as unknown as jest.Mocked<DataSource> & {query: jest.Mock; getMetadata: jest.Mock};
}

/**
 * onModuleInit 가 setTimeout 으로 다음 tick 을 잡는데, 테스트에서는 즉시 정리되도록 Jest fake timers 활용.
 */
describe('ApiLogPartitionService', () => {
    let dataSource: ReturnType<typeof buildDataSourceMock>;
    let service: ApiLogPartitionService;

    beforeEach(() => {
        jest.useFakeTimers();
        dataSource = buildDataSourceMock();
        service = new ApiLogPartitionService(dataSource as any);
    });

    afterEach(() => {
        jest.useRealTimers();
        jest.clearAllMocks();
    });

    /**
     * SELECT GET_LOCK 모킹: acquired 1
     * SELECT INFORMATION_SCHEMA: 빈 배열 (파티션 없음 → 초기 적용 케이스)
     * ALTER TABLE PARTITION BY RANGE: 성공
     * SELECT INFORMATION_SCHEMA: 방금 만든 파티션 반환 (drop 단계용)
     * (drop 대상 없음 → ALTER DROP PARTITION 호출 없음)
     * SELECT RELEASE_LOCK: 성공
     */
    it('[SUCCESS] runMaintenance — 파티션 미적용이면 초기 PARTITION BY RANGE 적용', async () => {
        const now = new Date(2026, 3, 15); // 2026-04-15
        jest.setSystemTime(now);

        // call sequence:
        // 1) GET_LOCK → acquired
        // 2) INFORMATION_SCHEMA → empty (no partitions)
        // 3) ALTER TABLE ... PARTITION BY RANGE
        // 4) INFORMATION_SCHEMA again (for dropExpired) → has p202604, p202605, p202606, p202607, pmax
        // 5) RELEASE_LOCK
        dataSource.query
            .mockResolvedValueOnce([{acquired: 1}])
            .mockResolvedValueOnce([])
            .mockResolvedValueOnce(undefined)
            .mockResolvedValueOnce([
                {PARTITION_NAME: 'p202604'},
                {PARTITION_NAME: 'p202605'},
                {PARTITION_NAME: 'p202606'},
                {PARTITION_NAME: 'p202607'},
                {PARTITION_NAME: 'pmax'},
            ])
            .mockResolvedValueOnce(undefined);

        await (service as any).runMaintenance();

        expect(dataSource.query).toHaveBeenCalledTimes(5);

        // 1) GET_LOCK 인자 검증
        expect(dataSource.query.mock.calls[0][0]).toContain('GET_LOCK');
        expect(dataSource.query.mock.calls[0][1]).toEqual([API_LOG_PARTITION_LOCK]);

        // 2) INFORMATION_SCHEMA 인자
        expect(dataSource.query.mock.calls[1][0]).toContain('INFORMATION_SCHEMA.PARTITIONS');
        expect(dataSource.query.mock.calls[1][1]).toEqual(['t_api_log']);

        // 3) ALTER PARTITION BY RANGE 검증
        const alterSql: string = dataSource.query.mock.calls[2][0];
        expect(alterSql).toContain('ALTER TABLE');
        expect(alterSql).toContain('PARTITION BY RANGE (TO_DAYS(create_at))');
        // 현재 달 + 향후 N 개월 = 총 N+1 개의 파티션 + pmax
        for (let i = 0; i <= API_LOG_AHEAD_PARTITIONS; i++) {
            const target = new Date(now.getFullYear(), now.getMonth() + i, 1);
            const name = `p${target.getFullYear()}${String(target.getMonth() + 1).padStart(2, '0')}`;
            expect(alterSql).toContain(name);
        }
        expect(alterSql).toContain('PARTITION pmax VALUES LESS THAN MAXVALUE');

        // 5) RELEASE_LOCK
        expect(dataSource.query.mock.calls[4][0]).toContain('RELEASE_LOCK');
        expect(dataSource.query.mock.calls[4][1]).toEqual([API_LOG_PARTITION_LOCK]);
    });

    it('[SUCCESS] runMaintenance — advisory lock 획득 실패 시 즉시 종료', async () => {
        dataSource.query.mockResolvedValueOnce([{acquired: 0}]);

        await (service as any).runMaintenance();

        // GET_LOCK 1회만 호출, 그 외 작업 없음, RELEASE_LOCK 도 없음
        expect(dataSource.query).toHaveBeenCalledTimes(1);
        expect(dataSource.query.mock.calls[0][0]).toContain('GET_LOCK');
    });

    it('[SUCCESS] ensureFuturePartitions — 누락된 향후 파티션만 REORGANIZE pmax INTO ... 로 추가', async () => {
        const now = new Date(2026, 3, 15);
        jest.setSystemTime(now);

        // 이미 p202604, p202605 있음. p202606, p202607 누락. pmax 존재.
        dataSource.query
            .mockResolvedValueOnce([{acquired: 1}])
            .mockResolvedValueOnce([
                {PARTITION_NAME: 'p202604'},
                {PARTITION_NAME: 'p202605'},
                {PARTITION_NAME: 'pmax'},
            ])
            .mockResolvedValueOnce(undefined) // REORGANIZE
            .mockResolvedValueOnce([
                {PARTITION_NAME: 'p202604'},
                {PARTITION_NAME: 'p202605'},
                {PARTITION_NAME: 'p202606'},
                {PARTITION_NAME: 'p202607'},
                {PARTITION_NAME: 'pmax'},
            ]) // dropExpired 의 두번째 조회
            .mockResolvedValueOnce(undefined); // RELEASE_LOCK

        await (service as any).runMaintenance();

        const reorganizeSql: string = dataSource.query.mock.calls[2][0];
        expect(reorganizeSql).toContain('REORGANIZE PARTITION pmax INTO');
        expect(reorganizeSql).toContain('p202606');
        expect(reorganizeSql).toContain('p202607');
        // 이미 있던 파티션은 추가하지 않음
        expect(reorganizeSql).not.toMatch(/PARTITION p202604 VALUES LESS THAN/);
        expect(reorganizeSql).not.toMatch(/PARTITION p202605 VALUES LESS THAN/);
        // pmax 도 다시 명시
        expect(reorganizeSql).toContain('PARTITION pmax VALUES LESS THAN MAXVALUE');
    });

    it('[SUCCESS] ensureFuturePartitions — 누락 없으면 ALTER 호출 없이 통과', async () => {
        const now = new Date(2026, 3, 15);
        jest.setSystemTime(now);

        const existing = [
            {PARTITION_NAME: 'p202604'},
            {PARTITION_NAME: 'p202605'},
            {PARTITION_NAME: 'p202606'},
            {PARTITION_NAME: 'p202607'},
            {PARTITION_NAME: 'pmax'},
        ];

        dataSource.query
            .mockResolvedValueOnce([{acquired: 1}])
            .mockResolvedValueOnce(existing)
            .mockResolvedValueOnce(existing) // dropExpired 의 두번째 조회
            .mockResolvedValueOnce(undefined); // RELEASE_LOCK

        await (service as any).runMaintenance();

        expect(dataSource.query).toHaveBeenCalledTimes(4);
        const allSql = dataSource.query.mock.calls.map((c) => c[0] as string).join('\n');
        expect(allSql).not.toContain('REORGANIZE');
        expect(allSql).not.toContain('PARTITION BY RANGE');
        expect(allSql).not.toMatch(/DROP PARTITION/);
    });

    it('[SUCCESS] ensureFuturePartitions — errno 1517 (duplicate) 발생 시 무시하고 계속', async () => {
        const now = new Date(2026, 3, 15);
        jest.setSystemTime(now);

        const dupErr: any = new Error('duplicate');
        dupErr.errno = 1517;

        dataSource.query
            .mockResolvedValueOnce([{acquired: 1}])
            .mockResolvedValueOnce([{PARTITION_NAME: 'p202604'}, {PARTITION_NAME: 'pmax'}])
            .mockRejectedValueOnce(dupErr) // REORGANIZE 실패 (다른 인스턴스가 동시 추가)
            .mockResolvedValueOnce([{PARTITION_NAME: 'p202604'}, {PARTITION_NAME: 'pmax'}])
            .mockResolvedValueOnce(undefined);

        await expect((service as any).runMaintenance()).resolves.toBeUndefined();
        expect(dataSource.query.mock.calls[4][0]).toContain('RELEASE_LOCK');
    });

    it('[FAIL:repository] ensureFuturePartitions — errno 1517 외 에러는 그대로 throw, 단 RELEASE_LOCK 은 호출됨', async () => {
        const now = new Date(2026, 3, 15);
        jest.setSystemTime(now);

        const otherErr: any = new Error('other');
        otherErr.errno = 1234;

        dataSource.query
            .mockResolvedValueOnce([{acquired: 1}])
            .mockResolvedValueOnce([{PARTITION_NAME: 'p202604'}, {PARTITION_NAME: 'pmax'}])
            .mockRejectedValueOnce(otherErr)
            .mockResolvedValueOnce(undefined); // RELEASE_LOCK in finally

        await expect((service as any).runMaintenance()).rejects.toThrow('other');

        // finally 절에서 RELEASE_LOCK 호출 확인
        const lastCall = dataSource.query.mock.calls[dataSource.query.mock.calls.length - 1];
        expect(lastCall[0]).toContain('RELEASE_LOCK');
    });

    it('[SUCCESS] dropExpiredPartitions — 보존기간 초과 파티션만 DROP', async () => {
        // 보존기간이 24개월이라고 가정 — 현재가 2026-04 이면 2024-04 미만의 파티션을 DROP
        const now = new Date(2026, 3, 15); // 2026-04-15
        jest.setSystemTime(now);

        // 초기 적용 케이스로 진입 (existing 비어있음) → ALTER PARTITION BY RANGE → 다시 SELECT
        dataSource.query
            .mockResolvedValueOnce([{acquired: 1}])
            .mockResolvedValueOnce([]) // 첫 SELECT — empty (initialPartitioning 진입)
            .mockResolvedValueOnce(undefined) // ALTER PARTITION BY RANGE
            .mockResolvedValueOnce([
                {PARTITION_NAME: 'p202301'}, // 2023-01 → cutoff(2024-04) 보다 이전 → DROP
                {PARTITION_NAME: 'p202312'}, // 2023-12 → 이전 → DROP
                {PARTITION_NAME: 'p202404'}, // 2024-04 → cutoff 와 같음 → 유지
                {PARTITION_NAME: 'p202506'}, // 2025-06 → 유지
                {PARTITION_NAME: 'pmax'},
            ])
            .mockResolvedValueOnce(undefined) // ALTER DROP PARTITION
            .mockResolvedValueOnce(undefined); // RELEASE_LOCK

        // 보존기간이 24개월 임을 검증값에 사용
        expect(API_LOG_RETENTION_MONTHS).toBe(24);

        await (service as any).runMaintenance();

        // DROP 호출 확인
        const dropCall = dataSource.query.mock.calls.find((c) => /DROP PARTITION/.test(c[0] as string));
        expect(dropCall).toBeDefined();
        expect(dropCall![0]).toContain('p202301');
        expect(dropCall![0]).toContain('p202312');
        expect(dropCall![0]).not.toContain('p202404');
        expect(dropCall![0]).not.toContain('p202506');
        expect(dropCall![0]).not.toContain('pmax');
    });

    it('[SUCCESS] dropExpiredPartitions — 만료 대상 없으면 DROP 호출 안 함', async () => {
        const now = new Date(2026, 3, 15);
        jest.setSystemTime(now);

        const futureOnly = [
            {PARTITION_NAME: 'p202604'},
            {PARTITION_NAME: 'p202605'},
            {PARTITION_NAME: 'p202606'},
            {PARTITION_NAME: 'p202607'},
            {PARTITION_NAME: 'pmax'},
        ];

        dataSource.query
            .mockResolvedValueOnce([{acquired: 1}])
            .mockResolvedValueOnce(futureOnly)
            .mockResolvedValueOnce(futureOnly)
            .mockResolvedValueOnce(undefined);

        await (service as any).runMaintenance();

        const allSql = dataSource.query.mock.calls.map((c) => c[0] as string).join('\n');
        expect(allSql).not.toMatch(/DROP PARTITION/);
    });

    it('[SUCCESS] onModuleInit — 초기 작업 수행 후 다음 매월 1일까지 setTimeout 예약', async () => {
        const now = new Date(2026, 3, 15);
        jest.setSystemTime(now);

        const futureOnly = [
            {PARTITION_NAME: 'p202604'},
            {PARTITION_NAME: 'p202605'},
            {PARTITION_NAME: 'p202606'},
            {PARTITION_NAME: 'p202607'},
            {PARTITION_NAME: 'pmax'},
        ];
        dataSource.query
            .mockResolvedValueOnce([{acquired: 1}])
            .mockResolvedValueOnce(futureOnly)
            .mockResolvedValueOnce(futureOnly)
            .mockResolvedValueOnce(undefined);

        const setTimeoutSpy = jest.spyOn(global, 'setTimeout');

        await service.onModuleInit();

        expect(setTimeoutSpy).toHaveBeenCalledTimes(1);
        const delay = setTimeoutSpy.mock.calls[0][1] as number;
        // 2026-04-15 → 2026-05-01 00:00 까지의 ms
        const expected = new Date(2026, 4, 1).getTime() - now.getTime();
        expect(delay).toBe(expected);

        // 자원 정리
        service.onModuleDestroy();
    });

    it('[SUCCESS] onModuleDestroy — 예약된 timer 정리, 이후 추가 실행 없음', async () => {
        const now = new Date(2026, 3, 15);
        jest.setSystemTime(now);

        const futureOnly = [
            {PARTITION_NAME: 'p202604'},
            {PARTITION_NAME: 'p202605'},
            {PARTITION_NAME: 'p202606'},
            {PARTITION_NAME: 'p202607'},
            {PARTITION_NAME: 'pmax'},
        ];

        dataSource.query
            .mockResolvedValueOnce([{acquired: 1}])
            .mockResolvedValueOnce(futureOnly) // ensureFuturePartitions: 누락 0개 → REORGANIZE 호출 안 함
            .mockResolvedValueOnce(futureOnly) // dropExpired 의 SELECT
            .mockResolvedValueOnce(undefined); // RELEASE_LOCK

        await service.onModuleInit();
        const callCountBefore = dataSource.query.mock.calls.length;

        service.onModuleDestroy();

        // setTimeout 으로 예약된 핸들러를 모두 실행해도 query 가 더 호출되지 않아야 함
        jest.runOnlyPendingTimers();
        expect(dataSource.query.mock.calls.length).toBe(callCountBefore);
    });
});
