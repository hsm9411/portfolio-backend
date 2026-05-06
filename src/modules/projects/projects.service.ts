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
import { Project } from '../../entities/project/project.entity';
import { User } from '../../entities/user/user.entity';
import { RevalidationService } from '../../common/services/revalidation.service';
import {
  CreateProjectDto,
  UpdateProjectDto,
  GetProjectsDto,
  PaginatedProjectsResponseDto,
} from './dto';

const CACHE_PREFIX = 'projects:list:';
const CACHE_TTL = 60 * 1000; // 60s
const CACHE_KEY_FIELDS = [
  'page',
  'limit',
  'search',
  'status',
  'sortBy',
  'order',
] as const;

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    private readonly revalidationService: RevalidationService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  private async invalidateListCache(): Promise<void> {
    try {
      const client = (this.cacheManager.stores[0] as any).store?.client;
      const keys: string[] = await client.keys(`${CACHE_PREFIX}*`);
      if (keys.length > 0) await client.del(keys);
    } catch {
      /* non-critical */
    }
  }

  async findAll(dto: GetProjectsDto): Promise<PaginatedProjectsResponseDto> {
    const cacheKey = `${CACHE_PREFIX}${JSON.stringify(dto, [...CACHE_KEY_FIELDS])}`;
    const cached =
      await this.cacheManager.get<PaginatedProjectsResponseDto>(cacheKey);
    if (cached) return cached;

    const query = this.projectRepository.createQueryBuilder('project');

    if (dto.status) {
      query.andWhere('project.status = :status', { status: dto.status });
    }

    if (dto.search) {
      query.andWhere(
        '(project.title ILIKE :search OR project.description ILIKE :search)',
        { search: `%${dto.search}%` },
      );
    }

    const sortColumn =
      dto.sortBy === 'created_at'
        ? 'project.createdAt'
        : dto.sortBy === 'view_count'
          ? 'project.viewCount'
          : 'project.likeCount';

    query.orderBy(sortColumn, dto.order);
    query.skip(dto.skip).take(dto.take);

    const [items, total] = await query.getManyAndCount();

    const result: PaginatedProjectsResponseDto = {
      items,
      total,
      page: dto.page,
      pageSize: dto.limit,
      totalPages: Math.ceil(total / dto.limit),
    };

    await this.cacheManager.set(cacheKey, result, CACHE_TTL);
    return result;
  }

  async findFeatured(): Promise<Project[]> {
    return this.projectRepository.find({
      where: { featured: true },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Project> {
    const project = await this.projectRepository.findOne({ where: { id } });
    if (!project) throw new NotFoundException('프로젝트를 찾을 수 없습니다.');
    return project;
  }

  async create(user: User, dto: CreateProjectDto): Promise<Project> {
    if (!user.isAdmin)
      throw new ForbiddenException('관리자만 프로젝트를 생성할 수 있습니다.');

    const project = this.projectRepository.create({
      ...dto,
      authorId: user.id,
      authorNickname: user.nickname,
      authorAvatarUrl: user.avatarUrl,
    });
    const saved = await this.projectRepository.save(project);

    this.invalidateListCache().catch(() => {});
    this.revalidationService.revalidateProject(saved.id).catch(() => {});

    return saved;
  }

  async update(
    id: string,
    user: User,
    dto: UpdateProjectDto,
  ): Promise<Project> {
    const project = await this.findOne(id);
    if (project.authorId !== user.id && !user.isAdmin) {
      throw new ForbiddenException('수정 권한이 없습니다.');
    }

    Object.assign(project, dto);
    const saved = await this.projectRepository.save(project);

    this.invalidateListCache().catch(() => {});
    this.revalidationService.revalidateProject(id).catch(() => {});

    return saved;
  }

  async remove(id: string, user: User): Promise<void> {
    const project = await this.findOne(id);
    if (project.authorId !== user.id && !user.isAdmin) {
      throw new ForbiddenException('삭제 권한이 없습니다.');
    }

    await this.projectRepository.remove(project);

    this.invalidateListCache().catch(() => {});
    this.revalidationService.revalidateProject().catch(() => {});
  }
}
