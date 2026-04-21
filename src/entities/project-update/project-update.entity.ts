import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Project } from '../project/project.entity';

export enum UpdateType {
  MANUAL = 'MANUAL',
  GITHUB_PR = 'GITHUB_PR',
}

@Entity('project_updates')
@Index(['projectId'])
@Index(['createdAt'])
export class ProjectUpdate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'project_id', type: 'uuid' })
  projectId: string;

  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @Column({ name: 'update_type', default: UpdateType.MANUAL })
  updateType: UpdateType;

  @Column({ length: 255 })
  title: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ name: 'external_url', length: 255, nullable: true })
  externalUrl: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
