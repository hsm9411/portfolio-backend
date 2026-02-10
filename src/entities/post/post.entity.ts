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

  @Column({ default: 0 })
  viewCount: number;

  @Column({ default: 0 })
  likeCount: number;

  @Column()
  authorId: string;

  @Column()
  authorNickname: string;

  @Column({ nullable: true })
  authorAvatarUrl: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
