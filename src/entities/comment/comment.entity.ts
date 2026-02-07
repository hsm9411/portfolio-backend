import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('comments', { schema: 'portfolio' })
export class Comment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  content: string;

  // Polymorphic relationship
  @Column({ name: 'target_type' })
  targetType: string; // 'project' or 'post'

  @Column({ name: 'target_id', type: 'uuid' })
  targetId: string;

  // 대댓글 지원
  @Column({ name: 'parent_id', type: 'uuid', nullable: true })
  parentId: string;

  // 익명/로그인 구분
  @Column({ name: 'author_id', type: 'uuid', nullable: true })
  authorId: string;

  @Column({ name: 'author_nickname' })
  authorNickname: string;

  @Column({ name: 'author_email', nullable: true })
  authorEmail: string;

  @Column({ name: 'author_ip', nullable: true })
  authorIp: string;

  @Column({ name: 'is_deleted', default: false })
  isDeleted: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
