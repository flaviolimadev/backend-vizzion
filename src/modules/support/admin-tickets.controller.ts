import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { SupportService } from './support.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/admin.guard';

@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('admin/support/tickets')
export class AdminTicketsController {
  constructor(private readonly supportService: SupportService) {}

  @Get()
  async list(@Query('status') status?: 'open' | 'pending' | 'closed') {
    return this.supportService.adminListTickets(status);
  }

  @Get(':id')
  async detail(@Param('id') id: string) {
    return this.supportService.adminGetTicket(id);
  }

  @Post(':id/reply')
  async reply(@Param('id') id: string, @Body() body: { message: string }) {
    return this.supportService.adminReply(id, body.message);
  }

  @Post(':id/close')
  async close(@Param('id') id: string) {
    return this.supportService.adminClose(id);
  }
}


