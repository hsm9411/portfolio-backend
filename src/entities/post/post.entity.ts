import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('posts')
@Index(['slug'], { unique: true })
// GIN 인덱스는 마이그레이션으로 생성: CREATE INDEX idx_posts_tags ON posts USING GIN (tags);
@Index('idx_posts_tags', { synchronize: false })
export class Post {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  slug: string;

  @Column()
  title: string;

  @Column('text')
  content: string;

  @Column({ nullable: true })
  summary: string;

  @Column('text', { array: true, default: [] })
  tags: string[];

  @Column({ name: 'view_count', default: 0 })
  viewCount: number;

  @Column({ name: 'like_count', default: 0 })
  likeCount: number;

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
}
