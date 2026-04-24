import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsOptional,
  IsInt,
  Min,
  Max,
  IsString,
  IsArray,
  IsEnum,
} from 'class-validator';

export class GetPostsDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ default: 10, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 10;

  @ApiPropertyOptional({ example: 'NestJS' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ example: ['NestJS', 'TypeScript'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

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

  get skip(): number {
    return (this.page - 1) * this.limit;
  }

  get take(): number {
    return this.limit;
  }
}
