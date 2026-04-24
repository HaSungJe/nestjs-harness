import { Module } from '@nestjs/common';
import { UserModule } from './api/v1/user/user.module';
import { QueueModule } from './modules/queue/queue.module';

@Module({
    imports: [
        QueueModule.register(),
        UserModule,
    ],
})
export class AppModule {}
