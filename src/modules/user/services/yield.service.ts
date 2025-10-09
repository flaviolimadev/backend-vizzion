import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { YieldSchedule } from '../entities/yield-schedule.entity';
import { User } from '../entities/user.entity';
import { Extrato } from '../entities/extrato.entity';
import { ExtratoType } from '../entities/extrato.entity';
import { Operation } from '../entities/operation.entity';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

export interface YieldScheduleDto {
  id: number;
  startTime: string;
  endTime: string;
  profitPercentage: number;
  active: boolean;
  orderIndex: number;
  collectionWindowMinutes: number;
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
    @InjectRepository(Operation)
    private operationRepository: Repository<Operation>,
    private readonly httpService: HttpService,
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
      collectionWindowMinutes: schedule.collection_window_minutes || 30,
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
      collectionWindowMinutes: schedule.collection_window_minutes || 30,
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

  private async saveOperation(userId: string, scheduleId: number): Promise<void> {
    try {
      // Buscar ativos da API
      const assetsResponse = await firstValueFrom(
        this.httpService.get('https://corretora-app.kl5dxx.easypanel.host/api/assets/active?limit=50')
      );
      const assetsData = assetsResponse.data;
      
      if (!assetsData.assets || assetsData.assets.length === 0) {
        console.warn('⚠️ Nenhum ativo disponível para salvar operação');
        return;
      }

      // Selecionar um ativo aleatório
      const randomIndex = Math.floor(Math.random() * assetsData.assets.length);
      const selectedAsset = assetsData.assets[randomIndex];

      // Buscar candles do ativo selecionado
      const candlesResponse = await firstValueFrom(
        this.httpService.get(
          `https://corretora-app.kl5dxx.easypanel.host/api/assets/${selectedAsset.id}/candles?timeframe=1m`
        )
      );
      const candlesData = candlesResponse.data;

      // Criar registro de operação
      const operation = this.operationRepository.create({
        userId: userId,
        assetId: selectedAsset.id,
        assetTicker: selectedAsset.ticker,
        assetDescription: selectedAsset.description,
        assetExchange: selectedAsset.exchange,
        assetSymbol: selectedAsset.symbol,
        assetType: selectedAsset.type,
        candlesData: candlesData.candles || [],
        yieldScheduleId: scheduleId,
        clickedAt: new Date(),
        operado: false,
      });

      await this.operationRepository.save(operation);
      
      console.log(`✅ Operação salva: Ativo ${selectedAsset.ticker} para usuário ${userId}`);
    } catch (error) {
      console.error('❌ Erro ao salvar operação:', error);
      // Não propagar o erro para não bloquear a coleta de rendimento
    }
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

      // OBS: Validação de janela no servidor desabilitada para evitar bloqueio por fuso horário.
      // A UI controla a disponibilidade por horário; aqui garantimos apenas idempotência diária.

      // Verificar se já foi coletado hoje (evitar problemas de timezone usando cast para date)
      const existingExtrato = await this.extratoRepository
        .createQueryBuilder('extrato')
        .where('extrato.user_id = :userId', { userId })
        .andWhere('extrato.type = :type', { type: ExtratoType.YIELD })
        .andWhere('extrato.description = :description', { description: `Rendimento ${schedule.start_time}-${schedule.end_time}` })
        .andWhere("extrato.created_at::date = CURRENT_DATE")
        .getOne();

      if (existingExtrato) {
        return { success: false, message: 'Rendimento já foi coletado hoje neste horário' };
      }

      // Calcular valor do rendimento
      const yieldAmount = await this.generateProfitForSchedule(scheduleId, user.balance_invest);
      
      if (yieldAmount <= 0) {
        return { success: false, message: 'Valor do rendimento inválido' };
      }

      // Não atualiza balance diretamente; cálculo do saldo passa a considerar extratos
      const currentBalance = await this.extratoRepository
        .createQueryBuilder('e')
        .select('COALESCE(SUM(e.amount),0)', 'total')
        .where('e.user_id = :userId', { userId })
        .andWhere('e.status = :status', { status: 1 })
        .andWhere('e.type IN (:...types)', { types: [ExtratoType.YIELD, ExtratoType.REFERRAL, ExtratoType.BONUS, ExtratoType.WITHDRAWAL] })
        .getRawOne()
        .then(r => Number(parseFloat(r?.total || '0').toFixed(2)));
      const newBalance = Number((currentBalance + yieldAmount).toFixed(2));

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

      // Salvar operação com ativo aleatório e candles
      await this.saveOperation(userId, scheduleId);

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