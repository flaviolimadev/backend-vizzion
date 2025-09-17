import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Pagamento, PaymentStatus } from '../entities/pagamento.entity';
import { User } from '../entities/user.entity';

@Injectable()
export class PaymentCheckerService {
  private readonly logger = new Logger(PaymentCheckerService.name);
  private readonly apiKey: string;
  private readonly apiSecret: string;
  private readonly baseUrl: string;

  constructor(
    @InjectRepository(Pagamento)
    private pagamentoRepository: Repository<Pagamento>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private configService: ConfigService,
  ) {
    this.apiKey = this.configService.get<string>('PAYMENT_API_KEY') || '';
    this.apiSecret = this.configService.get<string>('PAYMENT_API_SECRET') || '';
    this.baseUrl = this.configService.get<string>('PAYMENT_API_URL') || 'https://app.vizzionpay.com/api/v1';
  }

  @Cron('*/30 * * * * *') // A cada 30 segundos
  async checkPendingPayments() {
    try {
      this.logger.log('🔄 Verificando pagamentos pendentes...');
      
      // Buscar pagamentos com status PENDING (0)
      const pendingPayments = await this.pagamentoRepository.find({
        where: { status: PaymentStatus.PENDING },
        relations: ['user']
      });

      if (pendingPayments.length === 0) {
        this.logger.log('✅ Nenhum pagamento pendente encontrado');
        return;
      }

      this.logger.log(`🔍 Encontrados ${pendingPayments.length} pagamentos pendentes`);

      for (const payment of pendingPayments) {
        // Verificar se o pagamento tem mais de 15 minutos
        const now = new Date();
        const paymentTime = new Date(payment.created_at);
        const diffInMinutes = (now.getTime() - paymentTime.getTime()) / (1000 * 60);

        if (diffInMinutes > 15) {
          // Cancelar pagamento antigo
          await this.cancelOldPayment(payment);
        } else {
          // Verificar status normal do pagamento
          await this.checkPaymentStatus(payment);
        }
      }

    } catch (error) {
      this.logger.error('❌ Erro ao verificar pagamentos pendentes:', error);
    }
  }

