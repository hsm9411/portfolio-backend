import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Post } from '../entities/post';
import { Project } from '../entities/project';
import { ViewCountService } from './services';

/**
 * Common Module
 * 
 * 공통으로 사용되는 서비스와 유틸리티를 제공
 * @Global 데코레이터로 전역에서 사용 가능
 */
@Global()
@Module({
  imports: [TypeOrmModule.forFeature([Post, Project])],
  providers: [ViewCountService],
  exports: [ViewCountService],
})
export class CommonModule {}
