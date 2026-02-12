import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsOptional,
  IsInt,
  Min,
  Max,
  IsString,
  IsEnum,
} from 'class-validator';

export class GetProjectsDto {
  @ApiPropertyOptional({
    description: '페이지 번호 (1부터 시작)',
    minimum: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({
    description: '페이지당 항목 수',
    minimum: 1,
    maximum: 100,
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 10;

  @ApiPropertyOptional({
    description: '검색어 (제목 또는 설명)',
    example: 'NestJS',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: '프로젝트 상태 필터',
    enum: ['in-progress', 'completed', 'archived'],
  })
  @IsOptional()
  @IsEnum(['in-progress', 'completed', 'archived'])
  status?: string;

  @ApiPropertyOptional({
    description: '정렬 기준',
    enum: ['created_at', 'view_count', 'like_count'],
    default: 'created_at',
  })
  @IsOptional()
  @IsEnum(['created_at', 'view_count', 'like_count'])
  sortBy?: string = 'created_at';

  @ApiPropertyOptional({
    description: '정렬 방향',
    enum: ['ASC', 'DESC'],
    default: 'DESC',
  })
  @IsOptional()
  @IsEnum(['ASC', 'DESC'])
  order?: 'ASC' | 'DESC' = 'DESC';

  // 계산된 값
  get skip(): number {
    return (this.page - 1) * this.limit;
  }

  get take(): number {
    return this.limit;
  }
}
