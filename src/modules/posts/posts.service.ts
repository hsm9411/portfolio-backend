import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
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

@Injectable()
export class PostsService {
  constructor(
    @InjectRepository(Post)
    private readonly postRepository: Repository<Post>,
    private readonly revalidationService: RevalidationService,
  ) {}

  private generateSummary(content: string): string {
    return content.replace(/[#*`\n]/g, ' ').substring(0, 150) + '...';
  }

  private calculateReadingTime(content: string): number {
    const wordsPerMinute = 200;
    const wordCount = content.length / 3;
    return Math.max(1, Math.ceil(wordCount / wordsPerMinute));
  }

  async findAll(dto: GetPostsDto): Promise<PaginatedPostsResponseDto> {
    const query = this.postRepository.createQueryBuilder('post');
    query.andWhere('post.isPublished = :published', { published: true });

    if (dto.search) {
      query.andWhere(
        '(post.title ILIKE :search OR post.summary ILIKE :search)',
        { search: `%${dto.search}%` },
      );
    }

    if (dto.tags && dto.tags.length > 0) {
      query.andWhere('post.tags && :tags', { tags: dto.tags });
    }

    query.orderBy('post.createdAt', 'DESC');
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

  async findOne(id: string): Promise<Post> {
    const post = await this.postRepository.findOne({
      where: { id, isPublished: true }
    });
    if (!post) throw new NotFoundException('   .');
    return post;
  }

  async create(user: User, dto: CreatePostDto): Promise<Post> {
    const summary = dto.summary || this.generateSummary(dto.content);
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
    const saved = await this.postRepository.save(post);

    // fire-and-forget
    this.revalidationService.revalidatePost(saved.id).catch(() => {});

    return saved;
  }

  async update(id: string, user: User, dto: UpdatePostDto): Promise<Post> {
    const post = await this.postRepository.findOne({ where: { id } });
    if (!post) throw new NotFoundException('   .');
    if (post.authorId !== user.id && !user.isAdmin) {
      throw new ForbiddenException('   .');
    }

    if (dto.content && !dto.summary) {
      post.summary = this.generateSummary(dto.content);
    }
    if (dto.content) {
      post.readingTime = this.calculateReadingTime(dto.content);
    }

    Object.assign(post, dto);
    const saved = await this.postRepository.save(post);

    this.revalidationService.revalidatePost(id).catch(() => {});

    return saved;
  }

  async remove(id: string, user: User): Promise<void> {
    const post = await this.postRepository.findOne({ where: { id } });
    if (!post) throw new NotFoundException('   .');
    if (post.authorId !== user.id && !user.isAdmin) {
      throw new ForbiddenException('   .');
    }

    await this.postRepository.remove(post);
    this.revalidationService.revalidatePost().catch(() => {});
  }

  async incrementViewCount(id: string): Promise<void> {
    await this.postRepository.increment({ id }, 'viewCount', 1);
  }
}
