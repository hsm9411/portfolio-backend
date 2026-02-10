import { ApiProperty } from '@nestjs/swagger';

export class ProjectResponseDto {
  @ApiProperty({ description: '프로젝트 ID' })
  id: string;

  @ApiProperty({ description: '제목' })
  title: string;

  @ApiProperty({ description: '요약' })
  summary: string;

  @ApiProperty({ description: '상세 설명' })
  description: string;

  @ApiProperty({ description: '썸네일 URL', required: false })
  thumbnailUrl?: string;

  @ApiProperty({ description: '데모 URL', required: false })
  demoUrl?: string;

  @ApiProperty({ description: 'GitHub URL', required: false })
  githubUrl?: string;

  @ApiProperty({ description: '기술 스택', type: [String] })
  techStack: string[];

  @ApiProperty({ description: '태그', type: [String] })
  tags: string[];

  @ApiProperty({ description: '상태' })
  status: string;

  @ApiProperty({ description: '조회수' })
  viewCount: number;

  @ApiProperty({ description: '좋아요 수' })
  likeCount: number;

  @ApiProperty({ description: '작성자 ID' })
  authorId: string;

  @ApiProperty({ description: '작성자 닉네임' })
  authorNickname: string;

  @ApiProperty({ description: '작성자 프로필 이미지', required: false })
  authorAvatarUrl?: string;

  @ApiProperty({ description: '생성일시' })
  createdAt: Date;

  @ApiProperty({ description: '수정일시' })
  updatedAt: Date;
}

export class PaginatedProjectsResponseDto {
  @ApiProperty({ description: '프로젝트 목록', type: [ProjectResponseDto] })
  items: ProjectResponseDto[];

  @ApiProperty({ description: '전체 항목 수' })
  total: number;

  @ApiProperty({ description: '현재 페이지' })
  page: number;

  @ApiProperty({ description: '페이지당 항목 수' })
  pageSize: number;

  @ApiProperty({ description: '전체 페이지 수' })
  totalPages: number;
}
