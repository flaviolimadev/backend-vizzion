import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';

export enum SaqueStatus {
  PENDING = 0,
  PROCESSING = 1,
  COMPLETED = 2,
  CANCELLED = 3
}

export enum SaqueType {
  BALANCE = 'balance',
  BALANCE_INVEST = 'balance_invest'
}

export enum KeyType {
  CPF = 'cpf',
  EMAIL = 'email',
  CONTATO = 'contato',
  USDT = 'usdt'
}

@Entity('saques')
export class Saque {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  user_id: string;

  @Column({
    type: 'enum',
    enum: SaqueType,
    default: SaqueType.BALANCE
  })
  type: SaqueType;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number; // Valor solicitado pelo usuário

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  tax: number; // Taxa aplicada

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  final_amount: number; // Valor final após taxa

  @Column({
    type: 'int',
    default: SaqueStatus.PENDING
  })
  status: SaqueStatus;

  @Column({ type: 'varchar', length: 20, nullable: true })
  cpf: string | null; // CPF do usuário (opcional para USDT)

  @Column({
    type: 'enum',
    enum: KeyType
  })
  key_type: KeyType; // Tipo da chave (cpf, email, contato)

  @Column({ type: 'varchar', length: 100 })
  key_value: string; // Valor da chave (CPF, email ou contato)

  @Column({ type: 'text', nullable: true })
  notes: string | null; // Observações

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'user_id' })
  user?: User;
}
