import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

/**
 * 사용자 Entity
 *
 * Supabase OAuth 통합:
 * - supabaseUserId: auth.users 테이블의 id와 연결
 * - provider: 인증 방식 (local, google, github, email)
 * - providerId: OAuth Provider의 고유 ID
 */
@Entity('users', { schema: 'portfolio' })
@Index(['email'], { unique: true })
@Index(['supabaseUserId'], { unique: true })
export class User {
  @ApiProperty({ description: '사용자 ID (UUID)' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'Supabase Auth User ID', required: false })
  @Column({ name: 'supabase_user_id', type: 'uuid', unique: true, nullable: true })
  supabaseUserId: string;

  @ApiProperty({ description: '이메일', example: 'user@example.com' })
  @Column({ unique: true })
  email: string;

  @ApiProperty({ description: '비밀번호 (해시)', required: false })
  @Column({ nullable: true })
  password: string;

  @ApiProperty({ description: '닉네임', example: 'JohnDoe' })
  @Column()
  nickname: string;

  @ApiProperty({ description: '프로필 이미지 URL', required: false })
  @Column({ name: 'avatar_url', nullable: true })
  avatarUrl: string;

  @ApiProperty({ description: '자기소개', required: false })
  @Column({ type: 'text', nullable: true })
  bio: string;

  @ApiProperty({ description: 'GitHub URL', required: false })
  @Column({ name: 'github_url', nullable: true })
  githubUrl: string;

  @ApiProperty({ description: 'LinkedIn URL', required: false })
  @Column({ name: 'linkedin_url', nullable: true })
  linkedinUrl: string;

  @ApiProperty({ description: 'Website URL', required: false })
  @Column({ name: 'website_url', nullable: true })
  websiteUrl: string;

  @ApiProperty({ description: '관리자 여부', default: false })
  @Column({ name: 'is_admin', default: false })
  isAdmin: boolean;

  @ApiProperty({
    description: '인증 방식',
    enum: ['local', 'google', 'github', 'email'],
    default: 'local',
  })
  @Column({ default: 'local' })
  provider: string;

  @ApiProperty({ description: 'OAuth Provider ID', required: false })
  @Column({ name: 'provider_id', nullable: true })
  providerId: string;

  @ApiProperty({ description: '생성일시' })
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ApiProperty({ description: '수정일시' })
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
