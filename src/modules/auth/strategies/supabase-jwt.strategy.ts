import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../../entities/user/user.entity';

/**
 * Supabase JWT 검증 전략
 *
 * Supabase Auth가 발급한 JWT를 검증하고,
 * portfolio.users 테이블과 동기화
 *
 * Flow:
 * 1. Frontend → Supabase Auth (Google/GitHub OAuth)
 * 2. Supabase → JWT 발급 (access_token)
 * 3. Frontend → Backend API 호출 (Bearer {access_token})
 * 4. 이 Strategy가 JWT 검증
 * 5. portfolio.users에서 사용자 조회/생성
 * 6. req.user에 User 객체 주입
 */
@Injectable()
export class SupabaseJwtStrategy extends PassportStrategy(Strategy, 'supabase-jwt') {
  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      // Supabase JWT Secret (Dashboard → Settings → API → JWT Secret)
      secretOrKey: configService.get<string>('SUPABASE_JWT_SECRET'),
    });
  }

  /**
   * JWT Payload 검증 후 사용자 객체 반환
   *
   * Supabase JWT Payload 예시:
   * {
   *   "sub": "user-uuid",
   *   "email": "user@example.com",
   *   "app_metadata": {
   *     "provider": "google",
   *     "providers": ["google"]
   *   },
   *   "user_metadata": {
   *     "avatar_url": "https://...",
   *     "full_name": "User Name",
   *     "provider_id": "google-oauth-id"
   *   },
   *   "role": "authenticated"
   * }
   */
  async validate(payload: any): Promise<User> {
    const supabaseUserId = payload.sub;
    const email = payload.email;
    const provider = payload.app_metadata?.provider || 'email';
    const providerId = payload.user_metadata?.provider_id;
    const fullName = payload.user_metadata?.full_name || payload.email?.split('@')[0];
    const avatarUrl = payload.user_metadata?.avatar_url;

    // portfolio.users에서 supabase_user_id로 사용자 조회
    let user = await this.userRepository.findOne({
      where: { supabaseUserId },
    });

    // 사용자가 없으면 새로 생성 (첫 로그인)
    if (!user) {
      user = this.userRepository.create({
        supabaseUserId,
        email,
        nickname: fullName,
        avatarUrl,
        provider,
        providerId,
      });

      await this.userRepository.save(user);
    }

    if (!user) {
      throw new UnauthorizedException('사용자를 찾을 수 없습니다.');
    }

    return user;
  }
}
