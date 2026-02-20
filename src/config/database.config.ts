import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';

export const getDatabaseConfig = (
  configService: ConfigService,
): TypeOrmModuleOptions => ({
  type: 'postgres',
  url: configService.get<string>('DATABASE_URL'),
  schema: 'portfolio',  // ✅ 명시적으로 schema 지정
  entities: [__dirname + '/../entities/**/*.entity{.ts,.js}'],
  synchronize: false, // ❗ Production에서는 false
  logging: configService.get('NODE_ENV') === 'development',
  ssl:
    configService.get('NODE_ENV') === 'production'
      ? { rejectUnauthorized: false }
      : false,
});
