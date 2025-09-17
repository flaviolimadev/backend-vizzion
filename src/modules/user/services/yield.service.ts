import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { YieldSchedule } from '../entities/yield-schedule.entity';
import { User } from '../entities/user.entity';
import { Extrato } from '../entities/extrato.entity';
import { ExtratoType } from '../entities/extrato.entity';

export interface YieldScheduleDto {
  id: number;
  startTime: string;
  endTime: string;
  profitPercentage: number;
  active: boolean;
  orderIndex: number;
}

@Injectable()
export class YieldService {
  constructor(
    @InjectRepository(YieldSchedule) 
    private yieldScheduleRepository: Repository<YieldSchedule>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Extrato)
    private extratoRepository: Repository<Extrato>,
  ) {}

  async getActiveSchedules(): Promise<YieldScheduleDto[]> {
    const schedules = await this.yieldScheduleRepository.find({
      where: { active: true },
      order: { order_index: 'ASC' },
    });

    return schedules.map(schedule => ({
      id: schedule.id,
      startTime: schedule.start_time,
      endTime: schedule.end_time,
      profitPercentage: Number(schedule.profit_percentage),
      active: schedule.active,
      orderIndex: schedule.order_index,
    }));
  }

  async getAllSchedules(): Promise<YieldScheduleDto[]> {
    const schedules = await this.yieldScheduleRepository.find({
      order: { order_index: 'ASC' },
    });

    return schedules.map(schedule => ({
      id: schedule.id,
      startTime: schedule.start_time,
      endTime: schedule.end_time,
      profitPercentage: Number(schedule.profit_percentage),
      active: schedule.active,
      orderIndex: schedule.order_index,
    }));
  }

  async generateProfitForSchedule(scheduleId: number, baseAmount: number): Promise<number> {
    // Buscar o schedule específico para obter o percentual fixo
    const schedule = await this.yieldScheduleRepository.findOne({ where: { id: scheduleId } });
    
    if (!schedule) return 0;
    
    const profitPercentage = Number(schedule.profit_percentage);
    
    // Usar percentual fixo (sem randomização)
    return Number((baseAmount * profitPercentage).toFixed(2));
  }

  async claimYield(userId: string, scheduleId: number): Promise<{ success: boolean; message: string; amount?: number }> {
    try {
      console.log(`🎁 Processando rendimento para usuário ${userId}, schedule ${scheduleId}`);
      
      // Buscar usuário
      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (!user) {
        return { success: false, message: 'Usuário não encontrado' };
      }

      // Verificar se tem saldo de investimento
      if (!user.balance_invest || user.balance_invest <= 0) {
        return { success: false, message: 'Saldo de investimento insuficiente' };
      }

      // Buscar schedule
      const schedule = await this.yieldScheduleRepository.findOne({ where: { id: scheduleId } });
      if (!schedule) {
        return { success: false, message: 'Horário de rendimento não encontrado' };
      }

      // Calcular valor do rendimento
      const yieldAmount = await this.generateProfitForSchedule(scheduleId, user.balance_invest);
      
      if (yieldAmount <= 0) {
        return { success: false, message: 'Valor do rendimento inválido' };
      }

      // Atualizar balance do usuário (não balance_invest)
      const currentBalance = parseFloat((user.balance || 0).toString());
      const newBalance = currentBalance + yieldAmount;
      
      await this.userRepository.update(userId, {
        balance: newBalance
      });

      // Criar extrato de rendimento
      const extrato = this.extratoRepository.create({
        user_id: userId,
        type: ExtratoType.YIELD,
        amount: yieldAmount,
        description: `Rendimento ${schedule.start_time}-${schedule.end_time}`,
        balance_before: currentBalance,
        balance_after: newBalance
      });

      await this.extratoRepository.save(extrato);

      console.log(`✅ Rendimento processado: R$ ${yieldAmount.toFixed(2)} adicionado ao balance do usuário ${userId}`);
      
      return { 
        success: true, 
        message: `Rendimento de R$ ${yieldAmount.toFixed(2)} recebido com sucesso!`,
        amount: yieldAmount
      };

    } catch (error) {
      console.error('❌ Erro ao processar rendimento:', error);
      return { success: false, message: 'Erro interno do servidor' };
    }
  }
} 