import { Module, SetMetadata } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TypeORMModule } from '@root/modules/typeorm/typeorm.module';
import { PassportJwtAuthModule } from '@root/guards/passport.jwt.auth/passport.jwt.auth.module';
import { DeptModule } from '@root/api/v1/dept/dept.module';
import { AuthEntity } from './entities/auth.entity';
import { PositionEntity } from './entities/position.entity';
import { StateEntity } from './entities/state.entity';
import { UserEntity } from './entities/user.entity';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { UserRepository } from './repositories/user.repository';
import { USER_REPOSITORY } from './user.symbols';
import { SessionEntity } from './entities/session.entity';
import { SessionRefreshEntity } from './entities/session-refresh.entity';

@SetMetadata('type', 'API')
@SetMetadata('description', '회원')
@SetMetadata('path', 'user')
@Module({
    imports: [
        TypeORMModule,
        TypeOrmModule.forFeature([
            AuthEntity,
            PositionEntity,
            StateEntity,
            UserEntity,
            SessionEntity,
            SessionRefreshEntity,
        ]),
        PassportJwtAuthModule,
        DeptModule,
    ],
    controllers: [UserController],
    providers: [
        UserService,
        {provide: USER_REPOSITORY, useClass: UserRepository},
    ],
})
export class UserModule {}
