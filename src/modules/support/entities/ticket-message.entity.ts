import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Ticket } from './ticket.entity';
import { User } from '../../user/entities/user.entity';

export type TicketMessageSender = 'user' | 'admin';

@Entity('ticket_messages')
export class TicketMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Ticket, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ticket_id' })
  ticket: Ticket;

  @Index()
  @Column('uuid')
  ticket_id: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'user_id' })
  user: User | null;

  @Index()
  @Column('uuid', { nullable: true })
  user_id: string | null;

  @Index()
  @Column({ type: 'varchar', length: 10 })
  sender: TicketMessageSender; // 'user' | 'admin'

  @Column({ type: 'text' })
  message: string;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updated_at: Date;
}


