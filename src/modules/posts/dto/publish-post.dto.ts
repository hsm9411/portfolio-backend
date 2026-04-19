import { IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class PublishPostDto {
  @ApiProperty({ description: '발행 여부' })
  @IsBoolean()
  isPublished: boolean;
}
