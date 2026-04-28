import { PartialType } from '@nestjs/swagger';
import { CreateProjectUpdateDto } from './create-project-update.dto';

export class UpdateProjectUpdateDto extends PartialType(
  CreateProjectUpdateDto,
) {}
