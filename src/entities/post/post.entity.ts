import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('posts', { schema: 'portfolio' })
@Index('idx_posts_tags', { synchronize: false })
export class Post {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column('text')
  summary: string;

  @Column('text')
  content: string;

  @Column({ name: 'thumbnail_url', nullable: true })
  thumbnailUrl: string;

  @Column()
  category: string; // 'tutorial', 'essay', 'review', 'news'

  @Column('text', { array: true, default: [] })
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
  readingTime: number;

  @Column({ name: 'author_id' })
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
