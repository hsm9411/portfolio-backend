import { IsEmail, IsNotEmpty, IsString, MinLength, MaxLength, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({
    example: 'user@example.com',
    description: '사용자 이메일',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    example: 'password123!',
    description: '비밀번호 (최소 8자)',
    minLength: 8,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password: string;

  @ApiProperty({
    example: 'JohnDoe',
    description: '사용자 닉네임',
    maxLength: 50,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  nickname: string;

  @ApiProperty({
    example: 'Full-stack developer',
    description: '자기소개',
    required: false,
  })
  @IsString()
  @IsOptional()
  bio?: string;

  @ApiProperty({
    example: 'https://github.com/username',
    description: 'GitHub URL',
    required: false,
  })
  @IsString()
  @IsOptional()
  githubUrl?: string;

  @ApiProperty({
    example: 'https://linkedin.com/in/username',
    description: 'LinkedIn URL',
    required: false,
  })
  @IsString()
  @IsOptional()
  linkedinUrl?: string;

  @ApiProperty({
    example: 'https://mywebsite.com',
    description: '웹사이트 URL',
    required: false,
  })
  @IsString()
  @IsOptional()
  websiteUrl?: string;
}
