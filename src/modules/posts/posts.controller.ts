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
} from '@nestjs/common';
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

@ApiTags('posts')
@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Get()
  @SkipThrottle()
  @ApiOperation({ summary: '글 목록 조회 (페이징, 검색, 태그)' })
  async findAll(@Query() dto: GetPostsDto): Promise<PaginatedPostsResponseDto> {
    return this.postsService.findAll(dto);
  }

  @Get(':slug')
  @SkipThrottle()
  @ApiOperation({ summary: 'Slug로 글 조회' })
  async findBySlug(@Param('slug') slug: string): Promise<PostResponseDto> {
    const post = await this.postsService.findBySlug(slug);
    
    // 조회수 증가 (비동기, 에러 무시)
    this.postsService.incrementViewCount(post.id).catch(() => {});

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
