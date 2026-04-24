import { Test, TestingModule } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { PostsService } from './posts.service';
import { Post } from '../../entities/post';
import { User } from '../../entities/user';
import { RevalidationService } from '../../common/services/revalidation.service';
import { GetPostsDto } from './dto';

const authorUser = {
  id: 'author-uuid',
  nickname: 'author',
  avatarUrl: null,
  isAdmin: false,
} as User;

const adminUser = {
  id: 'admin-uuid',
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

const publishedPost = {
  id: 'post-uuid',
  title: 'Published Post',
  content: 'Content here',
  authorId: 'author-uuid',
  isPublished: true,
  publishedAt: new Date(),
} as Post;

const draftPost = {
  id: 'draft-uuid',
  title: 'Draft Post',
  content: 'Draft content',
  authorId: 'author-uuid',
  isPublished: false,
  publishedAt: null,
} as Post;

const makeQb = () => ({
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  skip: jest.fn().mockReturnThis(),
  take: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  addSelect: jest.fn().mockReturnThis(),
  groupBy: jest.fn().mockReturnThis(),
  getManyAndCount: jest.fn().mockResolvedValue([[publishedPost], 1]),
  getRawMany: jest.fn().mockResolvedValue([]),
});

describe('PostsService', () => {
  let service: PostsService;
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
        PostsService,
        { provide: getRepositoryToken(Post), useValue: repo },
        { provide: CACHE_MANAGER, useValue: cache },
        {
          provide: RevalidationService,
          useValue: { revalidatePost: jest.fn().mockResolvedValue(undefined) },
        },
      ],
    }).compile();

    service = module.get(PostsService);
  });

  describe('findAll', () => {
    it('returns cached result on cache hit', async () => {
      const cached = {
        items: [publishedPost],
        total: 1,
        page: 1,
        pageSize: 10,
        totalPages: 1,
      };
      cache.get.mockResolvedValue(cached);

      const result = await service.findAll(new GetPostsDto());

      expect(result).toBe(cached);
      expect(repo.createQueryBuilder).not.toHaveBeenCalled();
    });

    it('queries DB with isPublished filter and caches result', async () => {
      const qb = makeQb();
      repo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findAll(new GetPostsDto());

      expect(qb.where).toHaveBeenCalledWith('post.isPublished = :published', {
        published: true,
      });
      expect(result.items).toEqual([publishedPost]);
      expect(cache.set).toHaveBeenCalled();
    });

    it('applies search filter', async () => {
      const dto = Object.assign(new GetPostsDto(), { search: 'NestJS' });
      const qb = makeQb();
      repo.createQueryBuilder.mockReturnValue(qb);

      await service.findAll(dto);

      expect(qb.andWhere).toHaveBeenCalledWith(
        '(post.title ILIKE :search OR post.summary ILIKE :search)',
        { search: '%NestJS%' },
      );
    });

    it('applies tags filter', async () => {
      const dto = Object.assign(new GetPostsDto(), { tags: ['NestJS'] });
      const qb = makeQb();
      repo.createQueryBuilder.mockReturnValue(qb);

      await service.findAll(dto);

      expect(qb.andWhere).toHaveBeenCalledWith('post.tags && :tags', {
        tags: ['NestJS'],
      });
    });
  });

  describe('findOne', () => {
    it('returns published post', async () => {
      repo.findOne.mockResolvedValue(publishedPost);
      expect(await service.findOne('post-uuid')).toEqual(publishedPost);
    });

    it('throws NotFoundException when post does not exist', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.findOne('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('hides draft from non-owner', async () => {
      repo.findOne.mockResolvedValue(draftPost);
      await expect(service.findOne('draft-uuid', otherUser)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('returns draft to its owner', async () => {
      repo.findOne.mockResolvedValue(draftPost);
      expect(await service.findOne('draft-uuid', authorUser)).toEqual(
        draftPost,
      );
    });

    it('returns draft to admin', async () => {
      repo.findOne.mockResolvedValue(draftPost);
      expect(await service.findOne('draft-uuid', adminUser)).toEqual(draftPost);
    });
  });

  describe('create', () => {
    const dto = {
      title: 'New Post',
      content: 'A'.repeat(300),
      category: 'tutorial',
      tags: ['NestJS'],
    };

    it('auto-generates summary when not provided', async () => {
      const created = { ...dto, id: 'new-uuid', summary: '', readingTime: 1 };
      repo.create.mockReturnValue(created);
      repo.save.mockResolvedValue(created);

      await service.create(authorUser, dto as any);

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ summary: expect.any(String) }),
      );
    });

    it('uses provided summary when given', async () => {
      const dtoWithSummary = { ...dto, summary: 'Custom summary' };
      const created = { ...dtoWithSummary, id: 'new-uuid' };
      repo.create.mockReturnValue(created);
      repo.save.mockResolvedValue(created);

      await service.create(authorUser, dtoWithSummary as any);

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ summary: 'Custom summary' }),
      );
    });

    it('calculates readingTime based on content length', async () => {
      const longContent = 'word '.repeat(1000);
      const longDto = { ...dto, content: longContent };
      const created = { ...longDto, id: 'new-uuid' };
      repo.create.mockReturnValue(created);
      repo.save.mockResolvedValue(created);

      await service.create(authorUser, longDto as any);

      const createCall = repo.create.mock.calls[0][0];
      expect(createCall.readingTime).toBeGreaterThan(1);
    });

    it('sets isPublished=true by default', async () => {
      const created = { ...dto, id: 'new-uuid' };
      repo.create.mockReturnValue(created);
      repo.save.mockResolvedValue(created);

      await service.create(authorUser, dto as any);

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ isPublished: true }),
      );
    });

    it('respects isPublished=false for draft creation', async () => {
      const draftDto = { ...dto, isPublished: false };
      const created = { ...draftDto, id: 'new-uuid' };
      repo.create.mockReturnValue(created);
      repo.save.mockResolvedValue(created);

      await service.create(authorUser, draftDto as any);

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ isPublished: false, publishedAt: null }),
      );
    });
  });

  describe('publish', () => {
    it('sets isPublished and publishedAt when publishing', async () => {
      repo.findOne.mockResolvedValue({ ...draftPost });
      repo.save.mockImplementation((p) => Promise.resolve(p));

      const result = await service.publish('draft-uuid', authorUser, true);

      expect(result.isPublished).toBe(true);
      expect(result.publishedAt).toBeInstanceOf(Date);
    });

    it('clears publishedAt when unpublishing', async () => {
      repo.findOne.mockResolvedValue({ ...publishedPost });
      repo.save.mockImplementation((p) => Promise.resolve(p));

      const result = await service.publish('post-uuid', authorUser, false);

      expect(result.isPublished).toBe(false);
      expect(result.publishedAt).toBeNull();
    });

    it('throws ForbiddenException when not owner and not admin', async () => {
      repo.findOne.mockResolvedValue(publishedPost);
      await expect(
        service.publish('post-uuid', otherUser, false),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('update', () => {
    it('throws ForbiddenException when not owner and not admin', async () => {
      repo.findOne.mockResolvedValue(publishedPost);
      await expect(
        service.update('post-uuid', otherUser, { title: 'X' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('recalculates summary and readingTime when content changes', async () => {
      repo.findOne.mockResolvedValue({ ...publishedPost });
      repo.save.mockImplementation((p) => Promise.resolve(p));

      const newContent = 'New content. '.repeat(100);
      await service.update('post-uuid', authorUser, { content: newContent });

      const saveCall = repo.save.mock.calls[0][0];
      expect(saveCall.summary).toBeDefined();
      expect(saveCall.readingTime).toBeGreaterThanOrEqual(1);
    });
  });

  describe('remove', () => {
    it('throws ForbiddenException when not owner and not admin', async () => {
      repo.findOne.mockResolvedValue(publishedPost);
      await expect(service.remove('post-uuid', otherUser)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('removes post when user is owner', async () => {
      repo.findOne.mockResolvedValue(publishedPost);
      repo.remove.mockResolvedValue(undefined);

      await service.remove('post-uuid', authorUser);

      expect(repo.remove).toHaveBeenCalledWith(publishedPost);
    });
  });
});
