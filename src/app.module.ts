import { Module } from '@nestjs/common';
import { DeptModule } from './api/v1/dept/dept.module';
import { UserModule } from './api/v1/user/user.module';
import { QueueModule } from './modules/queue/queue.module';

@Module({
    imports: [
        QueueModule.register(),
        DeptModule,
        UserModule,
    ],
})
export class AppModule {}
