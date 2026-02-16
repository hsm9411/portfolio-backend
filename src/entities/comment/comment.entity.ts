import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

export enum TargetType {
  PROJECT = 'project',
  POST = 'post',
}

@Entity('comments', { schema: 'portfolio' })
@Index(['targetType', 'targetId'])
@Index(['parentId'])
export class Comment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Polymorphic 관계
  @Column({ 
    name: 'target_type',
    type: 'text'
  })
  targetType: TargetType;

  @Column({ name: 'target_id', type: 'uuid' })
  targetId: string;

  @Column({ type: 'text' })
  content: string;

  // 작성자 정보 (익명 댓글 지원)
  @Column({ name: 'author_id', type: 'uuid' })
  authorId: string;

  @Column({ name: 'author_nickname', type: 'text' })
  authorNickname: string;

  @Column({ name: 'author_email', type: 'text' })
  authorEmail: string;

  @Column({ name: 'author_ip', type: 'text' })
  authorIp: string;

  // 삭제 여부
  @Column({ name: 'is_deleted', type: 'boolean', default: false })
  isDeleted: boolean;

  // 중첩 댓글 (Self-referencing)
  @Column({ name: 'parent_id', type: 'uuid', nullable: true })
  parentId: string | null;

  @ManyToOne(() => Comment, { nullable: true })
  @JoinColumn({ name: 'parent_id' })
  parent: Comment | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
