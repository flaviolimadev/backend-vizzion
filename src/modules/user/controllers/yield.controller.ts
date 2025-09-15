import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { YieldService, YieldScheduleDto } from '../services/yield.service';

@ApiTags('Yield')
@Controller('yield')
export class YieldController {
  constructor(private readonly yieldService: YieldService) {}

  @Get('schedule')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obter horários ativos de rendimentos' })
  @ApiResponse({ status: 200, description: 'Lista de horários de rendimentos ativos' })
  async getYieldSchedule(): Promise<YieldScheduleDto[]> {
    return this.yieldService.getActiveSchedules();
  }

  @Get('schedule/all')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obter todos os horários de rendimentos (admin)' })
  @ApiResponse({ status: 200, description: 'Lista completa de horários de rendimentos' })
  async getAllYieldSchedules(): Promise<YieldScheduleDto[]> {
    return this.yieldService.getAllSchedules();
  }
} 