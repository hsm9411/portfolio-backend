import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards';
import { RefreshTokenDto, TokenResponseDto } from './dto';
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

  @Post('sync-oauth-user')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'OAuth 사용자 동기화 및 토큰 발급' })
  @ApiResponse({ status: 200, description: 'Access Token + Refresh Token 반환' })
  async syncOAuthUser(@Req() req: Request & { user: User }) {
    const tokens = this.authService.generateTokens(req.user);
    await this.authService.saveRefreshToken(req.user.id, tokens.refreshToken);
    return {
      ...tokens,
      user: req.user,
    };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Access Token 재발급 (Refresh Token rotation)' })
  @ApiResponse({ status: 200, type: TokenResponseDto, description: '새 토큰 쌍 반환' })
  @ApiResponse({ status: 401, description: '유효하지 않은 Refresh Token' })
  async refresh(@Body() dto: RefreshTokenDto): Promise<TokenResponseDto> {
    return this.authService.refreshTokens(dto.refreshToken);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '로그아웃 (Access + Refresh Token 무효화)' })
  @ApiResponse({ status: 204, description: '로그아웃 성공' })
  async logout(
    @Req() req: Request & { user: User },
    @Body() body: Partial<RefreshTokenDto>,
  ) {
    const authHeader = (req as any).headers?.authorization as string | undefined;
    const token = authHeader?.replace('Bearer ', '');
    if (token) await this.authService.logout(token, body?.refreshToken);
  }
}
