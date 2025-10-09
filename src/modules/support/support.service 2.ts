import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Ticket } from './entities/ticket.entity';
import { TicketMessage } from './entities/ticket-message.entity';

@Injectable()
export class SupportService {
  constructor(
    @InjectRepository(Ticket) private readonly ticketRepo: Repository<Ticket>,
    @InjectRepository(TicketMessage) private readonly messageRepo: Repository<TicketMessage>,
  ) {}

  async createTicket(userId: string, title: string, description: string) {
    const ticket = this.ticketRepo.create({ user_id: userId, title, description, status: 'open' });
    await this.ticketRepo.save(ticket);
    return ticket;
  }

  async listMyTickets(userId: string) {
    return this.ticketRepo.find({ where: { user_id: userId }, order: { updated_at: 'DESC' } });
  }

  async getTicket(userId: string, ticketId: string) {
    const ticket = await this.ticketRepo.findOne({ where: { id: ticketId } });
    if (!ticket) throw new NotFoundException('Ticket não encontrado');
    if (ticket.user_id !== userId) throw new ForbiddenException('Sem acesso');
    const messages = await this.messageRepo.find({ where: { ticket_id: ticketId }, order: { created_at: 'ASC' } });
    return { ticket, messages };
  }

  async sendMessageAsUser(userId: string, ticketId: string, message: string) {
    const ticket = await this.ticketRepo.findOne({ where: { id: ticketId } });
    if (!ticket) throw new NotFoundException('Ticket não encontrado');
    if (ticket.user_id !== userId) throw new ForbiddenException('Sem acesso');
    const msg = this.messageRepo.create({ ticket_id: ticketId, user_id: userId, sender: 'user', message });
    await this.messageRepo.save(msg);
    await this.ticketRepo.update(ticketId, { updated_at: new Date() });
    return msg;
  }

  // Admin
  async adminListTickets(status?: 'open' | 'pending' | 'closed') {
    const where = status ? { status } : {} as any;
    return this.ticketRepo.find({ where, order: { updated_at: 'DESC' } });
  }

  async adminGetTicket(ticketId: string) {
    const ticket = await this.ticketRepo.findOne({ where: { id: ticketId } });
    if (!ticket) throw new NotFoundException('Ticket não encontrado');
    const messages = await this.messageRepo.find({ where: { ticket_id: ticketId }, order: { created_at: 'ASC' } });
    return { ticket, messages };
  }

  async adminReply(ticketId: string, message: string, adminUserId?: string) {
    const ticket = await this.ticketRepo.findOne({ where: { id: ticketId } });
    if (!ticket) throw new NotFoundException('Ticket não encontrado');
    const msg = this.messageRepo.create({ ticket_id: ticketId, user_id: adminUserId || null, sender: 'admin', message });
    await this.messageRepo.save(msg);
    await this.ticketRepo.update(ticketId, { status: 'pending', updated_at: new Date() });
    return msg;
  }

  async adminClose(ticketId: string) {
    const ticket = await this.ticketRepo.findOne({ where: { id: ticketId } });
    if (!ticket) throw new NotFoundException('Ticket não encontrado');
    await this.ticketRepo.update(ticketId, { status: 'closed', updated_at: new Date() });
    return { ok: true };
  }
}


