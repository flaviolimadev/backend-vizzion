import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('planos')
export class Plano {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', unique: true })
  valor: number;

  @Column({ type: 'varchar', length: 255 })
  descricao: string;

  @Column({ type: 'int' })
  maxDeposito: number;

  @Column({ type: 'boolean', default: false })
  popular: boolean;

  @Column({ type: 'boolean', default: true })
  ativo: boolean;

  @Column({ type: 'int', default: 0 })
  ordem: number;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
} 