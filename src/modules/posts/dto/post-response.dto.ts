import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Post } from '../../../entities/post';

export class PostResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  summary: string;

  @ApiProperty()
  content: string;

  @ApiPropertyOptional()
  thumbnailUrl?: string;

  @ApiProperty()
  category: string;

  @ApiProperty()
  tags: string[];

  @ApiProperty()
  isPublished: boolean;

  @ApiProperty()
  viewCount: number;

  @ApiProperty()
  likeCount: number;

  @ApiProperty()
  commentCount: number;

  @ApiPropertyOptional()
  readingTime?: number;

  @ApiProperty()
  authorId: string;

  @ApiProperty()
  authorNickname: string;

  @ApiPropertyOptional()
  authorAvatarUrl?: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiPropertyOptional()
  publishedAt?: Date;
}

export class PaginatedPostsResponseDto {
  @ApiProperty({ type: [PostResponseDto] })
  items: Post[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  pageSize: number;

  @ApiProperty()
  totalPages: number;
}
