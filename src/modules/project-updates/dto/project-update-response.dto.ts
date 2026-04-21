import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UpdateType } from '../../../entities/project-update/project-update.entity';

export class ProjectUpdateResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  projectId: string;

  @ApiProperty({ enum: UpdateType })
  updateType: UpdateType;

  @ApiProperty()
  title: string;

  @ApiProperty()
  content: string;

  @ApiPropertyOptional({ nullable: true })
  externalUrl: string | null;

  @ApiProperty()
  createdAt: Date;
}