  private async checkPaymentStatus(payment: Pagamento) {
    try {
      if (!payment.txid) {
        this.logger.warn(`⚠️ Pagamento ${payment.id} não possui txid, pulando verificação`);
        return;
      }

      this.logger.log(`🔍 Verificando status do pagamento ${payment.id} - TXID: ${payment.txid}`);
      this.logger.log(`🔍 ClientIdentifier: ${payment.client_identifier}`);

      // Construir URL com parâmetros
      const url = new URL(`${this.baseUrl}/gateway/transactions`);
      url.searchParams.append('id', payment.txid);
      url.searchParams.append('clientIdentifier', payment.client_identifier || '');
      
      this.logger.log(`🔍 URL da verificação: ${url.toString()}`);

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'x-public-key': this.apiKey,
          'x-secret-key': this.apiSecret,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        this.logger.error(`❌ Erro na API VizzionPay para pagamento ${payment.id}: ${response.status} ${response.statusText}`);
        return;
      }

      const data = await response.json();
      this.logger.log(`📊 Status do pagamento ${payment.id}: ${data.status}`);

      // Atualizar status do pagamento baseado na resposta da API
      if (data.status === 'COMPLETED') {
        await this.updatePaymentStatus(payment, PaymentStatus.APPROVED);
        this.logger.log(`✅ Pagamento ${payment.id} confirmado como COMPLETED`);
      } else if (data.status === 'FAILED') {
        await this.updatePaymentStatus(payment, PaymentStatus.CANCELLED);
        this.logger.log(`❌ Pagamento ${payment.id} marcado como FAILED`);
      } else if (data.status === 'REFUNDED') {
        await this.updatePaymentStatus(payment, PaymentStatus.CANCELLED);
        this.logger.log(`🔄 Pagamento ${payment.id} marcado como REFUNDED`);
      } else {
        this.logger.log(`⏳ Pagamento ${payment.id} ainda ${data.status}`);
      }

    } catch (error) {
      this.logger.error(`❌ Erro ao verificar status do pagamento ${payment.id}:`, error);
    }
  }

  private async updatePaymentStatus(payment: Pagamento, newStatus: PaymentStatus) {
    try {
      await this.pagamentoRepository.update(payment.id, {
        status: newStatus,
        updated_at: new Date()
      });

      // Se o pagamento foi completado, processar o pagamento
      if (newStatus === PaymentStatus.APPROVED) {
        await this.processCompletedPayment(payment);
      }

    } catch (error) {
      this.logger.error(`❌ Erro ao atualizar status do pagamento ${payment.id}:`, error);
    }
  }

  private async processCompletedPayment(payment: Pagamento) {
    try {
      this.logger.log(`🔄 Processando pagamento completado ${payment.id}`);

      if (!payment.user) {
        this.logger.error(`❌ Usuário não encontrado para pagamento ${payment.id}`);
        return;
      }

      const user = payment.user;
      const valorEmReais = payment.value / 100; // Converter de centavos para reais

      if (payment.description === 'deposit') {
        // Processar depósito - adicionar ao balance_invest
        const novoBalanceInvest = (user.balance_invest || 0) + valorEmReais;
        
        await this.userRepository.update(user.id, {
          balance_invest: novoBalanceInvest
        });

        this.logger.log(`💰 Depósito processado: +R$ ${valorEmReais.toFixed(2)} | Novo saldo: R$ ${novoBalanceInvest.toFixed(2)} | Usuário: ${user.nome}`);

      } else if (payment.description === 'licenca') {
        // Processar licença - ativar licença correspondente
        await this.processLicenseActivation(user, payment, valorEmReais);

      } else {
        this.logger.warn(`⚠️ Descrição de pagamento desconhecida: ${payment.description} | Pagamento: ${payment.id}`);
      }

      this.logger.log(`✅ Pagamento ${payment.id} processado com sucesso para usuário ${user.nome}`);

    } catch (error) {
      this.logger.error(`❌ Erro ao processar pagamento completado ${payment.id}:`, error);
    }
  }

  private async processLicenseActivation(user: User, payment: Pagamento, valorEmReais: number) {
    try {
      // Mapear valor da licença para ID do plano
      const planMapping = {
        20: 1,    // Plano Básico
        50: 2,    // Plano Intermediário  
        100: 3,   // Plano Avançado
        200: 4,   // Plano Premium
        500: 5,   // Plano Elite
        1000: 6   // Plano VIP
      };

      const planoId = planMapping[valorEmReais];
      
      if (!planoId) {
        this.logger.warn(`⚠️ Valor de licença não mapeado: R$ ${valorEmReais} | Pagamento: ${payment.id}`);
        return;
      }

      // Atualizar plano do usuário
      await this.userRepository.update(user.id, {
        plano: planoId
      });

      this.logger.log(`🔑 Licença ativada: Plano ${planoId} (R$ ${valorEmReais.toFixed(2)}) | Usuário: ${user.nome}`);

    } catch (error) {
      this.logger.error(`❌ Erro ao ativar licença para usuário ${user.nome}:`, error);
    }
  }

  private async cancelOldPayment(payment: Pagamento) {
    try {
      const now = new Date();
      const paymentTime = new Date(payment.created_at);
      const diffInMinutes = (now.getTime() - paymentTime.getTime()) / (1000 * 60);

      this.logger.log(`⏰ Cancelando pagamento antigo: ${payment.id} | Tempo: ${diffInMinutes.toFixed(1)} minutos`);

      // Atualizar status para CANCELLED (3)
      await this.pagamentoRepository.update(payment.id, {
        status: PaymentStatus.CANCELLED,
        updated_at: new Date()
      });

      this.logger.log(`❌ Pagamento ${payment.id} cancelado por tempo expirado (${diffInMinutes.toFixed(1)} minutos)`);

    } catch (error) {
      this.logger.error(`❌ Erro ao cancelar pagamento antigo ${payment.id}:`, error);
    }
  }
}
