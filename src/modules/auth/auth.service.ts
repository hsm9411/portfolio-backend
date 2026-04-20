import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
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
const REFRESH_PREFIX = 'auth:refresh:';
const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7일

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  generateTokens(user: User): { accessToken: string; refreshToken: string } {
    const rti = uuidv4();
    const accessToken = this.jwtService.sign({
      sub: user.id,
      email: user.email,
      jti: uuidv4(),
      rti,
    });
    return { accessToken, refreshToken: rti };
  }

  async saveRefreshToken(userId: string, rti: string): Promise<void> {
    await this.cacheManager.set(`${REFRESH_PREFIX}${rti}`, userId, REFRESH_TTL_MS);
  }

  async refreshTokens(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    const userId = await this.cacheManager.get<string>(`${REFRESH_PREFIX}${refreshToken}`);
    if (!userId) {
      throw new UnauthorizedException('유효하지 않거나 만료된 리프레시 토큰입니다.');
    }

    const user = await this.findById(userId);

    // rotation: 이전 토큰 삭제 후 새 토큰 발급
    await this.cacheManager.del(`${REFRESH_PREFIX}${refreshToken}`);
    const tokens = this.generateTokens(user);
    await this.saveRefreshToken(user.id, tokens.refreshToken);

    return tokens;
  }

  async logout(token: string, refreshToken?: string): Promise<void> {
    try {
      const decoded = this.jwtService.decode(token) as { jti?: string; exp?: number; rti?: string };
      if (decoded?.jti && decoded?.exp) {
        const ttl = (decoded.exp - Math.floor(Date.now() / 1000)) * 1000;
        if (ttl > 0) {
          await this.cacheManager.set(`${BLACKLIST_PREFIX}${decoded.jti}`, '1', ttl);
        }
      }

      // refresh token 무효화 (access token의 rti 또는 직접 전달된 값 사용)
      const rti = refreshToken ?? decoded?.rti;
      if (rti) {
        await this.cacheManager.del(`${REFRESH_PREFIX}${rti}`);
      }
    } catch { /* non-critical */ }
  }

  async isTokenBlacklisted(jti: string): Promise<boolean> {
    const val = await this.cacheManager.get(`${BLACKLIST_PREFIX}${jti}`);
    return val !== null && val !== undefined;
  }

  async findById(id: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }
    return user;
  }
}
