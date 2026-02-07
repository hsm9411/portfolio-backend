import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from 'passport-github2';
import { ConfigService } from '@nestjs/config';

export interface GithubProfile {
  id: string;
  email: string;
  name: string;
  avatarUrl: string;
  githubUrl: string;
}

@Injectable()
export class GithubStrategy extends PassportStrategy(Strategy, 'github') {
  constructor(private configService: ConfigService) {
    super({
      clientID: configService.get<string>('GITHUB_CLIENT_ID'),
      clientSecret: configService.get<string>('GITHUB_CLIENT_SECRET'),
      callbackURL: configService.get<string>('GITHUB_CALLBACK_URL'),
      scope: ['user:email'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: (error: any, user?: any) => void,
  ): Promise<any> {
    const { id, username, emails, photos, profileUrl } = profile;

    const githubProfile: GithubProfile = {
      id,
      email: emails?.[0]?.value || `${username}@github.local`,
      name: username,
      avatarUrl: photos?.[0]?.value || null,
      githubUrl: profileUrl,
    };

    done(null, githubProfile);
  }
}
