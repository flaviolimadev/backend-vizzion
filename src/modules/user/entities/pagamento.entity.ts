import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';

export enum PaymentMethod {
  PIX = 'PIX',
  CRYPTO = 'CRYPTO',
  BONUS = 'BONUS'
}

export enum PaymentStatus {
  PENDING = 0,
  APPROVED = 1,
  CONFIRMED = 2,
  CANCELLED = 3
}

@Entity('pagamentos')
export class Pagamento {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  user_id: string;

  @Column({
    type: 'enum',
    enum: PaymentMethod,
    default: PaymentMethod.PIX
  })
  method: PaymentMethod;

  @Column({ nullable: true })
  txid: string; // Transaction ID da API externa

  @Column({
    type: 'int',
    default: PaymentStatus.PENDING
  })
  status: PaymentStatus;

  @Column({ type: 'int' })
  value: number; // Valor em centavos (100 = R$ 1,00)

  @Column({ type: 'text', nullable: true })
  pix_code: string | null; // Código PIX real da VizzionPay

  @Column({ type: 'text', nullable: true })
  pix_qrcode_url: string | null; // URL do QR Code

  @Column({ type: 'timestamp', nullable: true })
  pix_expiration: Date | null; // Data de expiração do PIX

  @Column({ type: 'text', nullable: true })
  description: string | null; // Descrição do pagamento

  @Column({ type: 'text', nullable: true })
  crypto_address: string | null; // Endereço da carteira crypto

  @Column({ type: 'varchar', length: 50, nullable: true })
  crypto_network: string | null; // Rede crypto (TRC-20, ERC-20, etc)

  @Column({ type: 'varchar', length: 50, nullable: true })
  crypto_type: string | null; // Tipo de crypto (USDT, BTC, etc)

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'user_id' })
  user?: User;
}
