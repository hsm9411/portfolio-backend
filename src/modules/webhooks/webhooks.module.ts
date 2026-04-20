import { Module } from '@nestjs/common';
import { WebhooksService } from './webhooks.service';
import { WebhooksController } from './webhooks.controller';
import { ProjectUpdatesModule } from '../project-updates/project-updates.module';

@Module({
  imports: [ProjectUpdatesModule],
  controllers: [WebhooksController],
  providers: [WebhooksService],
})
export class WebhooksModule {}
