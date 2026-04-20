import {
  Controller,
  Post,
  Get,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards';
import { User } from '../../entities/user/user.entity';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '현재 사용자 정보 조회' })
  @ApiResponse({ status: 200, description: '조회 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  async getProfile(@Req() req: Request & { user: User }) {
    return req.user;
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '로그아웃 (토큰 무효화)' })
  @ApiResponse({ status: 204, description: '로그아웃 성공' })
  async logout(@Req() req: Request & { user: User; headers: Record<string, string> }) {
    const authHeader = (req as any).headers?.authorization as string | undefined;
    const token = authHeader?.replace('Bearer ', '');
    if (token) await this.authService.logout(token);
  }

  @Post('sync-oauth-user')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'OAuth 사용자 동기화 (선택)' })
  @ApiResponse({ status: 200, description: '동기화 성공' })
  async syncOAuthUser(@Req() req: Request & { user: User }) {
    return {
      message: '사용자 정보 동기화 완료',
      user: req.user,
    };
  }
}
