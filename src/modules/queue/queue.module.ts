import { DynamicModule, Global, Module } from '@nestjs/common';
import { createConnection } from 'net';

function checkRedis(host: string, port: number): Promise<boolean> {
    return new Promise((resolve) => {
        const socket = createConnection({ host, port });
        socket.setTimeout(1000);
        socket.once('connect', () => { socket.destroy(); resolve(true); });
        socket.once('error', () => { socket.destroy(); resolve(false); });
        socket.once('timeout', () => { socket.destroy(); resolve(false); });
    });
}

@Global()
@Module({})
export class QueueModule {
    static async register(): Promise<DynamicModule> {
        const host = process.env.BULLMQ_REDIS_HOST || 'localhost';
        const port = parseInt(process.env.BULLMQ_REDIS_PORT) || 6379;
        const available = await checkRedis(host, port);

        if (!available) {
            console.warn('[QueueModule] Redis unavailable — BullMQ disabled, APIs run without FIFO queue');
            return { global: true, module: QueueModule, providers: [], exports: [] };
        }

        const { BullModule } = require('@nestjs/bullmq');
        const { BullBoardModule } = require('@bull-board/nestjs');
        const { ExpressAdapter } = require('@bull-board/express');
        const { WriteQueueRegistry } = require('./write-queue.registry');

        return {
            global: true,
            module: QueueModule,
            imports: [
                BullModule.forRoot({ connection: { host, port } }),
                BullBoardModule.forRoot({ route: '/queues', adapter: ExpressAdapter }),
            ],
            providers: [WriteQueueRegistry],
            exports: [WriteQueueRegistry],
        };
    }
}
