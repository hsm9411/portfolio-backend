import {
  Injectable,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';
import { ProjectUpdatesService } from '../project-updates/project-updates.service';
import { GithubPullRequestPayload } from './interfaces/github-webhook.interface';

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);
  private readonly repoMap: Record<string, string>;

  constructor(
    private readonly configService: ConfigService,
    private readonly projectUpdatesService: ProjectUpdatesService,
  ) {
    const raw = this.configService.get<string>('GITHUB_REPO_MAP') ?? '{}';
    try {
      this.repoMap = JSON.parse(raw);
    } catch {
      this.repoMap = {};
      this.logger.warn('GITHUB_REPO_MAP 파싱 실패 — 빈 맵으로 초기화');
    }
  }

  async handleGithubWebhook(
    rawBody: Buffer,
    payload: GithubPullRequestPayload,
    signature: string,
    event: string,
  ): Promise<{ message: string }> {
    this.verifySignature(rawBody, signature);

    if (
      event !== 'pull_request' ||
      payload.action !== 'closed' ||
      !payload.pull_request?.merged
    ) {
      this.logger.debug(
        `GitHub event ignored: event=${event}, action=${payload.action}, merged=${payload.pull_request?.merged}`,
      );
      return { message: 'Event ignored' };
    }

    const repoName = payload.repository.name;
    const projectId = this.repoMap[repoName];

    if (!projectId) {
      this.logger.warn(
        `GitHub Webhook: repo '${repoName}' is not mapped to any project`,
      );
      return { message: 'Repo not mapped' };
    }

    await this.projectUpdatesService.createFromWebhook({
      projectId,
      title: payload.pull_request.title,
      content: payload.pull_request.body ?? '',
      externalUrl: payload.pull_request.html_url,
    });

    this.logger.log(
      `GitHub PR merged → Changelog created (repo: ${repoName}, project: ${projectId})`,
    );
    return { message: 'Changelog entry created' };
  }

  private verifySignature(rawBody: Buffer, signature: string): void {
    if (!signature) {
      throw new UnauthorizedException('x-hub-signature-256 헤더가 없습니다.');
    }

    const secret = this.configService.get<string>('GITHUB_WEBHOOK_SECRET');
    if (!secret) {
      this.logger.error('GITHUB_WEBHOOK_SECRET 환경변수가 설정되지 않았습니다.');
      throw new UnauthorizedException('Webhook secret이 설정되지 않았습니다.');
    }

    const expected =
      'sha256=' + createHmac('sha256', secret).update(rawBody).digest('hex');

    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(expected);

    if (
      sigBuf.length !== expBuf.length ||
      !timingSafeEqual(sigBuf, expBuf)
    ) {
      this.logger.warn('GitHub Webhook 서명 검증 실패');
      throw new UnauthorizedException('유효하지 않은 서명입니다.');
    }
  }
}
