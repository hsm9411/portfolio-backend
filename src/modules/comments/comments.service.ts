import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
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
      where: { targetType, targetId, isDeleted: false },
      order: { createdAt: 'ASC' },
    });

    return comments.map((comment) => ({
      id: comment.id,
      content: comment.content,
      targetType: comment.targetType,
      targetId: comment.targetId,
      isAnonymous: false, // 현재 스키마에는 익명 필드 없음
      isMine: currentUserId === comment.authorId,
      user: {
        id: comment.authorId,
        nickname: comment.authorNickname,
        avatarUrl: null, // 현재 스키마에 없음
      },
      parentId: comment.parentId,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
    }));
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
      content: dto.content,
      targetType,
      targetId,
      authorId: user.id,
      authorNickname: user.nickname,
      authorEmail: user.email,
      authorIp: '0.0.0.0', // TODO: 실제 IP 추출
      parentId: dto.parentId || null,
    });

    const saved = await this.commentRepository.save(comment);

    return {
      id: saved.id,
      content: saved.content,
      targetType: saved.targetType,
      targetId: saved.targetId,
      isAnonymous: false,
      isMine: true,
      user: {
        id: user.id,
        nickname: user.nickname,
        avatarUrl: user.avatarUrl,
      },
      parentId: saved.parentId,
      createdAt: saved.createdAt,
      updatedAt: saved.updatedAt,
    };
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

    if (comment.authorId !== user.id) {
      throw new ForbiddenException('댓글 수정 권한이 없습니다.');
    }

    comment.content = dto.content;
    const updated = await this.commentRepository.save(comment);

    return {
      id: updated.id,
      content: updated.content,
      targetType: updated.targetType,
      targetId: updated.targetId,
      isAnonymous: false,
      isMine: true,
      user: {
        id: user.id,
        nickname: user.nickname,
        avatarUrl: user.avatarUrl,
      },
      parentId: updated.parentId,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  }

  /**
   * 댓글 삭제 (작성자 또는 Admin)
   */
  async remove(id: string, user: User): Promise<void> {
    const comment = await this.commentRepository.findOne({ where: { id } });

    if (!comment) {
      throw new NotFoundException('댓글을 찾을 수 없습니다.');
    }

    if (comment.authorId !== user.id && !user.isAdmin) {
      throw new ForbiddenException('댓글 삭제 권한이 없습니다.');
    }

    // Soft delete
    comment.isDeleted = true;
    await this.commentRepository.save(comment);
  }
}
