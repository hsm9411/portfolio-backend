import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Req,
  Res,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto, AuthResponseDto } from './dto';
import { JwtAuthGuard } from './guards';
import { User } from '../../entities/user/user.entity';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * 회원가입 (Local)
   */
  @Post('register')
  @ApiOperation({ summary: '회원가입' })
  @ApiResponse({
    status: 201,
    description: '회원가입 성공',
    type: AuthResponseDto,
  })
  @ApiResponse({ status: 409, description: '이미 사용 중인 이메일' })
  async register(@Body() registerDto: RegisterDto): Promise<AuthResponseDto> {
    return this.authService.register(registerDto);
  }

  /**
   * 로그인 (Local)
   */
  @Post('login')
  @ApiOperation({ summary: '로그인' })
  @ApiResponse({
    status: 200,
    description: '로그인 성공',
    type: AuthResponseDto,
  })
  @ApiResponse({ status: 401, description: '인증 실패' })
  async login(@Body() loginDto: LoginDto): Promise<AuthResponseDto> {
    return this.authService.login(loginDto);
  }

  /**
   * 현재 사용자 정보 조회
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '현재 사용자 정보 조회' })
  @ApiResponse({ status: 200, description: '조회 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  async getProfile(@Req() req: Request & { user: User }) {
    return req.user;
  }

  /**
   * Google OAuth 로그인 시작
   */
  @Get('google')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Google OAuth 로그인 시작' })
  async googleLogin() {
    // Guard가 Google OAuth 페이지로 리다이렉트
  }

  /**
   * Google OAuth 콜백
   */
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Google OAuth 콜백' })
  async googleCallback(@Req() req: any, @Res() res: Response) {
    const profile = req.user;
    const authResponse = await this.authService.handleGoogleLogin(profile);

    // 프론트엔드로 리다이렉트 (토큰 포함)
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const redirectUrl = `${frontendUrl}/auth/callback?token=${authResponse.accessToken}`;

    return res.redirect(redirectUrl);
  }

  /**
   * GitHub OAuth 로그인 시작
   */
  @Get('github')
  @UseGuards(AuthGuard('github'))
  @ApiOperation({ summary: 'GitHub OAuth 로그인 시작' })
  async githubLogin() {
    // Guard가 GitHub OAuth 페이지로 리다이렉트
  }

  /**
   * GitHub OAuth 콜백
   */
  @Get('github/callback')
  @UseGuards(AuthGuard('github'))
  @ApiOperation({ summary: 'GitHub OAuth 콜백' })
  async githubCallback(@Req() req: any, @Res() res: Response) {
    const profile = req.user;
    const authResponse = await this.authService.handleGithubLogin(profile);

    // 프론트엔드로 리다이렉트 (토큰 포함)
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const redirectUrl = `${frontendUrl}/auth/callback?token=${authResponse.accessToken}`;

    return res.redirect(redirectUrl);
  }
}
