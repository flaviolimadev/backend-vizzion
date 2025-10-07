import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('operations')
export class Operation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'asset_id', type: 'varchar', length: 255 })
  assetId: string;

  @Column({ name: 'asset_ticker', type: 'varchar', length: 50 })
  assetTicker: string;

  @Column({ name: 'asset_description', type: 'varchar', length: 255, nullable: true })
  assetDescription: string;

  @Column({ name: 'asset_exchange', type: 'varchar', length: 50, nullable: true })
  assetExchange: string;

  @Column({ name: 'asset_symbol', type: 'varchar', length: 100, nullable: true })
  assetSymbol: string;

  @Column({ name: 'asset_type', type: 'varchar', length: 50, nullable: true })
  assetType: string;

  @Column({ name: 'candles_data', type: 'jsonb' })
  candlesData: any[];

  @Column({ name: 'yield_schedule_id', type: 'int', nullable: true })
  yieldScheduleId: number;

  @Column({ name: 'clicked_at', type: 'timestamp' })
  clickedAt: Date;

  @Column({ name: 'operado', type: 'boolean', default: false })
  operado: boolean;

  @Column({ name: 'metadata', type: 'jsonb', nullable: true })
  metadata: {
    operationType?: 'buy' | 'sell';
    entryPrice?: number;
    exitPrice?: number;
    priceChange?: number;
    profit?: boolean;
    entryTime?: string;
    exitTime?: string;
    processedAt?: string;
  };

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

