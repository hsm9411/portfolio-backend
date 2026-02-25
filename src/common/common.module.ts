import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { Post } from '../entities/post';
import { Project } from '../entities/project';
import { ViewCountService } from './services';
import { RevalidationService } from './services/revalidation.service';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([Post, Project]),
    HttpModule.register({ timeout: 5000, maxRedirects: 3 }),
  ],
  providers: [ViewCountService, RevalidationService],
  exports: [ViewCountService, RevalidationService],
})
export class CommonModule {}
