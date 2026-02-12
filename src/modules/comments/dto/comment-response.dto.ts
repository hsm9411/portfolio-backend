import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CommentUserDto {
  @ApiPropertyOptional()
  id: string | null;

  @ApiProperty()
  nickname: string;

  @ApiPropertyOptional()
  avatarUrl: string | null;
}

export class CommentResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  content: string;

  @ApiProperty()
  targetType: string;

  @ApiProperty()
  targetId: string;

  @ApiProperty()
  isAnonymous: boolean;

  @ApiProperty({ description: '내가 작성한 댓글인지 여부' })
  isMine: boolean;

  @ApiProperty({ type: CommentUserDto })
  user: CommentUserDto;

  @ApiPropertyOptional()
  parentId: string | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
