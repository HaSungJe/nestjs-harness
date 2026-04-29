import { Module } from '@nestjs/common';
import { UserModule } from './api/v1/user/user.module';
import { QueueModule } from './modules/queue/queue.module';
import { ApiLogModule } from './modules/api-log/api-log.module';

@Module({
    imports: [
        QueueModule.register(),
        ApiLogModule,
        UserModule,
    ],
})
export class AppModule {}
