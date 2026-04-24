import { CacheModuleOptions } from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';
import KeyvRedis from '@keyv/redis';
import Keyv from 'keyv';

export const getRedisConfig = (
  configService: ConfigService,
): CacheModuleOptions => {
  const host = configService.get<string>('REDIS_HOST');
  const port = configService.get<number>('REDIS_PORT');
  const ttlSeconds = configService.get<number>('REDIS_TTL') || 600;

  return {
    stores: [
      new Keyv({
        store: new KeyvRedis(`redis://${host}:${port}`),
        ttl: ttlSeconds * 1000,
      }),
    ],
  };
};
