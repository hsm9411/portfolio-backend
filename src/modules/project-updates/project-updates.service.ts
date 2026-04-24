import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ProjectUpdate,
  UpdateType,
} from '../../entities/project-update/project-update.entity';
import { User } from '../../entities/user/user.entity';
import { CreateProjectUpdateDto } from './dto/create-project-update.dto';
import { UpdateProjectUpdateDto } from './dto/update-project-update.dto';

@Injectable()
export class ProjectUpdatesService {
  private readonly logger = new Logger(ProjectUpdatesService.name);

  constructor(
    @InjectRepository(ProjectUpdate)
    private readonly projectUpdateRepository: Repository<ProjectUpdate>,
  ) {}

  async findAllByProject(projectId: string): Promise<ProjectUpdate[]> {
    return this.projectUpdateRepository.find({
      where: { projectId },
      order: { createdAt: 'DESC' },
    });
  }

  async create(
    projectId: string,
    user: User,
    dto: CreateProjectUpdateDto,
  ): Promise<ProjectUpdate> {
    if (!user.isAdmin) {
      throw new ForbiddenException('관리자만 업데이트를 작성할 수 있습니다.');
    }

    const update = this.projectUpdateRepository.create({
      projectId,
      updateType: UpdateType.MANUAL,
      title: dto.title,
      content: dto.content,
      externalUrl: dto.externalUrl ?? null,
    });

    const saved = await this.projectUpdateRepository.save(update);
    this.logger.log(
      `ProjectUpdate created: ${saved.id} (project: ${projectId})`,
    );
    return saved;
  }

  async update(
    updateId: string,
    user: User,
    dto: UpdateProjectUpdateDto,
  ): Promise<ProjectUpdate> {
    if (!user.isAdmin) {
      throw new ForbiddenException('관리자만 수정할 수 있습니다.');
    }

    const projectUpdate = await this.projectUpdateRepository.findOne({
      where: { id: updateId },
    });
    if (!projectUpdate) {
      throw new NotFoundException('업데이트 내역을 찾을 수 없습니다.');
    }

    Object.assign(projectUpdate, dto);
    return this.projectUpdateRepository.save(projectUpdate);
  }

  async remove(updateId: string, user: User): Promise<void> {
    if (!user.isAdmin) {
      throw new ForbiddenException('관리자만 삭제할 수 있습니다.');
    }

    const projectUpdate = await this.projectUpdateRepository.findOne({
      where: { id: updateId },
    });
    if (!projectUpdate) {
      throw new NotFoundException('업데이트 내역을 찾을 수 없습니다.');
    }

    await this.projectUpdateRepository.remove(projectUpdate);
    this.logger.log(`ProjectUpdate removed: ${updateId}`);
  }
}
