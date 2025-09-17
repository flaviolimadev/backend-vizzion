import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';

export enum ExtratoType {
  DEPOSIT = 'deposit',
  WITHDRAWAL = 'withdrawal',
  INVESTMENT = 'investment',
  PROFIT = 'profit',
  REFERRAL = 'referral',
  BONUS = 'bonus',
  FEE = 'fee',
  REFUND = 'refund'
}

export enum ExtratoStatus {
  PENDING = 0,
  COMPLETED = 1,
  CANCELLED = 2
}

@Entity('extratos')
export class Extrato {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  user_id: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: ExtratoType.DEPOSIT
  })
  type: ExtratoType;

  @Column({
    type: 'int',
    default: ExtratoStatus.COMPLETED
  })
  status: ExtratoStatus;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  balance_before: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  balance_after: number;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  reference_id: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  reference_type: string | null;

  @Column({ type: 'text', nullable: true })
  metadata: string | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'user_id' })
  user?: User;
}
