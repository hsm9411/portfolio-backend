import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { ProjectsService } from './projects.service';
import {
  CreateProjectDto,
  UpdateProjectDto,
  GetProjectsDto,
  ProjectResponseDto,
  PaginatedProjectsResponseDto,
} from './dto';
import { JwtAuthGuard, OptionalJwtAuthGuard } from '../auth/guards';
import { User } from '../../entities/user/user.entity';

@ApiTags('projects')
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  /**
   * 프로젝트 목록 조회
   */
  @Get()
  @ApiOperation({ summary: '프로젝트 목록 조회' })
  @ApiResponse({
    status: 200,
    description: '조회 성공',
    type: PaginatedProjectsResponseDto,
  })
  async findAll(
    @Query() dto: GetProjectsDto,
  ): Promise<PaginatedProjectsResponseDto> {
    return this.projectsService.findAll(dto);
  }

  /**
   * 프로젝트 상세 조회
   */
  @Get(':id')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: '프로젝트 상세 조회' })
  @ApiResponse({
    status: 200,
    description: '조회 성공',
    type: ProjectResponseDto,
  })
  @ApiResponse({ status: 404, description: '프로젝트 없음' })
  async findOne(@Param('id') id: string): Promise<ProjectResponseDto> {
    // 조회수 증가 (비동기)
    this.projectsService.incrementViewCount(id).catch(() => {
      // 실패해도 무시 (조회수는 중요하지 않음)
    });

    return this.projectsService.findOne(id);
  }

  /**
   * 프로젝트 생성 (관리자만)
   */
  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '프로젝트 생성 (관리자만)' })
  @ApiResponse({
    status: 201,
    description: '생성 성공',
    type: ProjectResponseDto,
  })
  @ApiResponse({ status: 401, description: '인증 필요' })
  @ApiResponse({ status: 403, description: '권한 없음' })
  async create(
    @Req() req: Request & { user: User },
    @Body() dto: CreateProjectDto,
  ): Promise<ProjectResponseDto> {
    return this.projectsService.create(req.user, dto);
  }

  /**
   * 프로젝트 수정 (작성자/관리자)
   */
  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '프로젝트 수정 (작성자/관리자)' })
  @ApiResponse({
    status: 200,
    description: '수정 성공',
    type: ProjectResponseDto,
  })
  @ApiResponse({ status: 401, description: '인증 필요' })
  @ApiResponse({ status: 403, description: '권한 없음' })
  @ApiResponse({ status: 404, description: '프로젝트 없음' })
  async update(
    @Param('id') id: string,
    @Req() req: Request & { user: User },
    @Body() dto: UpdateProjectDto,
  ): Promise<ProjectResponseDto> {
    return this.projectsService.update(id, req.user, dto);
  }

  /**
   * 프로젝트 삭제 (작성자/관리자)
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '프로젝트 삭제 (작성자/관리자)' })
  @ApiResponse({ status: 200, description: '삭제 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  @ApiResponse({ status: 403, description: '권한 없음' })
  @ApiResponse({ status: 404, description: '프로젝트 없음' })
  async remove(
    @Param('id') id: string,
    @Req() req: Request & { user: User },
  ): Promise<{ message: string }> {
    await this.projectsService.remove(id, req.user);
    return { message: '프로젝트가 삭제되었습니다.' };
  }
}
