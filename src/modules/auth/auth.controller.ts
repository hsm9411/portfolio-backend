import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto, AuthResponseDto } from './dto';
import { JwtAuthGuard } from './guards';
import { User } from '../../entities/user/user.entity';

/**
 * Auth Controller (Supabase OAuth 전환)
 *
 * OAuth는 Frontend → Supabase Auth에서 직접 처리
 * Backend는 Local 로그인과 JWT 검증만 담당
 *
 * OAuth Flow:
 * 1. Frontend: supabase.auth.signInWithOAuth({ provider: 'google' })
 * 2. Supabase: Google OAuth 처리 → JWT 발급
 * 3. Frontend: JWT를 Backend API 호출 시 Header에 포함
 * 4. Backend: SupabaseJwtStrategy가 JWT 검증 & portfolio.users 동기화
 */
@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * 회원가입 (Local)
   *
   * Note: OAuth 사용자는 Supabase에서 자동 생성
   */
  @Post('register')
  @ApiOperation({ summary: '회원가입 (Local)' })
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
   *
   * Note: OAuth 사용자는 Frontend에서 Supabase 로그인
   */
  @Post('login')
  @ApiOperation({ summary: '로그인 (Local)' })
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
   *
   * Supabase JWT 또는 Local JWT 모두 지원
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
   * OAuth 사용자 동기화 엔드포인트 (선택)
   *
   * Frontend에서 Supabase OAuth 완료 후 호출하여
   * portfolio.users와 강제 동기화 (필요시)
   */
  @Post('sync-oauth-user')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'OAuth 사용자 동기화 (선택)' })
  @ApiResponse({ status: 200, description: '동기화 성공' })
  async syncOAuthUser(@Req() req: Request & { user: User }) {
    // SupabaseJwtStrategy가 이미 동기화 처리
    // 이 엔드포인트는 명시적 동기화가 필요한 경우만 사용
    return {
      message: '사용자 정보 동기화 완료',
      user: req.user,
    };
  }
}
