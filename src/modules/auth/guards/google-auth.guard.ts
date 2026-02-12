import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Google OAuth 인증 가드
 *
 * 사용법:
 * @Get('google')
 * @UseGuards(GoogleAuthGuard)
 * async googleLogin() {}
 *
 * 동작:
 * 1. GoogleStrategy를 실행
 * 2. Google 로그인 페이지로 리다이렉트
 */
@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {}
