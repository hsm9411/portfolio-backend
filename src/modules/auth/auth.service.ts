import {
  Injectable,
  NotFoundException,
  Inject,
} from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { v4 as uuidv4 } from 'uuid';
import { User } from '../../entities/user/user.entity';

const BLACKLIST_PREFIX = 'auth:blacklist:';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  async logout(token: string): Promise<void> {
    try {
      const decoded = this.jwtService.decode(token) as { jti?: string; exp?: number };
      if (!decoded?.jti || !decoded?.exp) return;

      const ttl = (decoded.exp - Math.floor(Date.now() / 1000)) * 1000;
      if (ttl > 0) {
        await this.cacheManager.set(`${BLACKLIST_PREFIX}${decoded.jti}`, '1', ttl);
      }
    } catch { /* non-critical */ }
  }

  async isTokenBlacklisted(jti: string): Promise<boolean> {
    const val = await this.cacheManager.get(`${BLACKLIST_PREFIX}${jti}`);
    return val !== null && val !== undefined;
  }

  generateToken(user: User): string {
    const payload = {
      sub: user.id,
      email: user.email,
      jti: uuidv4(),
    };

    return this.jwtService.sign(payload);
  }

  async findById(id: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }

    return user;
  }
}
