import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('webhook_logs')
export class WebhookLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50 })
  event: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  token: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  offerCode: string;

  @Column({ type: 'jsonb' })
  client: any;

  @Column({ type: 'jsonb' })
  transaction: any;

  @Column({ type: 'jsonb', nullable: true })
  subscription: any;

  @Column({ type: 'jsonb', nullable: true })
  orderItems: any;

  @Column({ type: 'jsonb', nullable: true })
  trackProps: any;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status: string; // pending, processed, failed

  @Column({ type: 'text', nullable: true })
  errorMessage: string;

  @Column({ type: 'int', default: 0 })
  retryCount: number;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}

