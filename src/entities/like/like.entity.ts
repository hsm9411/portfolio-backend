import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('likes', { schema: 'portfolio' })
export class Like {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Polymorphic relationship
  @Column({ name: 'target_type' })
  targetType: string; // 'project', 'post', 'comment'

  @Column({ name: 'target_id', type: 'uuid' })
  targetId: string;

  // 로그인/익명 구분
  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId: string;

  @Column({ name: 'ip_address', nullable: true })
  ipAddress: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
