import { Controller, Get, Post, Body, UseGuards, Req } from '@nestjs/common';
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

  @Post('claim')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Receber rendimento' })
  @ApiResponse({ status: 200, description: 'Rendimento recebido com sucesso' })
  @ApiResponse({ status: 400, description: 'Erro na solicitação' })
  async claimYield(@Req() req: any, @Body() body: { scheduleId: number }) {
    const userId = req.user.id;
    const { scheduleId } = body;
    
    console.log(`🎁 Usuário ${userId} solicitando rendimento para schedule ${scheduleId}`);
    
    return this.yieldService.claimYield(userId, scheduleId);
  }
} 