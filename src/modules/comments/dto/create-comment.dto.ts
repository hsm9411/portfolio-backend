import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsBoolean, IsOptional, IsUUID, MinLength } from 'class-validator';

export class CreateCommentDto {
  @ApiProperty({ example: '정말 유익한 글이네요!' })
  @IsString()
  @MinLength(1)
  content: string;

  @ApiPropertyOptional({ 
    example: false, 
    description: '익명 댓글 여부 (로그인 기반 익명)',
  })
  @IsOptional()
  @IsBoolean()
  isAnonymous?: boolean;

  @ApiPropertyOptional({ 
    example: 'uuid', 
    description: '부모 댓글 ID (대댓글인 경우)',
  })
  @IsOptional()
  @IsUUID()
  parentId?: string;
}
