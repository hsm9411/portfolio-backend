import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
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
   * Slug 생성 (제목 → URL 친화적 문자열)
   */
  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9가-힣\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .substring(0, 100);
  }

  /**
   * Summary 자동 생성 (content 앞 150자)
   */
  private generateSummary(content: string): string {
    return content.replace(/[#*`\n]/g, ' ').substring(0, 150) + '...';
  }

  /**
   * 고유 Slug 생성 (중복 시 숫자 추가)
   */
  private async createUniqueSlug(baseSlug: string): Promise<string> {
    let slug = baseSlug;
    let counter = 1;

    while (await this.postRepository.findOne({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    return slug;
  }

  /**
   * 글 목록 조회 (페이징, 검색, 태그 필터)
   */
  async findAll(dto: GetPostsDto): Promise<PaginatedPostsResponseDto> {
    const query = this.postRepository.createQueryBuilder('post');

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
   * Slug로 글 조회
   */
  async findBySlug(slug: string): Promise<Post> {
    const post = await this.postRepository.findOne({ where: { slug } });

    if (!post) {
      throw new NotFoundException('글을 찾을 수 없습니다.');
    }

    return post;
  }

  /**
   * ID로 글 조회
   */
  async findOne(id: string): Promise<Post> {
    const post = await this.postRepository.findOne({ where: { id } });

    if (!post) {
      throw new NotFoundException('글을 찾을 수 없습니다.');
    }

    return post;
  }

  /**
   * 글 작성 (로그인 필수)
   */
  async create(user: User, dto: CreatePostDto): Promise<Post> {
    // Slug 생성
    const baseSlug = this.generateSlug(dto.title);
    const slug = await this.createUniqueSlug(baseSlug);

    // Summary 자동 생성 (제공 안 된 경우)
    const summary = dto.summary || this.generateSummary(dto.content);

    const post = this.postRepository.create({
      ...dto,
      slug,
      summary,
      authorId: user.id,
      authorNickname: user.nickname,
      authorAvatarUrl: user.avatarUrl,
      tags: dto.tags || [],
    });

    return this.postRepository.save(post);
  }

  /**
   * 글 수정 (작성자만)
   */
  async update(id: string, user: User, dto: UpdatePostDto): Promise<Post> {
    const post = await this.findOne(id);

    // 권한 체크
    if (post.authorId !== user.id && !user.isAdmin) {
      throw new ForbiddenException('글 수정 권한이 없습니다.');
    }

    // 제목 변경 시 Slug 재생성
    if (dto.title && dto.title !== post.title) {
      const baseSlug = this.generateSlug(dto.title);
      const newSlug = await this.createUniqueSlug(baseSlug);
      post.slug = newSlug;
    }

    // Summary 재생성 (content 변경 시)
    if (dto.content && !dto.summary) {
      post.summary = this.generateSummary(dto.content);
    }

    Object.assign(post, dto);

    return this.postRepository.save(post);
  }

  /**
   * 글 삭제 (작성자만)
   */
  async remove(id: string, user: User): Promise<void> {
    const post = await this.findOne(id);

    if (post.authorId !== user.id && !user.isAdmin) {
      throw new ForbiddenException('글 삭제 권한이 없습니다.');
    }

    await this.postRepository.remove(post);
  }

  /**
   * 조회수 증가 (Redis 캐싱 예정)
   */
  async incrementViewCount(id: string): Promise<void> {
    await this.postRepository.increment({ id }, 'viewCount', 1);
  }
}
