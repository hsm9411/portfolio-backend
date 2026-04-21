import { ApiProperty } from '@nestjs/swagger';

export class AuthResponseDto {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'JWT Access Token (15분)',
  })
  accessToken: string;

  @ApiProperty({
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    description: 'Refresh Token (7일, Redis 저장)',
  })
  refreshToken: string;

  @ApiProperty({
    example: {
      id: '123e4567-e89b-12d3-a456-426614174000',
      email: 'user@example.com',
      nickname: 'JohnDoe',
      avatarUrl: 'https://example.com/avatar.jpg',
      isAdmin: false,
    },
    description: '사용자 정보',
  })
  user: {
    id: string;
    email: string;
    nickname: string;
    avatarUrl: string | null;
    isAdmin: boolean;
  };
}

export class TokenResponseDto {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  accessToken: string;

  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  refreshToken: string;
}
