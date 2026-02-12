import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsArray,
  IsOptional,
  MaxLength,
  IsEnum,
  IsUrl,
} from 'class-validator';

export class CreateProjectDto {
  @ApiProperty({
    description: '프로젝트 제목',
    example: 'Portfolio Backend API',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @ApiProperty({
    description: '프로젝트 요약 (카드용)',
    example: 'NestJS + Supabase 기반 포트폴리오 백엔드',
    maxLength: 500,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  summary: string;

  @ApiProperty({
    description: '프로젝트 상세 설명 (Markdown)',
    example: '## 프로젝트 개요\n\n...',
  })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({
    description: '썸네일 이미지 URL',
    example: 'https://example.com/thumbnail.png',
    required: false,
  })
  @IsOptional()
  @IsUrl()
  thumbnailUrl?: string;

  @ApiProperty({
    description: '데모 URL',
    example: 'https://demo.example.com',
    required: false,
  })
  @IsOptional()
  @IsUrl()
  demoUrl?: string;

  @ApiProperty({
    description: 'GitHub 레포지토리 URL',
    example: 'https://github.com/username/repo',
    required: false,
  })
  @IsOptional()
  @IsUrl()
  githubUrl?: string;

  @ApiProperty({
    description: '기술 스택',
    example: ['NestJS', 'TypeORM', 'Supabase', 'Redis'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  techStack: string[];

  @ApiProperty({
    description: '태그',
    example: ['Backend', 'API', 'MSA'],
    type: [String],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiProperty({
    description: '프로젝트 상태',
    enum: ['in-progress', 'completed', 'archived'],
    default: 'completed',
    required: false,
  })
  @IsOptional()
  @IsEnum(['in-progress', 'completed', 'archived'])
  status?: string;
}
