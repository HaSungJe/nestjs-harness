# 도메인 생성 명령

`<domain> 도메인생성` 명령을 받으면 아래 파일을 생성하고 `app.module.ts`에 등록한다.

## 생성 파일

**`src/api/v1/<domain>/<domain>.module.ts`**
```typescript
import { Module, SetMetadata } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TypeORMModule } from '@root/modules/typeorm/typeorm.module';
import { PassportJwtAuthModule } from '@root/guards/passport.jwt.auth/passport.jwt.auth.module';

@SetMetadata('type', 'API')
@SetMetadata('description', '<domain>')
@SetMetadata('path', '<domain>')
@Module({
    imports: [
        TypeORMModule,
        TypeOrmModule.forFeature([]),
        PassportJwtAuthModule,
    ],
    controllers: [],
    providers: [],
})
export class <Domain>Module {}
```

**`src/api/v1/<domain>/<domain>.symbols.ts`**
```typescript
// 기능 추가 시 Repository Symbol을 여기에 선언한다
```

**`src/api/v1/<domain>/entities/.gitkeep`** — 빈 파일 (사람이 Entity 직접 작성)

## app.module.ts 등록
```typescript
import { <Domain>Module } from './api/v1/<domain>/<domain>.module';
// imports 배열에 추가
```

> Entity는 사람이 직접 작성 — 도메인 생성 시 entities/ 폴더만 준비. 기능 개발 시 작성된 Entity를 module의 `TypeOrmModule.forFeature([])` 에 추가한다.
