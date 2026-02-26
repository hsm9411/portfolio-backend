import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

@Injectable()
export class RevalidationService {
  private readonly logger = new Logger(RevalidationService.name);

  constructor(private readonly httpService: HttpService) {}

  async revalidateProject(id?: string): Promise<void> {
    await this.trigger({ type: 'project', id });
  }

  async revalidatePost(id?: string): Promise<void> {
    await this.trigger({ type: 'post', id });
  }

  private async trigger(
    payload: { type: string; id?: string; slug?: string },
    attempt = 1,
  ): Promise<void> {
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
      this.logger.log(
        `Revalidated: ${payload.type}/${payload.id ?? payload.slug ?? 'list'}` +
        (attempt > 1 ? ` (attempt ${attempt})` : ''),
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);

      if (attempt < MAX_RETRIES) {
        // Exponential backoff: 1s → 2s → 4s
        const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
        this.logger.warn(
          `Revalidation failed [${payload.type}] attempt ${attempt}/${MAX_RETRIES}: ${msg}. Retrying in ${delay}ms...`,
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
        return this.trigger(payload, attempt + 1);
      }

      this.logger.error(
        `Revalidation permanently failed [${payload.type}] after ${MAX_RETRIES} attempts: ${msg}`,
      );
    }
  }
}
