import { Test, TestingModule } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { User } from '../../entities/user/user.entity';

const mockUser = {
  id: 'user-uuid',
  email: 'test@example.com',
  nickname: 'testuser',
} as User;

describe('AuthService', () => {
  let service: AuthService;
  let jwtService: Record<string, jest.Mock>;
  let cache: Record<string, jest.Mock>;
  let userRepo: Record<string, jest.Mock>;

  beforeEach(async () => {
    jwtService = {
      sign: jest.fn().mockReturnValue('mock-access-token'),
      decode: jest.fn(),
    };

    cache = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(undefined),
      del: jest.fn().mockResolvedValue(undefined),
    };

    userRepo = {
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: CACHE_MANAGER, useValue: cache },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  describe('generateTokens', () => {
    it('returns accessToken from jwtService.sign', () => {
      const { accessToken } = service.generateTokens(mockUser);
      expect(accessToken).toBe('mock-access-token');
      expect(jwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({ sub: mockUser.id, email: mockUser.email }),
      );
    });

    it('returns a UUID string as refreshToken', () => {
      const { refreshToken } = service.generateTokens(mockUser);
      expect(refreshToken).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
    });

    it('generates unique refreshTokens on each call', () => {
      const { refreshToken: rt1 } = service.generateTokens(mockUser);
      const { refreshToken: rt2 } = service.generateTokens(mockUser);
      expect(rt1).not.toBe(rt2);
    });
  });

  describe('saveRefreshToken', () => {
    it('stores token in cache with 7-day TTL', async () => {
      await service.saveRefreshToken('user-uuid', 'some-rti');

      expect(cache.set).toHaveBeenCalledWith(
        'auth:refresh:some-rti',
        'user-uuid',
        7 * 24 * 60 * 60 * 1000,
      );
    });
  });

  describe('refreshTokens', () => {
    it('throws UnauthorizedException for invalid/expired token', async () => {
      cache.get.mockResolvedValue(null);
      await expect(service.refreshTokens('invalid-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('rotates tokens: deletes old and issues new', async () => {
      cache.get.mockResolvedValue('user-uuid');
      userRepo.findOne.mockResolvedValue(mockUser);

      const { accessToken, refreshToken } =
        await service.refreshTokens('old-rti');

      expect(cache.del).toHaveBeenCalledWith('auth:refresh:old-rti');
      expect(cache.set).toHaveBeenCalledWith(
        expect.stringMatching(/^auth:refresh:/),
        'user-uuid',
        expect.any(Number),
      );
      expect(accessToken).toBe('mock-access-token');
      expect(refreshToken).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
    });

    it('new refreshToken differs from old one (rotation)', async () => {
      cache.get.mockResolvedValue('user-uuid');
      userRepo.findOne.mockResolvedValue(mockUser);

      const { refreshToken } = await service.refreshTokens('old-rti');

      expect(refreshToken).not.toBe('old-rti');
    });
  });

  describe('logout', () => {
    it('blacklists jti with remaining TTL', async () => {
      const futureExp = Math.floor(Date.now() / 1000) + 900;
      jwtService.decode.mockReturnValue({
        jti: 'mock-jti',
        exp: futureExp,
        rti: 'mock-rti',
      });

      await service.logout('some-access-token');

      expect(cache.set).toHaveBeenCalledWith(
        'auth:blacklist:mock-jti',
        '1',
        expect.any(Number),
      );
      const ttl = cache.set.mock.calls[0][2] as number;
      expect(ttl).toBeGreaterThan(0);
    });

    it('invalidates refresh token on logout', async () => {
      jwtService.decode.mockReturnValue({
        jti: 'mock-jti',
        exp: Math.floor(Date.now() / 1000) + 900,
        rti: 'mock-rti',
      });

      await service.logout('some-access-token');

      expect(cache.del).toHaveBeenCalledWith('auth:refresh:mock-rti');
    });

    it('uses explicitly provided refreshToken over rti in token', async () => {
      jwtService.decode.mockReturnValue({
        jti: 'mock-jti',
        exp: Math.floor(Date.now() / 1000) + 900,
        rti: 'embedded-rti',
      });

      await service.logout('access-token', 'explicit-rti');

      expect(cache.del).toHaveBeenCalledWith('auth:refresh:explicit-rti');
    });

    it('does not throw when token decode fails', async () => {
      jwtService.decode.mockImplementation(() => {
        throw new Error('invalid');
      });
      await expect(service.logout('bad-token')).resolves.not.toThrow();
    });
  });

  describe('isTokenBlacklisted', () => {
    it('returns true when jti is in blacklist', async () => {
      cache.get.mockResolvedValue('1');
      expect(await service.isTokenBlacklisted('some-jti')).toBe(true);
    });

    it('returns false when jti is not in blacklist', async () => {
      cache.get.mockResolvedValue(null);
      expect(await service.isTokenBlacklisted('some-jti')).toBe(false);
    });
  });

  describe('findById', () => {
    it('returns user when found', async () => {
      userRepo.findOne.mockResolvedValue(mockUser);
      expect(await service.findById('user-uuid')).toEqual(mockUser);
    });

    it('throws NotFoundException when user does not exist', async () => {
      userRepo.findOne.mockResolvedValue(null);
      await expect(service.findById('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
