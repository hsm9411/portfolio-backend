import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Inject,
} from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Post } from '../../entities/post';
import { User } from '../../entities/user';
import { RevalidationService } from '../../common/services/revalidation.service';
import {
  CreatePostDto,
  UpdatePostDto,
  GetPostsDto,
  PaginatedPostsResponseDto,
} from './dto';

const CACHE_PREFIX = 'posts:list:';
const CACHE_TTL = 60 * 1000; // 60s

@Injectable()
export class PostsService {
  constructor(
    @InjectRepository(Post)
    private readonly postRepository: Repository<Post>,
    private readonly revalidationService: RevalidationService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  private generateSummary(content: string): string {
    return content.replace(/[#*`\n]/g, ' ').substring(0, 150) + '...';
  }

  private calculateReadingTime(content: string): number {
    const wordsPerMinute = 200;
    const wordCount = content.length / 3;
    return Math.max(1, Math.ceil(wordCount / wordsPerMinute));
  }

  private async invalidateListCache(): Promise<void> {
    try {
      const client = (this.cacheManager.stores[0] as any).store?.client;
      const keys: string[] = await client.keys(`${CACHE_PREFIX}*`);
      if (keys.length > 0) await client.del(keys);
    } catch {
      /* non-critical */
    }
  }

  async findAll(dto: GetPostsDto): Promise<PaginatedPostsResponseDto> {
    const cacheKey = `${CACHE_PREFIX}${JSON.stringify(dto)}`;
    const cached =
      await this.cacheManager.get<PaginatedPostsResponseDto>(cacheKey);
    if (cached) return cached;

    const query = this.postRepository.createQueryBuilder('post');
    query.where('post.isPublished = :published', { published: true });

    if (dto.search) {
      query.andWhere(
        '(post.title ILIKE :search OR post.summary ILIKE :search)',
        { search: `%${dto.search}%` },
      );
    }

    if (dto.tags && dto.tags.length > 0) {
      query.andWhere('post.tags && :tags', { tags: dto.tags });
    }

    const sortColumn =
      dto.sortBy === 'view_count'
        ? 'post.viewCount'
        : dto.sortBy === 'like_count'
          ? 'post.likeCount'
          : 'post.createdAt';
    query.orderBy(sortColumn, dto.order);
    query.skip(dto.skip).take(dto.take);

    const [items, total] = await query.getManyAndCount();

    const result: PaginatedPostsResponseDto = {
      items,
      total,
      page: dto.page,
      pageSize: dto.limit,
      totalPages: Math.ceil(total / dto.limit),
    };

    await this.cacheManager.set(cacheKey, result, CACHE_TTL);
    return result;
  }

  async findAllTags(): Promise<{ tag: string; count: number }[]> {
    const rows = await this.postRepository
      .createQueryBuilder('post')
      .select('unnest(post.tags)', 'tag')
      .addSelect('COUNT(*)', 'count')
      .where('post.isPublished = :published', { published: true })
      .groupBy('tag')
      .orderBy('count', 'DESC')
      .getRawMany<{ tag: string; count: string }>();

    return rows.map((r) => ({ tag: r.tag, count: Number(r.count) }));
  }

  async findOne(id: string, requester?: User): Promise<Post> {
    const post = await this.postRepository.findOne({ where: { id } });
    if (!post) throw new NotFoundException('포스트를 찾을 수 없습니다.');

    const canViewDraft =
      requester && (requester.id === post.authorId || requester.isAdmin);
    if (!post.isPublished && !canViewDraft) {
      throw new NotFoundException('포스트를 찾을 수 없습니다.');
    }

    return post;
  }

  async findMyPosts(userId: string): Promise<Post[]> {
    return this.postRepository.find({
      where: { authorId: userId },
      order: { createdAt: 'DESC' },
    });
  }

  async create(user: User, dto: CreatePostDto): Promise<Post> {
    const summary = dto.summary || this.generateSummary(dto.content);
    const readingTime = this.calculateReadingTime(dto.content);
    const isPublished = dto.isPublished !== false;

    const post = this.postRepository.create({
      ...dto,
      summary,
      readingTime,
      isPublished,
      authorId: user.id,
      authorNickname: user.nickname,
      authorAvatarUrl: user.avatarUrl,
      tags: dto.tags || [],
      publishedAt: isPublished ? new Date() : null,
    });
    const saved = await this.postRepository.save(post);

    this.invalidateListCache().catch(() => {});
    if (isPublished) {
      this.revalidationService.revalidatePost(saved.id).catch(() => {});
    }

    return saved;
  }

  async publish(id: string, user: User, publish: boolean): Promise<Post> {
    const post = await this.postRepository.findOne({ where: { id } });
    if (!post) throw new NotFoundException('포스트를 찾을 수 없습니다.');
    if (post.authorId !== user.id && !user.isAdmin) {
      throw new ForbiddenException('권한이 없습니다.');
    }

    post.isPublished = publish;
    post.publishedAt = publish ? new Date() : null;
    const saved = await this.postRepository.save(post);

    this.invalidateListCache().catch(() => {});
    this.revalidationService.revalidatePost(id).catch(() => {});

    return saved;
  }

  async update(id: string, user: User, dto: UpdatePostDto): Promise<Post> {
    const post = await this.postRepository.findOne({ where: { id } });
    if (!post) throw new NotFoundException('포스트를 찾을 수 없습니다.');
    if (post.authorId !== user.id && !user.isAdmin) {
      throw new ForbiddenException('수정 권한이 없습니다.');
    }

    if (dto.content && !dto.summary) {
      post.summary = this.generateSummary(dto.content);
    }
    if (dto.content) {
      post.readingTime = this.calculateReadingTime(dto.content);
    }

    Object.assign(post, dto);
    const saved = await this.postRepository.save(post);

    this.invalidateListCache().catch(() => {});
    this.revalidationService.revalidatePost(id).catch(() => {});

    return saved;
  }

  async remove(id: string, user: User): Promise<void> {
    const post = await this.postRepository.findOne({ where: { id } });
    if (!post) throw new NotFoundException('포스트를 찾을 수 없습니다.');
    if (post.authorId !== user.id && !user.isAdmin) {
      throw new ForbiddenException('삭제 권한이 없습니다.');
    }

    await this.postRepository.remove(post);

    this.invalidateListCache().catch(() => {});
    this.revalidationService.revalidatePost().catch(() => {});
  }
}
