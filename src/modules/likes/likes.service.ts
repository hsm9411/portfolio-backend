import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Like, LikeTargetType } from '../../entities/like';
import { Project } from '../../entities/project';
import { Post } from '../../entities/post';
import { User } from '../../entities/user';
import { LikeStatusDto } from './dto';

@Injectable()
export class LikesService {
  constructor(
    @InjectRepository(Like)
    private readonly likeRepository: Repository<Like>,
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    @InjectRepository(Post)
    private readonly postRepository: Repository<Post>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * 좋아요 토글 (좋아요/취소)
   */
  async toggle(
    user: User,
    targetType: LikeTargetType,
    targetId: string,
  ): Promise<LikeStatusDto> {
    return this.dataSource.transaction(async (manager) => {
      const likeRepo = manager.getRepository(Like);

      // 기존 좋아요 확인
      const existing = await likeRepo.findOne({
        where: { targetType, targetId, userId: user.id },
      });

      if (existing) {
        // 좋아요 취소
        await likeRepo.remove(existing);
        await this.decrementLikeCount(manager, targetType, targetId);

        const count = await likeRepo.count({ where: { targetType, targetId } });
        return { isLiked: false, likeCount: count };
      } else {
        // 좋아요 추가
        const like = likeRepo.create({
          targetType,
          targetId,
          userId: user.id,
        });
        await likeRepo.save(like);
        await this.incrementLikeCount(manager, targetType, targetId);

        const count = await likeRepo.count({ where: { targetType, targetId } });
        return { isLiked: true, likeCount: count };
      }
    });
  }

  /**
   * 좋아요 상태 조회
   */
  async getStatus(
    targetType: LikeTargetType,
    targetId: string,
    userId?: string,
  ): Promise<LikeStatusDto> {
    const count = await this.likeRepository.count({
      where: { targetType, targetId },
    });

    if (!userId) {
      return { isLiked: false, likeCount: count };
    }

    const isLiked = !!(await this.likeRepository.findOne({
      where: { targetType, targetId, userId },
    }));

    return { isLiked, likeCount: count };
  }

  /**
   * 좋아요 수 증가
   */
  private async incrementLikeCount(
    manager: any,
    targetType: LikeTargetType,
    targetId: string,
  ): Promise<void> {
    if (targetType === LikeTargetType.PROJECT) {
      await manager.increment(Project, { id: targetId }, 'likeCount', 1);
    } else {
      await manager.increment(Post, { id: targetId }, 'likeCount', 1);
    }
  }

  /**
   * 좋아요 수 감소
   */
  private async decrementLikeCount(
    manager: any,
    targetType: LikeTargetType,
    targetId: string,
  ): Promise<void> {
    if (targetType === LikeTargetType.PROJECT) {
      await manager.decrement(Project, { id: targetId }, 'likeCount', 1);
    } else {
      await manager.decrement(Post, { id: targetId }, 'likeCount', 1);
    }
  }
}
