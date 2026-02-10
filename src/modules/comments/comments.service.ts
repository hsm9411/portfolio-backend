import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Comment, TargetType } from '../../entities/comment';
import { User } from '../../entities/user';
import {
  CreateCommentDto,
  UpdateCommentDto,
  CommentResponseDto,
} from './dto';

@Injectable()
export class CommentsService {
  constructor(
    @InjectRepository(Comment)
    private readonly commentRepository: Repository<Comment>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  /**
   * 댓글 목록 조회 (대상별)
   */
  async findByTarget(
    targetType: TargetType,
    targetId: string,
    currentUserId?: string,
  ): Promise<CommentResponseDto[]> {
    const comments = await this.commentRepository.find({
      where: { targetType, targetId },
      order: { createdAt: 'ASC' },
    });

    // User 정보 일괄 조회
    const userIds = [...new Set(comments.map((c) => c.userId))];
    const users = await this.userRepository.findByIds(userIds);
    const userMap = new Map(users.map((u) => [u.id, u]));

    // 마스킹 적용
    return comments.map((comment) =>
      this.maskComment(comment, userMap.get(comment.userId)!, currentUserId),
    );
  }

  /**
   * 댓글 생성
   */
  async create(
    user: User,
    targetType: TargetType,
    targetId: string,
    dto: CreateCommentDto,
  ): Promise<CommentResponseDto> {
    // 부모 댓글 검증
    if (dto.parentId) {
      const parent = await this.commentRepository.findOne({
        where: { id: dto.parentId },
      });

      if (!parent) {
        throw new NotFoundException('부모 댓글을 찾을 수 없습니다.');
      }

      if (parent.targetType !== targetType || parent.targetId !== targetId) {
        throw new ForbiddenException('같은 대상의 댓글에만 답글을 달 수 있습니다.');
      }
    }

    const comment = this.commentRepository.create({
      ...dto,
      targetType,
      targetId,
      userId: user.id,
      isAnonymous: dto.isAnonymous || false,
    });

    const saved = await this.commentRepository.save(comment);

    return this.maskComment(saved, user, user.id);
  }

  /**
   * 댓글 수정 (작성자만)
   */
  async update(
    id: string,
    user: User,
    dto: UpdateCommentDto,
  ): Promise<CommentResponseDto> {
    const comment = await this.commentRepository.findOne({ where: { id } });

    if (!comment) {
      throw new NotFoundException('댓글을 찾을 수 없습니다.');
    }

    if (comment.userId !== user.id) {
      throw new ForbiddenException('댓글 수정 권한이 없습니다.');
    }

    comment.content = dto.content;
    const updated = await this.commentRepository.save(comment);

    return this.maskComment(updated, user, user.id);
  }

  /**
   * 댓글 삭제 (작성자 또는 Admin)
   */
  async remove(id: string, user: User): Promise<void> {
    const comment = await this.commentRepository.findOne({ where: { id } });

    if (!comment) {
      throw new NotFoundException('댓글을 찾을 수 없습니다.');
    }

    if (comment.userId !== user.id && !user.isAdmin) {
      throw new ForbiddenException('댓글 삭제 권한이 없습니다.');
    }

    await this.commentRepository.remove(comment);
  }

  /**
   * 익명 마스킹 로직
   * 
   * - 작성자 본인 또는 Admin: 원본 user 정보 반환, isMine: true
   * - 익명 댓글이고 타인: user를 { nickname: '익명', id: null, avatarUrl: null }로 마스킹
   */
  private maskComment(
    comment: Comment,
    author: User,
    currentUserId?: string,
  ): CommentResponseDto {
    const isMine = currentUserId === comment.userId;
    const isAdmin = currentUserId && author.isAdmin;

    // 본인이거나 Admin이면 원본 정보 노출
    if (isMine || isAdmin) {
      return {
        id: comment.id,
        content: comment.content,
        targetType: comment.targetType,
        targetId: comment.targetId,
        isAnonymous: comment.isAnonymous,
        isMine: true,
        user: {
          id: author.id,
          nickname: author.nickname,
          avatarUrl: author.avatarUrl,
        },
        parentId: comment.parentId,
        createdAt: comment.createdAt,
        updatedAt: comment.updatedAt,
      };
    }

    // 익명 댓글 + 타인: 마스킹
    if (comment.isAnonymous) {
      return {
        id: comment.id,
        content: comment.content,
        targetType: comment.targetType,
        targetId: comment.targetId,
        isAnonymous: true,
        isMine: false,
        user: {
          id: null,
          nickname: '익명',
          avatarUrl: null,
        },
        parentId: comment.parentId,
        createdAt: comment.createdAt,
        updatedAt: comment.updatedAt,
      };
    }

    // 일반 댓글
    return {
      id: comment.id,
      content: comment.content,
      targetType: comment.targetType,
      targetId: comment.targetId,
      isAnonymous: false,
      isMine: false,
      user: {
        id: author.id,
        nickname: author.nickname,
        avatarUrl: author.avatarUrl,
      },
      parentId: comment.parentId,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
    };
  }
}
