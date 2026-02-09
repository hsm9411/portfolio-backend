import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { OAuthUser } from '../interfaces/oauth-user.interface';

/**
 * Google OAuth 2.0 인증 전략
 *
 * Flow:
 * 1. 사용자가 /auth/google 접속
 * 2. Google 로그인 페이지로 리다이렉트
 * 3. 사용자 인증 후 /auth/google/callback으로 리다이렉트 (Authorization Code 포함)
 * 4. validate() 메서드 실행 → Access Token으로 프로필 정보 조회
 * 5. OAuthUser 객체 반환 → AuthService로 전달
 */
@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(private readonly configService: ConfigService) {
    super({
      clientID: configService.get<string>('GOOGLE_CLIENT_ID'),
      clientSecret: configService.get<string>('GOOGLE_CLIENT_SECRET'),
      callbackURL: configService.get<string>('GOOGLE_CALLBACK_URL'),
      scope: ['email', 'profile'], // 요청할 권한 범위
    });
  }

  /**
   * Google 인증 완료 후 호출되는 검증 메서드
   *
   * @param accessToken - Google API 호출용 Access Token
   * @param refreshToken - 토큰 갱신용 Refresh Token
   * @param profile - Google 프로필 정보
   * @param done - Passport 콜백 함수
   */
  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ): Promise<void> {
    const { id, emails, displayName, photos } = profile;

    // Google 프로필 정보를 OAuthUser 형식으로 변환
    const user: OAuthUser = {
      provider: 'google',
      providerId: id,
      email: emails[0].value,
      name: displayName,
      picture: photos?.[0]?.value,
      accessToken,
      refreshToken,
    };

    // AuthGuard가 이 사용자 객체를 req.user에 주입
    done(null, user);
  }
}
