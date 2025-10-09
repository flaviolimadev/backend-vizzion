import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { SupportService } from './support.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('support/tickets')
export class UserTicketsController {
  constructor(private readonly supportService: SupportService) {}

  @Get()
  async list(@Req() req: any) {
    return this.supportService.listMyTickets(String(req.user.id));
  }

  @Post()
  async create(@Req() req: any, @Body() body: { title: string; description: string }) {
    return this.supportService.createTicket(String(req.user.id), body.title, body.description);
  }

  @Get(':id')
  async detail(@Req() req: any, @Param('id') id: string) {
    return this.supportService.getTicket(String(req.user.id), id);
  }

  @Post(':id/messages')
  async send(@Req() req: any, @Param('id') id: string, @Body() body: { message: string }) {
    return this.supportService.sendMessageAsUser(String(req.user.id), id, body.message);
  }
}


