import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateProjectUpdateDto {
  @ApiProperty({ description: '업데이트 제목', maxLength: 255 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @ApiProperty({ description: '업데이트 내용' })
  @IsString()
  @IsNotEmpty()
  content: string;
}
