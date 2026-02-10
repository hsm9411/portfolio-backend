import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class UpdateCommentDto {
  @ApiProperty({ example: '수정된 댓글 내용' })
  @IsString()
  @MinLength(1)
  content: string;
}
