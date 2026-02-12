import { ApiProperty } from '@nestjs/swagger';

export class LikeStatusDto {
  @ApiProperty({ description: '현재 좋아요 상태' })
  isLiked: boolean;

  @ApiProperty({ description: '전체 좋아요 수' })
  likeCount: number;
}
