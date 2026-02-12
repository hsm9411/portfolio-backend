import {
  Controller,
  Post,
  Get,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { LikesService } from './likes.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../../entities/user';
import { LikeTargetType } from '../../entities/like';
import { LikeStatusDto } from './dto';

@ApiTags('likes')
@Controller('likes')
export class LikesController {
  constructor(private readonly likesService: LikesService) {}

  @Get(':targetType/:targetId')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: '좋아요 상태 조회' })
  @ApiParam({ name: 'targetType', enum: LikeTargetType })
  async getStatus(
    @Param('targetType') targetType: LikeTargetType,
    @Param('targetId') targetId: string,
    @CurrentUser() user?: User,
  ): Promise<LikeStatusDto> {
    return this.likesService.getStatus(targetType, targetId, user?.id);
  }

  @Post(':targetType/:targetId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '좋아요 토글 (좋아요/취소)' })
  @ApiParam({ name: 'targetType', enum: LikeTargetType })
  async toggle(
    @Param('targetType') targetType: LikeTargetType,
    @Param('targetId') targetId: string,
    @CurrentUser() user: User,
  ): Promise<LikeStatusDto> {
    return this.likesService.toggle(user, targetType, targetId);
  }
}
