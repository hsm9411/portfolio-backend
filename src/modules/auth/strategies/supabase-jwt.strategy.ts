import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../../entities/user/user.entity';
import * as jwksRsa from 'jwks-rsa';

/**
 * Supabase JWT 검증 전략 (ES256/RS256 지원)
 *
 * Flow:
 * 1. Frontend → Supabase Auth (Google/GitHub OAuth)
 * 2. Supabase → JWT 발급 (ES256 서명)
 * 3. Frontend → Backend API (Bearer token)
 * 4. jwks-rsa가 공개키 fetch & 검증
 * 5. portfolio.users와 동기화
 * 6. req.user에 User 객체 주입
 */
@Injectable()
export class SupabaseJwtStrategy extends PassportStrategy(Strategy, 'supabase-jwt') {
  private readonly adminEmails: string[];

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {
    const supabaseUrl = configService.get<string>('SUPABASE_URL');
    
    if (!supabaseUrl) {
      throw new Error('SUPABASE_URL이 설정되지 않았습니다.');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      audience: 'authenticated', // Supabase 기본 audience
      issuer: `${supabaseUrl}/auth/v1`,
      algorithms: ['ES256'], // 비대칭키 알고리즘
      
      // ✅ 핵심: JWKS 엔드포인트에서 공개키 동적 로드
      secretOrKeyProvider: jwksRsa.passportJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri: `${supabaseUrl}/auth/v1/.well-known/jwks.json`,
      }),
    });

    // 관리자 이메일 목록 로드
    const adminEmailsStr = configService.get<string>('ADMIN_EMAILS') || '';
    this.adminEmails = adminEmailsStr
      .split(',')
      .map(email => email.trim())
      .filter(email => email.length > 0);

    console.log('✅ 관리자 이메일 목록:', this.adminEmails);
  }

  /**
   * JWT Payload 검증 후 사용자 객체 반환
   */
  async validate(payload: any): Promise<User> {
    const supabaseUserId = payload.sub;
    const email = payload.email;
    const provider = payload.app_metadata?.provider || 'email';
    const providerId = payload.user_metadata?.provider_id;
    const fullName = payload.user_metadata?.full_name || payload.email?.split('@')[0];
    const avatarUrl = payload.user_metadata?.avatar_url;

    if (!supabaseUserId) {
      throw new UnauthorizedException('유효하지 않은 토큰입니다.');
    }

    // 관리자 여부 확인
    const isAdmin = this.adminEmails.includes(email);

    // portfolio.users에서 supabase_user_id로 조회
    let user = await this.userRepository.findOne({
      where: { supabaseUserId },
    });

    // 첫 로그인 시 사용자 생성
    if (!user) {
      console.log(`✅ 신규 사용자 생성: ${email} (관리자: ${isAdmin})`);
      user = this.userRepository.create({
        supabaseUserId,
        email,
        nickname: fullName,
        avatarUrl,
        provider,
        providerId,
        isAdmin, // ✅ 관리자 권한 설정
      });

      await this.userRepository.save(user);
    } else {
      // 기존 사용자의 isAdmin 상태 업데이트 (환경 변수 변경 시)
      if (user.isAdmin !== isAdmin) {
        console.log(`🔄 관리자 권한 업데이트: ${email} (${user.isAdmin} → ${isAdmin})`);
        user.isAdmin = isAdmin;
        await this.userRepository.save(user);
      }
    }

    console.log(`🔍 사용자 검증 완료: ${email} (관리자: ${user.isAdmin})`);
    return user;
  }
}
