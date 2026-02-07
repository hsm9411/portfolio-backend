import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('posts', { schema: 'portfolio' })
export class Post {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ type: 'text' })
  summary: string;

  @Column({ type: 'text' })
  content: string; // Markdown

  @Column({ name: 'thumbnail_url', nullable: true })
  thumbnailUrl: string;

  @Column()
  category: string; // 'tutorial', 'essay', 'review', 'news'

  @Column({ type: 'text', array: true, default: [] })
  tags: string[];

  @Column({ name: 'is_published', default: true })
  isPublished: boolean;

  @Column({ name: 'view_count', default: 0 })
  viewCount: number;

  @Column({ name: 'like_count', default: 0 })
  likeCount: number;

  @Column({ name: 'comment_count', default: 0 })
  commentCount: number;

  @Column({ name: 'reading_time', nullable: true })
  readingTime: number; // minutes

  // Denormalized author info
  @Column({ name: 'author_id', type: 'uuid' })
  authorId: string;

  @Column({ name: 'author_nickname' })
  authorNickname: string;

  @Column({ name: 'author_avatar_url', nullable: true })
  authorAvatarUrl: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'published_at', type: 'timestamptz', nullable: true })
  publishedAt: Date;
}
