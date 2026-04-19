import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PostsService } from './posts.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../../entities/user';
import {
  CreatePostDto,
  UpdatePostDto,
  GetPostsDto,
  PostResponseDto,
  PaginatedPostsResponseDto,
  PublishPostDto,
} from './dto';
import { SkipThrottle } from '@nestjs/throttler';
import { ViewCountService, ViewTargetType } from '../../common/services';
import { getClientIp } from '../../common/utils';

@ApiTags('posts')
@Controller('posts')
export class PostsController {
  constructor(
    private readonly postsService: PostsService,
    private readonly viewCountService: ViewCountService,
  ) {}

  @Get()
  @SkipThrottle()
  @ApiOperation({ summary: '글 목록 조회 (페이징, 검색, 태그)' })
  async findAll(@Query() dto: GetPostsDto): Promise<PaginatedPostsResponseDto> {
    return this.postsService.findAll(dto);
  }

  @Get('tags')
  @SkipThrottle()
  @ApiOperation({ summary: '사용 중인 태그 목록 + 카운트' })
  async findAllTags(): Promise<{ tag: string; count: number }[]> {
    return this.postsService.findAllTags();
  }

  @Get('my')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '내 글 목록 (draft 포함)' })
  async findMyPosts(@CurrentUser() user: User): Promise<PostResponseDto[]> {
    return this.postsService.findMyPosts(user.id);
  }

  @Get(':id')
  @SkipThrottle()
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'ID로 글 조회 (Redis 조회수 캐싱, draft는 작성자/관리자만)' })
  async findOne(
    @Param('id') id: string,
    @Req() req: Request,
    @CurrentUser() user?: User,
  ): Promise<PostResponseDto> {
    const post = await this.postsService.findOne(id, user);
    
    // Redis 기반 조회수 증가 (IP 중복 방지, 24시간 TTL)
    const clientIp = getClientIp(req);
    this.viewCountService
      .incrementView(ViewTargetType.POST, post.id, clientIp)
      .catch(() => {});

    return post;
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '글 작성 (로그인 필수)' })
  async create(
    @CurrentUser() user: User,
    @Body() dto: CreatePostDto,
  ): Promise<PostResponseDto> {
    return this.postsService.create(user, dto);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '글 수정 (작성자만)' })
  async update(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Body() dto: UpdatePostDto,
  ): Promise<PostResponseDto> {
    return this.postsService.update(id, user, dto);
  }

  @Patch(':id/publish')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '글 발행/취소 토글 (작성자만)' })
  async publish(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Body() dto: PublishPostDto,
  ): Promise<PostResponseDto> {
    return this.postsService.publish(id, user, dto.isPublished);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '글 삭제 (작성자만)' })
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ): Promise<{ message: string }> {
    await this.postsService.remove(id, user);
    return { message: '글이 삭제되었습니다.' };
  }
}
