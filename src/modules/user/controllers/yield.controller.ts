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

  @Get('system-status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Verificar status do sistema de trading' })
  @ApiResponse({ status: 200, description: 'Status do sistema retornado com sucesso' })
  async getSystemStatus() {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    
    // Trading sempre ativo
    const tradingBlocked = false;
    const message = 'Trading ativo';
    
    return {
      currentTime: now.toISOString(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      dayOfWeek,
      hours,
      minutes,
      isWeekend: false,
      isMondayMorning: false,
      tradingBlocked,
      message
    };
  }

  @Post('claim')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Receber rendimento' })
  @ApiResponse({ status: 200, description: 'Rendimento recebido com sucesso' })
  @ApiResponse({ status: 400, description: 'Erro na solicitação' })
  async claimYield(@Req() req: any, @Body() body: { scheduleId: number }) {
    try {
      // Trading sempre ativo - sem verificações de horário
      
      const userId = req.user.id;
      const { scheduleId } = body;
      
      console.log(`🎁 Usuário ${userId} solicitando rendimento para schedule ${scheduleId}`);
      console.log(`🔍 Request body:`, body);
      console.log(`🔍 User from JWT:`, req.user);
      
      const result = await this.yieldService.claimYield(userId, scheduleId);
      console.log(`✅ Resultado do claimYield:`, result);
      
      return result;
    } catch (error) {
      console.error('❌ Erro no controller claimYield:', error);
      return {
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      };
    }
  }
} 