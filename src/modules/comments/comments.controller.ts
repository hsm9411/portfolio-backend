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
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { CommentsService } from './comments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../../entities/user';
import { TargetType } from '../../entities/comment';
import {
  CreateCommentDto,
  UpdateCommentDto,
  CommentResponseDto,
} from './dto';

@ApiTags('comments')
@Controller('comments')
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Get(':targetType/:targetId')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: '댓글 목록 조회 (익명 마스킹 적용)' })
  @ApiParam({ name: 'targetType', enum: TargetType })
  async findByTarget(
    @Param('targetType') targetType: TargetType,
    @Param('targetId') targetId: string,
    @CurrentUser() user?: User,
  ): Promise<CommentResponseDto[]> {
    return this.commentsService.findByTarget(targetType, targetId, user?.id);
  }

  @Post(':targetType/:targetId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '댓글 작성 (로그인 필수, 익명 옵션 가능)' })
  @ApiParam({ name: 'targetType', enum: TargetType })
  async create(
    @Param('targetType') targetType: TargetType,
    @Param('targetId') targetId: string,
    @CurrentUser() user: User,
    @Body() dto: CreateCommentDto,
  ): Promise<CommentResponseDto> {
    return this.commentsService.create(user, targetType, targetId, dto);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '댓글 수정 (작성자만)' })
  async update(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Body() dto: UpdateCommentDto,
  ): Promise<CommentResponseDto> {
    return this.commentsService.update(id, user, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '댓글 삭제 (작성자 또는 Admin)' })
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ): Promise<{ message: string }> {
    await this.commentsService.remove(id, user);
    return { message: '댓글이 삭제되었습니다.' };
  }
}
