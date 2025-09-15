import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { YieldSchedule } from '../entities/yield-schedule.entity';

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
} 