import { Injectable, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const BUCKET = 'thumbnails';

export type UploadType = 'post' | 'project' | 'avatar';

@Injectable()
export class UploadsService {
  private readonly supabase: SupabaseClient;
  private readonly supabaseUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.supabaseUrl = this.configService.getOrThrow<string>('SUPABASE_URL');
    const serviceRoleKey = this.configService.getOrThrow<string>('SUPABASE_SERVICE_ROLE_KEY');
    this.supabase = createClient(this.supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });
  }

  async uploadImage(
    file: Express.Multer.File,
    userId: string,
    type: UploadType,
  ): Promise<{ url: string }> {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        `허용되지 않는 파일 형식입니다. 허용: ${ALLOWED_MIME_TYPES.join(', ')}`,
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException('파일 크기는 5MB를 초과할 수 없습니다.');
    }

    const ext = file.originalname.split('.').pop()?.toLowerCase() || 'jpg';
    const filename = `${type}/${userId}/${crypto.randomUUID()}.${ext}`;

    const { error } = await this.supabase.storage
      .from(BUCKET)
      .upload(filename, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });

    if (error) {
      throw new InternalServerErrorException(`이미지 업로드 실패: ${error.message}`);
    }

    const { data } = this.supabase.storage.from(BUCKET).getPublicUrl(filename);

    return { url: data.publicUrl };
  }
}
