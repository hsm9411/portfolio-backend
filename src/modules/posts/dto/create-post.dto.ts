import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsArray, IsOptional, MinLength, IsEnum } from 'class-validator';

export class CreatePostDto {
  @ApiProperty({ example: 'NestJS 마이크로서비스 아키텍처' })
  @IsString()
  @MinLength(1)
  title: string;

  @ApiProperty({ example: 'NestJS로 마이크로서비스를 구축하는 방법...' })
  @IsString()
  @MinLength(10)
  content: string;

  @ApiPropertyOptional({ example: 'NestJS 마이크로서비스 패턴 요약' })
  @IsOptional()
  @IsString()
  summary?: string;

  @ApiProperty({ 
    example: 'tutorial',
    enum: ['tutorial', 'essay', 'review', 'news']
  })
  @IsEnum(['tutorial', 'essay', 'review', 'news'])
  category: string;

  @ApiPropertyOptional({ example: ['NestJS', 'Microservices', 'TypeScript'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}
