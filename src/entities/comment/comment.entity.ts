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

@Entity('comments')
@Index(['targetType', 'targetId'])
@Index(['parentId'])
export class Comment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Polymorphic 관계
  @Column({ type: 'enum', enum: TargetType })
  targetType: TargetType;

  @Column('uuid')
  targetId: string;

  @Column('text')
  content: string;

  // 작성자 (로그인 필수)
  @Column('uuid')
  userId: string;

  // 익명 여부 (Authenticated Anonymity)
  @Column({ default: false })
  isAnonymous: boolean;

  // 중첩 댓글 (Self-referencing)
  @Column('uuid', { nullable: true })
  parentId: string | null;

  @ManyToOne(() => Comment, { nullable: true })
  @JoinColumn({ name: 'parentId' })
  parent: Comment | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
