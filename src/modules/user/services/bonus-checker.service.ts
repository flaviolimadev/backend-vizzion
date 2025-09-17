import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { BonusService } from './bonus.service';

@Injectable()
export class BonusCheckerService {
  private readonly logger = new Logger(BonusCheckerService.name);

  constructor(private readonly bonusService: BonusService) {}

  @Cron('*/2 * * * *') // A cada 2 minutos
  async checkApprovedPayments() {
    try {
      this.logger.log('🎁 Verificando pagamentos aprovados para bonificação...');
      await this.bonusService.processApprovedPayments();
    } catch (error) {
      this.logger.error('❌ Erro no cron de bonificação:', error);
    }
  }
}
