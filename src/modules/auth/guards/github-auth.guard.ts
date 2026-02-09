import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * GitHub OAuth 인증 가드
 *
 * 사용법:
 * @Get('github')
 * @UseGuards(GithubAuthGuard)
 * async githubLogin() {}
 *
 * 동작:
 * 1. GithubStrategy를 실행
 * 2. GitHub 로그인 페이지로 리다이렉트
 */
@Injectable()
export class GithubAuthGuard extends AuthGuard('github') {}
