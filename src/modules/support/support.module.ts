import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Ticket } from './entities/ticket.entity';
import { TicketMessage } from './entities/ticket-message.entity';
import { SupportService } from './support.service';
import { UserTicketsController } from './user-tickets.controller';
import { AdminTicketsController } from './admin-tickets.controller';
import { User } from '../user/entities/user.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Ticket, TicketMessage, User]),
    AuthModule,
  ],
  controllers: [UserTicketsController, AdminTicketsController],
  providers: [SupportService],
})
export class SupportModule {}


