import {
  Controller,
  Post,
  Req,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import { WebhooksService } from './webhooks.service';
import type { GithubPullRequestPayload } from './interfaces/github-webhook.interface';

@ApiTags('webhooks')
@Controller('webhooks')
@SkipThrottle()
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Post('github')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'GitHub Webhook 수신',
    description:
      'PR 머지 이벤트를 수신하여 project_updates에 자동으로 Changelog를 기록합니다. HMAC SHA-256 서명 검증 필수.',
  })
  @ApiResponse({ status: 200, description: '처리 성공 또는 무시된 이벤트' })
  @ApiResponse({ status: 401, description: '서명 검증 실패' })
  async handleGithubWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Body() body: GithubPullRequestPayload,
    @Headers('x-hub-signature-256') signature: string,
    @Headers('x-github-event') event: string,
  ): Promise<{ message: string }> {
    return this.webhooksService.handleGithubWebhook(
      req.rawBody ?? Buffer.alloc(0),
      body,
      signature,
      event,
    );
  }
}
