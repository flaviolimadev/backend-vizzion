import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { Pagamento, PaymentStatus } from '../entities/pagamento.entity';
import { Extrato, ExtratoType } from '../entities/extrato.entity';

@Injectable()
export class BonusService {
  private readonly logger = new Logger(BonusService.name);

  // Percentuais de bonificação para licenças
  private readonly licenseBonusPercentages = [
    15,  // 1º Nível
    5,   // 2º Nível
    3,   // 3º Nível
    2,   // 4º Nível
    1,   // 5º Nível
    1,   // 6º Nível
    1,   // 7º Nível
    1,   // 8º Nível
    0.5, // 9º Nível
    0.5  // 10º Nível
  ];

  // Percentuais de bonificação para depósitos
  private readonly depositBonusPercentages = [
    5,   // 1º Nível
    2,   // 2º Nível
    1,   // 3º Nível
    1,   // 4º Nível
    1    // 5º Nível
  ];

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Pagamento)
    private pagamentoRepository: Repository<Pagamento>,
    @InjectRepository(Extrato)
    private extratoRepository: Repository<Extrato>,
  ) {}

  async processApprovedPayments() {
    try {
      this.logger.log('🎁 Processando pagamentos confirmados para bonificação...');
      
      // Buscar pagamentos com status CONFIRMED (2) que ainda não foram bonificados
      const confirmedPayments = await this.pagamentoRepository.find({
        where: { 
          status: PaymentStatus.CONFIRMED,
          bonus_processed: false
        },
        relations: ['user']
      });

      if (confirmedPayments.length === 0) {
        this.logger.log('✅ Nenhum pagamento confirmado encontrado');
        return;
      }

      this.logger.log(`🎁 Encontrados ${confirmedPayments.length} pagamentos confirmados`);

      for (const payment of confirmedPayments) {
        await this.processPaymentBonus(payment);
      }

    } catch (error) {
      this.logger.error('❌ Erro ao processar pagamentos confirmados:', error);
    }
  }

  private async processPaymentBonus(payment: Pagamento) {
    try {
      if (!payment.user) {
        this.logger.error(`❌ Usuário não encontrado para pagamento ${payment.id}`);
        return;
      }

      // Verificar se o pagamento já foi bonificado
      const currentPayment = await this.pagamentoRepository.findOne({
        where: { id: payment.id, bonus_processed: false }
      });

      if (!currentPayment) {
        this.logger.log(`⚠️ Pagamento ${payment.id} já foi bonificado, pulando...`);
        return;
      }

      const user = payment.user;
      const valorEmReais = payment.value / 100; // Converter de centavos para reais

      this.logger.log(`🎁 Processando bonificação para pagamento ${payment.id} - Usuário: ${user.nome} - Valor: R$ ${valorEmReais.toFixed(2)}`);

      // Buscar árvore de indicações
      const referralTree = await this.getReferralTree(user.id);
      
      if (referralTree.length === 0) {
        this.logger.log(`ℹ️ Usuário ${user.nome} não possui indicações`);
        await this.markPaymentAsProcessed(payment);
        return;
      }

      // Determinar percentuais baseado no tipo de pagamento
      const percentages = payment.description === 'licenca' 
        ? this.licenseBonusPercentages 
        : this.depositBonusPercentages;

      // Processar bonificações para cada nível
      for (let level = 0; level < Math.min(referralTree.length, percentages.length); level++) {
        const referrer = referralTree[level];
        const percentage = percentages[level];
        const bonusAmount = (valorEmReais * percentage) / 100;

        this.logger.log(`🔍 Nível ${level + 1}: ${referrer.nome} - ${percentage}% de R$ ${valorEmReais.toFixed(2)} = R$ ${bonusAmount.toFixed(2)}`);

        if (bonusAmount > 0) {
          await this.giveBonus(referrer, bonusAmount, payment, level + 1);
        }
      }

      // Marcar pagamento como processado (status 2)
      await this.markPaymentAsProcessed(payment);

      this.logger.log(`✅ Bonificação processada para pagamento ${payment.id}`);

    } catch (error) {
      this.logger.error(`❌ Erro ao processar bonificação do pagamento ${payment.id}:`, error);
    }
  }

  private async getReferralTree(userId: string): Promise<User[]> {
    const tree: User[] = [];
    let currentUserId = userId;

    // Buscar até 10 níveis de indicação
    for (let level = 0; level < 10; level++) {
      const user = await this.userRepository.findOne({
        where: { id: currentUserId },
        select: ['id', 'nome', 'email', 'referred_at', 'balance_invest']
      });

      if (!user || !user.referred_at) {
        break;
      }

      // Buscar o usuário que indicou
      const referrer = await this.userRepository.findOne({
        where: { id: user.referred_at },
        select: ['id', 'nome', 'email', 'referred_at', 'balance_invest']
      });

      if (!referrer) {
        break;
      }

      tree.push(referrer);
      currentUserId = referrer.id;
    }

    return tree;
  }

  private async giveBonus(referrer: User, amount: number, payment: Pagamento, level: number) {
    try {
      // Atualizar saldo do usuário
      const currentBalance = parseFloat((referrer.balance || 0).toString());
      const newBalance = currentBalance + amount;
      
      this.logger.log(`💰 ${referrer.nome}: Saldo atual R$ ${currentBalance.toFixed(2)} + Bonificação R$ ${amount.toFixed(2)} = Novo saldo R$ ${newBalance.toFixed(2)}`);
      
      await this.userRepository.update(referrer.id, {
        balance: newBalance
      });

      // Criar extrato da bonificação
      const bonusType = payment.description === 'licenca' ? ExtratoType.REFERRAL : ExtratoType.BONUS;
      const description = payment.description === 'licenca' 
        ? `Bonificação de indicação - Licença - Nível ${level}`
        : `Bonificação de indicação - Depósito - Nível ${level}`;

      await this.extratoRepository.save({
        user_id: referrer.id,
        type: bonusType,
        amount: amount,
        description: description,
        reference_id: payment.id,
        reference_type: 'payment_bonus',
        status: 1, // COMPLETED
        balance_before: currentBalance,
        balance_after: newBalance
      });

      this.logger.log(`💰 Bonificação de R$ ${amount.toFixed(2)} para ${referrer.nome} (Nível ${level})`);

    } catch (error) {
      this.logger.error(`❌ Erro ao dar bonificação para ${referrer.nome}:`, error);
    }
  }

  private async markPaymentAsProcessed(payment: Pagamento) {
    try {
      await this.pagamentoRepository.update(payment.id, {
        bonus_processed: true,
        updated_at: new Date()
      });

      this.logger.log(`✅ Pagamento ${payment.id} marcado como bonificado`);

    } catch (error) {
      this.logger.error(`❌ Erro ao marcar pagamento ${payment.id} como bonificado:`, error);
    }
  }
}
