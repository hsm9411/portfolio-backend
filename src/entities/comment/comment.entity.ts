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
@Index(['target_type', 'target_id'])  // ✅ snake_case
@Index(['parent_id'])                  // ✅ snake_case
export class Comment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Polymorphic 관계
  @Column({ 
    name: 'target_type',
    type: 'enum', 
    enum: TargetType 
  })
  targetType: TargetType;

  @Column({ name: 'target_id', type: 'uuid' })
  targetId: string;

  @Column({ type: 'text' })
  content: string;

  // 작성자 (로그인 필수)
  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  // 익명 여부 (Authenticated Anonymity)
  @Column({ name: 'is_anonymous', default: false })
  isAnonymous: boolean;

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
