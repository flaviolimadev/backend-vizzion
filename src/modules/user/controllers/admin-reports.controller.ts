import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AdminGuard } from '../../auth/admin.guard';
import { AdminReportsService } from '../services/admin-reports.service';

@ApiTags('Admin Reports')
@Controller('admin/reports')
@UseGuards(AdminGuard)
@ApiBearerAuth()
export class AdminReportsController {
  constructor(private readonly adminReportsService: AdminReportsService) {}

  @Get('deposits')
  @ApiOperation({ summary: 'Relatório de depósitos por período' })
  @ApiResponse({ status: 200, description: 'Relatório de depósitos gerado com sucesso' })
  async getDepositsReport(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.adminReportsService.getDepositsReport(startDate, endDate);
  }
}








