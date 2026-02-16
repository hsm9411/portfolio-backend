import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export enum LikeTargetType {
  PROJECT = 'project',
  POST = 'post',
}

@Entity('likes', { schema: 'portfolio' })
@Index(['targetType', 'targetId', 'userId'], { unique: true })
export class Like {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Polymorphic 관계
  @Column({ 
    name: 'target_type',
    type: 'enum', 
    enum: LikeTargetType 
  })
  targetType: LikeTargetType;

  @Column({ name: 'target_id', type: 'uuid' })
  targetId: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
