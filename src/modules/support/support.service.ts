import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Ticket } from './entities/ticket.entity';
import { TicketMessage } from './entities/ticket-message.entity';
import { MailService } from '../../modules/mail/mail.service';

@Injectable()
export class SupportService {
  constructor(
    @InjectRepository(Ticket) private readonly ticketRepo: Repository<Ticket>,
    @InjectRepository(TicketMessage) private readonly messageRepo: Repository<TicketMessage>,
    private readonly mail: MailService,
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
    if (ticket.status === 'closed') throw new ForbiddenException('Ticket encerrado - abra um novo ticket para continuar.');
    const msg = this.messageRepo.create({ ticket_id: ticketId, user_id: userId, sender: 'user', message });
    await this.messageRepo.save(msg);
    await this.ticketRepo.update(ticketId, { updated_at: new Date() });
    return msg;
  }

  // Admin
  async adminListTickets(status?: 'open' | 'pending' | 'closed') {
    const where = status ? { status } : ({} as any);
    return this.ticketRepo.find({
      where,
      order: { updated_at: 'DESC' },
      relations: ['user'],
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        created_at: true,
        updated_at: true,
        user_id: true,
        user: { id: true, nome: true, sobrenome: true, email: true },
      } as any,
    });
  }

  async adminGetTicket(ticketId: string) {
    const ticket = await this.ticketRepo.findOne({
      where: { id: ticketId },
      relations: ['user'],
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        created_at: true,
        updated_at: true,
        user_id: true,
        user: { id: true, nome: true, sobrenome: true, email: true },
      } as any,
    });
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
    // Enviar email ao usuário notificando resposta
    try {
      const fresh = await this.ticketRepo.findOne({ where: { id: ticketId }, relations: ['user'], select: { id: true, user_id: true, user: { email: true, nome: true, sobrenome: true } } as any });
      const to = fresh?.user?.email;
      if (to) {
        await this.mail.sendTemplate({
          to,
          subject: 'Seu ticket foi respondido',
          template: 'notice' as any,
          variables: {
            app_name: 'Vizzion Bot',
            title: 'Atualização no seu ticket',
            message: `Seu ticket "${ticket.title}" recebeu uma nova resposta do suporte. Acesse a área de Suporte para continuar a conversa.`,
            year: new Date().getFullYear(),
          },
        });
      }
    } catch (e) {
      // apenas logar
      console.error('Falha ao enviar email de resposta de ticket:', e);
    }
    return msg;
  }

  async adminClose(ticketId: string) {
    const ticket = await this.ticketRepo.findOne({ where: { id: ticketId } });
    if (!ticket) throw new NotFoundException('Ticket não encontrado');
    await this.ticketRepo.update(ticketId, { status: 'closed', updated_at: new Date() });
    // Notificar encerramento
    try {
      const fresh = await this.ticketRepo.findOne({ where: { id: ticketId }, relations: ['user'], select: { id: true, user_id: true, user: { email: true, nome: true, sobrenome: true } } as any });
      const to = fresh?.user?.email;
      if (to) {
        await this.mail.sendTemplate({
          to,
          subject: 'Seu atendimento foi finalizado',
          template: 'notice' as any,
          variables: {
            app_name: 'Vizzion Bot',
            title: 'Atendimento finalizado',
            message: `Seu ticket "${ticket.title}" foi encerrado. Se precisar, abra um novo ticket em Suporte.`,
            year: new Date().getFullYear(),
          },
        });
      }
    } catch (e) {
      console.error('Falha ao enviar email de encerramento de ticket:', e);
    }
    return { ok: true };
  }
}


