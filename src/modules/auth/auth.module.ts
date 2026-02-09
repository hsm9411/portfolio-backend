import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { User } from '../../entities/user/user.entity';
import { JwtStrategy, SupabaseJwtStrategy } from './strategies';
import { JwtAuthGuard, OptionalJwtAuthGuard } from './guards';

/**
 * Auth Module (Supabase OAuth 전환)
 *
 * Strategies:
 * - JwtStrategy: Local 로그인용 (email/password)
 * - SupabaseJwtStrategy: Supabase OAuth용 (Google/GitHub)
 *
 * OAuth는 Frontend → Supabase Auth에서 처리
 * Backend는 JWT 검증만 담당
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET') || 'default-secret',
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRES_IN') || '7d',
        } as any,
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,          // Local 로그인용
    SupabaseJwtStrategy,  // Supabase OAuth용
    JwtAuthGuard,
    OptionalJwtAuthGuard,
  ],
  exports: [AuthService, JwtAuthGuard, OptionalJwtAuthGuard],
})
export class AuthModule {}
