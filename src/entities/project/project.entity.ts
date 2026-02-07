import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('projects', { schema: 'portfolio' })
export class Project {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ type: 'text' })
  summary: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ name: 'thumbnail_url', nullable: true })
  thumbnailUrl: string;

  @Column({ name: 'demo_url', nullable: true })
  demoUrl: string;

  @Column({ name: 'github_url', nullable: true })
  githubUrl: string;

  @Column({ name: 'tech_stack', type: 'text', array: true, default: [] })
  techStack: string[];

  @Column({ type: 'text', array: true, default: [] })
  tags: string[];

  @Column({ default: 'completed' })
  status: string; // 'in-progress', 'completed', 'archived'

  @Column({ default: false })
  featured: boolean;

  @Column({ name: 'view_count', default: 0 })
  viewCount: number;

  @Column({ name: 'like_count', default: 0 })
  likeCount: number;

  @Column({ name: 'start_date', type: 'date', nullable: true })
  startDate: Date;

  @Column({ name: 'end_date', type: 'date', nullable: true })
  endDate: Date;

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
}
