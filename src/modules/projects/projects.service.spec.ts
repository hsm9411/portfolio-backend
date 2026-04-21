import { Test, TestingModule } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { Project } from '../../entities/project/project.entity';
import { User } from '../../entities/user/user.entity';
import { RevalidationService } from '../../common/services/revalidation.service';
import { GetProjectsDto } from './dto';

const mockProject = {
  id: 'project-uuid',
  title: 'Test Project',
  summary: 'Summary',
  description: 'Desc',
  authorId: 'user-uuid',
  featured: false,
  status: 'completed',
} as Project;

const adminUser = {
  id: 'user-uuid',
  nickname: 'admin',
  avatarUrl: null,
  isAdmin: true,
} as User;

const otherUser = {
  id: 'other-uuid',
  nickname: 'other',
  avatarUrl: null,
  isAdmin: false,
} as User;

const makeQb = () => ({
  andWhere: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  skip: jest.fn().mockReturnThis(),
  take: jest.fn().mockReturnThis(),
  getManyAndCount: jest.fn().mockResolvedValue([[mockProject], 1]),
});

describe('ProjectsService', () => {
  let service: ProjectsService;
  let repo: Record<string, jest.Mock>;
  let cache: Record<string, jest.Mock>;

  beforeEach(async () => {
    repo = {
      createQueryBuilder: jest.fn().mockReturnValue(makeQb()),
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
    };

    cache = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(undefined),
      del: jest.fn().mockResolvedValue(undefined),
      stores: [],
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectsService,
        { provide: getRepositoryToken(Project), useValue: repo },
        { provide: CACHE_MANAGER, useValue: cache },
        { provide: RevalidationService, useValue: { revalidateProject: jest.fn().mockResolvedValue(undefined) } },
      ],
    }).compile();

    service = module.get(ProjectsService);
  });

  describe('findAll', () => {
    it('returns cached result on cache hit', async () => {
      const cached = { items: [mockProject], total: 1, page: 1, pageSize: 10, totalPages: 1 };
      cache.get.mockResolvedValue(cached);

      const result = await service.findAll(new GetProjectsDto());

      expect(result).toBe(cached);
      expect(repo.createQueryBuilder).not.toHaveBeenCalled();
    });

    it('queries DB and caches result on cache miss', async () => {
      const result = await service.findAll(new GetProjectsDto());

      expect(result.items).toEqual([mockProject]);
      expect(result.total).toBe(1);
      expect(result.totalPages).toBe(1);
      expect(cache.set).toHaveBeenCalled();
    });

    it('applies status filter', async () => {
      const dto = Object.assign(new GetProjectsDto(), { status: 'completed' });
      const qb = makeQb();
      repo.createQueryBuilder.mockReturnValue(qb);

      await service.findAll(dto);

      expect(qb.andWhere).toHaveBeenCalledWith('project.status = :status', { status: 'completed' });
    });

    it('applies search filter with ILIKE', async () => {
      const dto = Object.assign(new GetProjectsDto(), { search: 'NestJS' });
      const qb = makeQb();
      repo.createQueryBuilder.mockReturnValue(qb);

      await service.findAll(dto);

      expect(qb.andWhere).toHaveBeenCalledWith(
        '(project.title ILIKE :search OR project.description ILIKE :search)',
        { search: '%NestJS%' },
      );
    });
  });

  describe('findOne', () => {
    it('returns project when found', async () => {
      repo.findOne.mockResolvedValue(mockProject);
      expect(await service.findOne('project-uuid')).toEqual(mockProject);
    });

    it('throws NotFoundException when not found', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.findOne('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    const dto = {
      title: 'New Project',
      summary: 'Summary',
      description: 'Desc',
      techStack: ['NestJS'],
      tags: [],
      status: 'in-progress',
    };

    it('throws ForbiddenException for non-admin', async () => {
      await expect(service.create(otherUser, dto as any)).rejects.toThrow(ForbiddenException);
    });

    it('creates project with author info for admin', async () => {
      const created = { ...dto, id: 'new-uuid' };
      repo.create.mockReturnValue(created);
      repo.save.mockResolvedValue(created);

      const result = await service.create(adminUser, dto as any);

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ authorId: adminUser.id, authorNickname: adminUser.nickname }),
      );
      expect(result).toEqual(created);
    });
  });

  describe('update', () => {
    it('throws ForbiddenException when not owner and not admin', async () => {
      repo.findOne.mockResolvedValue(mockProject);
      await expect(service.update('project-uuid', otherUser, { title: 'X' })).rejects.toThrow(ForbiddenException);
    });

    it('updates project when user is owner', async () => {
      repo.findOne.mockResolvedValue(mockProject);
      repo.save.mockResolvedValue({ ...mockProject, title: 'Updated' });

      const result = await service.update('project-uuid', adminUser, { title: 'Updated' });

      expect(result.title).toBe('Updated');
    });
  });

  describe('remove', () => {
    it('throws ForbiddenException when not owner and not admin', async () => {
      repo.findOne.mockResolvedValue(mockProject);
      await expect(service.remove('project-uuid', otherUser)).rejects.toThrow(ForbiddenException);
    });

    it('removes project when user is owner', async () => {
      repo.findOne.mockResolvedValue(mockProject);
      repo.remove.mockResolvedValue(undefined);

      await service.remove('project-uuid', adminUser);

      expect(repo.remove).toHaveBeenCalledWith(mockProject);
    });
  });
});
