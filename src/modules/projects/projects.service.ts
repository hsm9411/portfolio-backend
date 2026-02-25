import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
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

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    private readonly revalidationService: RevalidationService,
  ) {}

  async findAll(dto: GetProjectsDto): Promise<PaginatedProjectsResponseDto> {
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

    const sortColumn = dto.sortBy === 'created_at' ? 'project.created_at' :
                       dto.sortBy === 'view_count' ? 'project.view_count' :
                       'project.like_count';

    query.orderBy(sortColumn, dto.order);
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

  async findOne(id: string): Promise<Project> {
    const project = await this.projectRepository.findOne({ where: { id } });
    if (!project) throw new NotFoundException('   .');
    return project;
  }

  async create(user: User, dto: CreateProjectDto): Promise<Project> {
    if (!user.isAdmin) throw new ForbiddenException('   .');

    const project = this.projectRepository.create({
      ...dto,
      authorId: user.id,
      authorNickname: user.nickname,
      authorAvatarUrl: user.avatarUrl,
    });
    const saved = await this.projectRepository.save(project);

    // fire-and-forget:    
    this.revalidationService.revalidateProject(saved.id).catch(() => {});

    return saved;
  }

  async update(id: string, user: User, dto: UpdateProjectDto): Promise<Project> {
    const project = await this.findOne(id);
    if (project.authorId !== user.id && !user.isAdmin) {
      throw new ForbiddenException('   .');
    }

    Object.assign(project, dto);
    const saved = await this.projectRepository.save(project);

    this.revalidationService.revalidateProject(id).catch(() => {});

    return saved;
  }

  async remove(id: string, user: User): Promise<void> {
    const project = await this.findOne(id);
    if (project.authorId !== user.id && !user.isAdmin) {
      throw new ForbiddenException('   .');
    }

    await this.projectRepository.remove(project);

    //  :  revalidate (id  )
    this.revalidationService.revalidateProject().catch(() => {});
  }

  async incrementViewCount(id: string): Promise<void> {
    await this.projectRepository.increment({ id }, 'viewCount', 1);
  }
}
