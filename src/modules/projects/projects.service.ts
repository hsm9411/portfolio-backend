import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from '../../entities/project/project.entity';
import { User } from '../../entities/user/user.entity';
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
  ) {}

  /**
   * 프로젝트 목록 조회 (페이징, 필터링, 검색)
   */
  async findAll(dto: GetProjectsDto): Promise<PaginatedProjectsResponseDto> {
    const query = this.projectRepository.createQueryBuilder('project');

    // 필터링: 상태
    if (dto.status) {
      query.andWhere('project.status = :status', { status: dto.status });
    }

    // 검색: 제목 또는 설명
    if (dto.search) {
      query.andWhere(
        '(project.title ILIKE :search OR project.description ILIKE :search)',
        { search: `%${dto.search}%` },
      );
    }

    // 정렬
    const sortColumn = dto.sortBy === 'created_at' ? 'project.created_at' :
                       dto.sortBy === 'view_count' ? 'project.view_count' :
                       'project.like_count';
    
    query.orderBy(sortColumn, dto.order);

    // 페이징
    query.skip(dto.skip).take(dto.take);

    // 실행
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
   * 프로젝트 상세 조회
   */
  async findOne(id: string): Promise<Project> {
    const project = await this.projectRepository.findOne({
      where: { id },
    });

    if (!project) {
      throw new NotFoundException('프로젝트를 찾을 수 없습니다.');
    }

    return project;
  }

  /**
   * 프로젝트 생성 (관리자만)
   */
  async create(user: User, dto: CreateProjectDto): Promise<Project> {
    // 관리자 권한 체크
    if (!user.isAdmin) {
      throw new ForbiddenException('프로젝트 생성 권한이 없습니다.');
    }

    const project = this.projectRepository.create({
      ...dto,
      authorId: user.id,
      authorNickname: user.nickname,
      authorAvatarUrl: user.avatarUrl,
    });

    return this.projectRepository.save(project);
  }

  /**
   * 프로젝트 수정 (작성자 또는 관리자)
   */
  async update(
    id: string,
    user: User,
    dto: UpdateProjectDto,
  ): Promise<Project> {
    const project = await this.findOne(id);

    // 권한 체크: 작성자 또는 관리자만
    if (project.authorId !== user.id && !user.isAdmin) {
      throw new ForbiddenException('프로젝트 수정 권한이 없습니다.');
    }

    // 업데이트
    Object.assign(project, dto);

    return this.projectRepository.save(project);
  }

  /**
   * 프로젝트 삭제 (작성자 또는 관리자)
   */
  async remove(id: string, user: User): Promise<void> {
    const project = await this.findOne(id);

    // 권한 체크: 작성자 또는 관리자만
    if (project.authorId !== user.id && !user.isAdmin) {
      throw new ForbiddenException('프로젝트 삭제 권한이 없습니다.');
    }

    await this.projectRepository.remove(project);
  }

  /**
   * 조회수 증가
   * TODO: Redis 캐싱으로 IP 중복 방지 구현 예정
   */
  async incrementViewCount(id: string): Promise<void> {
    await this.projectRepository.increment({ id }, 'viewCount', 1);
  }
}
