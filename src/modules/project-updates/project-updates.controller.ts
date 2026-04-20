import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { ProjectUpdatesService } from './project-updates.service';
import {
  CreateProjectUpdateDto,
  UpdateProjectUpdateDto,
  ProjectUpdateResponseDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards';
import { User } from '../../entities/user/user.entity';

@ApiTags('project-updates')
@Controller('projects')
export class ProjectUpdatesController {
  constructor(
    private readonly projectUpdatesService: ProjectUpdatesService,
  ) {}

  @Get(':projectId/updates')
  @ApiOperation({ summary: '프로젝트 업데이트 타임라인 조회' })
  @ApiParam({ name: 'projectId', description: '프로젝트 UUID' })
  @ApiResponse({
    status: 200,
    description: '조회 성공',
    type: [ProjectUpdateResponseDto],
  })
  async findAll(
    @Param('projectId') projectId: string,
  ): Promise<ProjectUpdateResponseDto[]> {
    return this.projectUpdatesService.findAllByProject(projectId);
  }

  @Post(':projectId/updates')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '프로젝트 업데이트 수동 작성 (관리자)' })
  @ApiParam({ name: 'projectId', description: '프로젝트 UUID' })
  @ApiResponse({
    status: 201,
    description: '작성 성공',
    type: ProjectUpdateResponseDto,
  })
  @ApiResponse({ status: 401, description: '인증 필요' })
  @ApiResponse({ status: 403, description: '권한 없음' })
  async create(
    @Param('projectId') projectId: string,
    @Req() req: Request & { user: User },
    @Body() dto: CreateProjectUpdateDto,
  ): Promise<ProjectUpdateResponseDto> {
    return this.projectUpdatesService.create(projectId, req.user, dto);
  }

  @Patch('updates/:updateId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '프로젝트 업데이트 수정 (관리자)' })
  @ApiParam({ name: 'updateId', description: '업데이트 UUID' })
  @ApiResponse({
    status: 200,
    description: '수정 성공',
    type: ProjectUpdateResponseDto,
  })
  @ApiResponse({ status: 401, description: '인증 필요' })
  @ApiResponse({ status: 403, description: '권한 없음' })
  @ApiResponse({ status: 404, description: '업데이트 없음' })
  async update(
    @Param('updateId') updateId: string,
    @Req() req: Request & { user: User },
    @Body() dto: UpdateProjectUpdateDto,
  ): Promise<ProjectUpdateResponseDto> {
    return this.projectUpdatesService.update(updateId, req.user, dto);
  }

  @Delete('updates/:updateId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '프로젝트 업데이트 삭제 (관리자)' })
  @ApiParam({ name: 'updateId', description: '업데이트 UUID' })
  @ApiResponse({ status: 200, description: '삭제 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  @ApiResponse({ status: 403, description: '권한 없음' })
  @ApiResponse({ status: 404, description: '업데이트 없음' })
  async remove(
    @Param('updateId') updateId: string,
    @Req() req: Request & { user: User },
  ): Promise<{ message: string }> {
    await this.projectUpdatesService.remove(updateId, req.user);
    return { message: '업데이트가 삭제되었습니다.' };
  }
}
