import {
  Controller,
  Get,
  Post,
  Put,
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
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../../entities/user';
import {
  CreatePostDto,
  UpdatePostDto,
  GetPostsDto,
  PostResponseDto,
  PaginatedPostsResponseDto,
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

  @Get(':id')
  @SkipThrottle()
  @ApiOperation({ summary: 'ID로 글 조회 (Redis 조회수 캐싱)' })
  async findOne(
    @Param('id') id: string,
    @Req() req: Request,
  ): Promise<PostResponseDto> {
    const post = await this.postsService.findOne(id);
    
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
