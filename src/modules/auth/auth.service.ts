import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User } from '../../entities/user/user.entity';
import { RegisterDto, LoginDto, AuthResponseDto } from './dto';
import { OAuthUser } from './interfaces/oauth-user.interface';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
  ) {}

  /**
   * 회원가입 (Local)
   */
  async register(registerDto: RegisterDto): Promise<AuthResponseDto> {
    const { email, password, nickname, bio, githubUrl, linkedinUrl, websiteUrl } = registerDto;

    // 이메일 중복 확인
    const existingUser = await this.userRepository.findOne({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('이미 사용 중인 이메일입니다.');
    }

    // 비밀번호 해싱
    const hashedPassword = await bcrypt.hash(password, 10);

    // 사용자 생성
    const user = this.userRepository.create({
      email,
      password: hashedPassword,
      nickname,
      provider: 'local',
      bio,
      githubUrl,
      linkedinUrl,
      websiteUrl,
    });

    await this.userRepository.save(user);

    // JWT 토큰 생성
    const accessToken = this.generateToken(user);

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        nickname: user.nickname,
        avatarUrl: user.avatarUrl,
        isAdmin: user.isAdmin,
      },
    };
  }

  /**
   * 로그인 (Local)
   */
  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    const { email, password } = loginDto;

    // 사용자 조회
    const user = await this.userRepository.findOne({
      where: { email },
    });

    if (!user) {
      throw new UnauthorizedException('이메일 또는 비밀번호가 잘못되었습니다.');
    }

    // OAuth 사용자 확인
    if (user.provider !== 'local') {
      throw new UnauthorizedException(
        `이 계정은 ${user.provider} 로그인을 사용합니다.`,
      );
    }

    // 비밀번호 검증
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('이메일 또는 비밀번호가 잘못되었습니다.');
    }

    // JWT 토큰 생성
    const accessToken = this.generateToken(user);

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        nickname: user.nickname,
        avatarUrl: user.avatarUrl,
        isAdmin: user.isAdmin,
      },
    };
  }

  /**
   * OAuth 사용자 처리 (Google, GitHub 공통)
   *
   * Flow:
   * 1. providerId로 기존 사용자 조회
   * 2. 없으면 신규 사용자 생성
   * 3. JWT 토큰 발급
   *
   * @param oauthUser - OAuth Provider에서 받은 사용자 정보
   */
  async handleOAuthLogin(oauthUser: OAuthUser): Promise<AuthResponseDto> {
    const { provider, providerId, email, name, picture } = oauthUser;

    // 기존 사용자 조회
    let user = await this.userRepository.findOne({
      where: { provider, providerId },
    });

    // 신규 사용자 생성
    if (!user) {
      user = this.userRepository.create({
        email,
        nickname: name,
        avatarUrl: picture,
        provider,
        providerId,
        // GitHub의 경우 프로필 URL 자동 설정
        githubUrl: provider === 'github' ? `https://github.com/${name}` : undefined,
      });

      await this.userRepository.save(user);
    } else {
      // 기존 사용자 정보 업데이트 (프로필 사진 등)
      user.avatarUrl = picture || user.avatarUrl;
      await this.userRepository.save(user);
    }

    // JWT 토큰 생성
    const accessToken = this.generateToken(user);

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        nickname: user.nickname,
        avatarUrl: user.avatarUrl,
        isAdmin: user.isAdmin,
      },
    };
  }

  /**
   * JWT 토큰 생성
   */
  private generateToken(user: User): string {
    const payload = {
      sub: user.id,
      email: user.email,
    };

    return this.jwtService.sign(payload);
  }

  /**
   * 사용자 조회 (ID)
   */
  async findById(id: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }

    return user;
  }
}
