import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('views', { schema: 'portfolio' })
export class View {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Polymorphic relationship
  @Column({ name: 'target_type' })
  targetType: string; // 'project' or 'post'

  @Column({ name: 'target_id', type: 'uuid' })
  targetId: string;

  @Column({ name: 'ip_address' })
  ipAddress: string;

  @Column({ name: 'user_agent', nullable: true })
  userAgent: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
