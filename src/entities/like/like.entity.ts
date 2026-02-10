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

@Entity('likes')
@Index(['targetType', 'targetId', 'userId'], { unique: true })
export class Like {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Polymorphic 관계
  @Column({ type: 'enum', enum: LikeTargetType })
  targetType: LikeTargetType;

  @Column('uuid')
  targetId: string;

  @Column('uuid')
  userId: string;

  @CreateDateColumn()
  createdAt: Date;
}
