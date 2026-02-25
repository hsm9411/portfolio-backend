import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';

@Injectable()
export class RevalidationService {
  private readonly logger = new Logger(RevalidationService.name);

  constructor(private readonly httpService: HttpService) {}

  async revalidateProject(id?: string): Promise<void> {
    await this.trigger({ type: 'project', id });
  }

  async revalidatePost(slug?: string): Promise<void> {
    await this.trigger({ type: 'post', slug });
  }

  private async trigger(payload: { type: string; id?: string; slug?: string }): Promise<void> {
    const frontendUrl = process.env.FRONTEND_URL;
    const secret = process.env.REVALIDATE_SECRET;

    if (!frontendUrl || !secret) {
      this.logger.warn('Revalidation skipped: FRONTEND_URL or REVALIDATE_SECRET not set');
      return;
    }

    try {
      await this.httpService.axiosRef.post(
        `${frontendUrl}/api/revalidate`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
            'x-revalidate-secret': secret,
          },
          timeout: 5000,
        },
      );
      this.logger.log(`Revalidated: ${payload.type}/${payload.id ?? payload.slug ?? 'list'}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Revalidation failed [${payload.type}]: ${msg}`);
    }
  }
}
