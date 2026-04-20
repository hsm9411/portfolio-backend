import {
  Controller,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { UploadsService } from './uploads.service';
import type { UploadType } from './uploads.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../../entities/user';

const VALID_TYPES: UploadType[] = ['post', 'project', 'avatar'];

@ApiTags('uploads')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('uploads')
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Post('image')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: '이미지 업로드 (Supabase Storage)' })
  @ApiConsumes('multipart/form-data')
  @ApiQuery({ name: 'type', enum: ['post', 'project', 'avatar'], required: true })
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  async uploadImage(
    @UploadedFile() file: Express.Multer.File,
    @Query('type') type: UploadType,
    @CurrentUser() user: User,
  ) {
    if (!file) throw new BadRequestException('파일이 첨부되지 않았습니다.');
    if (!VALID_TYPES.includes(type)) {
      throw new BadRequestException(`type은 ${VALID_TYPES.join(', ')} 중 하나여야 합니다.`);
    }

    return this.uploadsService.uploadImage(file, user.id, type);
  }
}
