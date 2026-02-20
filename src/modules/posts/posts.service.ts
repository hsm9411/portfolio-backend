import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Post } from '../../entities/post';
import { User } from '../../entities/user';
import {
  CreatePostDto,
  UpdatePostDto,
  GetPostsDto,
  PaginatedPostsResponseDto,
} from './dto';

@Injectable()
export class PostsService {
  constructor(
    @InjectRepository(Post)
    private readonly postRepository: Repository<Post>,
  ) {}

  /**
   * Summary 자동 생성 (content 앞 150자)
   */
  private generateSummary(content: string): string {
    return content.replace(/[#*`\n]/g, ' ').substring(0, 150) + '...';
  }

  /**
   * Reading time 계산 (분)
   */
  private calculateReadingTime(content: string): number {
    const wordsPerMinute = 200;
    const wordCount = content.length / 3; // 한글 기준
    return Math.max(1, Math.ceil(wordCount / wordsPerMinute));
  }

  /**
   * 글 목록 조회 (페이징, 검색, 태그 필터)
   */
  async findAll(dto: GetPostsDto): Promise<PaginatedPostsResponseDto> {
    const query = this.postRepository.createQueryBuilder('post');

    // ✅ 게시된 글만 조회
    query.andWhere('post.isPublished = :published', { published: true });

    // 검색
    if (dto.search) {
      query.andWhere(
        '(post.title ILIKE :search OR post.content ILIKE :search)',
        { search: `%${dto.search}%` },
      );
    }

    // 태그 필터 (GIN 인덱스 활용)
    if (dto.tags && dto.tags.length > 0) {
      query.andWhere('post.tags && :tags', { tags: dto.tags });
    }

    // 정렬 (최신순)
    query.orderBy('post.createdAt', 'DESC');

    // 페이징
    query.skip(dto.skip).take(dto.take);

    const [items, total] = await query.getManyAndCount();

    return {
      items,
      total,
      page: dto.page,
      pageSize: dto.limit,
      totalPages: Math.ceil(total / dto.limit),
    };
  }

  /**
   * ID로 글 조회
   */
  async findOne(id: string): Promise<Post> {
    const post = await this.postRepository.findOne({ 
      where: { id, isPublished: true }
    });

    if (!post) {
      throw new NotFoundException('글을 찾을 수 없습니다.');
    }

    return post;
  }

  /**
   * 글 작성 (로그인 필수)
   */
  async create(user: User, dto: CreatePostDto): Promise<Post> {
    // Summary 자동 생성 (제공 안 된 경우)
    const summary = dto.summary || this.generateSummary(dto.content);

    // Reading time 계산
    const readingTime = this.calculateReadingTime(dto.content);

    const post = this.postRepository.create({
      ...dto,
      summary,
      readingTime,
      isPublished: true,
      authorId: user.id,
      authorNickname: user.nickname,
      authorAvatarUrl: user.avatarUrl,
      tags: dto.tags || [],
      publishedAt: new Date(),
    });

    return this.postRepository.save(post);
  }

  /**
   * 글 수정 (작성자만)
   */
  async update(id: string, user: User, dto: UpdatePostDto): Promise<Post> {
    const post = await this.postRepository.findOne({ where: { id } });

    if (!post) {
      throw new NotFoundException('글을 찾을 수 없습니다.');
    }

    // 권한 체크
    if (post.authorId !== user.id && !user.isAdmin) {
      throw new ForbiddenException('글 수정 권한이 없습니다.');
    }

    // Summary 재생성 (content 변경 시)
    if (dto.content && !dto.summary) {
      post.summary = this.generateSummary(dto.content);
    }

    // Reading time 재계산
    if (dto.content) {
      post.readingTime = this.calculateReadingTime(dto.content);
    }

    Object.assign(post, dto);

    return this.postRepository.save(post);
  }

  /**
   * 글 삭제 (작성자만)
   */
  async remove(id: string, user: User): Promise<void> {
    const post = await this.postRepository.findOne({ where: { id } });

    if (!post) {
      throw new NotFoundException('글을 찾을 수 없습니다.');
    }

    if (post.authorId !== user.id && !user.isAdmin) {
      throw new ForbiddenException('글 삭제 권한이 없습니다.');
    }

    await this.postRepository.remove(post);
  }

  /**
   * 조회수 증가
   */
  async incrementViewCount(id: string): Promise<void> {
    await this.postRepository.increment({ id }, 'viewCount', 1);
  }
}
