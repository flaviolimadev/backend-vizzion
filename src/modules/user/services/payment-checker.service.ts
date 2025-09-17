import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Pagamento, PaymentStatus } from '../entities/pagamento.entity';
import { User } from '../entities/user.entity';
import { ExtratoService } from './extrato.service';
import { ExtratoType } from '../entities/extrato.entity';

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
    private extratoService: ExtratoService,
  ) {
    this.apiKey = this.configService.get<string>('PAYMENT_API_KEY') || '';
    this.apiSecret = this.configService.get<string>('PAYMENT_API_SECRET') || '';
    this.baseUrl = this.configService.get<string>('PAYMENT_API_URL') || 'https://app.vizzionpay.com/api/v1';
  }

  @Cron('*/2 * * * *') // A cada 2 minutos
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
      } else {
        this.logger.log(`🔍 Encontrados ${pendingPayments.length} pagamentos pendentes`);

        for (const payment of pendingPayments) {
          // Verificar se o pagamento tem mais de 24 horas
          const now = new Date();
          const paymentTime = new Date(payment.created_at);
          const diffInHours = (now.getTime() - paymentTime.getTime()) / (1000 * 60 * 60);

          if (diffInHours > 24) {
            // Cancelar pagamento antigo
            await this.cancelOldPayment(payment);
          } else {
            // Verificar status normal do pagamento
            await this.checkPaymentStatus(payment);
          }
        }
      }

      // Processar pagamentos aprovados que ainda não foram processados
      await this.processApprovedPayments();

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
      this.logger.log(`🔍 API Key: ${this.apiKey ? '***' + this.apiKey.slice(-4) : 'NÃO DEFINIDA'}`);
      this.logger.log(`🔍 Base URL: ${this.baseUrl}`);

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'x-public-key': this.apiKey,
          'x-secret-key': this.apiSecret,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`❌ Erro na API VizzionPay para pagamento ${payment.id}: ${response.status} ${response.statusText}`);
        this.logger.error(`❌ Resposta da API: ${errorText}`);
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
        const balanceAntes = parseFloat((user.balance_invest || 0).toString());
        const novoBalanceInvest = balanceAntes + valorEmReais;
        
        await this.userRepository.update(user.id, {
          balance_invest: novoBalanceInvest
        });

        // Criar extrato do depósito
        await this.extratoService.createExtrato(
          user.id,
          ExtratoType.DEPOSIT,
          valorEmReais,
          `Depósito via ${payment.method || 'PIX'} - TXID: ${payment.txid}`,
          payment.id,
          'payment'
        );

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
        4: 1,     // Plano Iniciante (R$ 4,00)
        20: 2,    // Plano Iniciante (R$ 20,00)
        100: 3,   // Plano Intermediário (R$ 100,00)
        500: 4,   // Plano Avançado (R$ 500,00)
        1000: 5,  // Plano Profissional (R$ 1.000,00)
        2000: 6,  // Plano Expert (R$ 2.000,00)
        5000: 7,  // Plano Master (R$ 5.000,00)
        10000: 8, // Plano Elite (R$ 10.000,00)
        15000: 9, // Plano Premium (R$ 15.000,00)
        20000: 10 // Plano VIP (R$ 20.000,00)
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

      // Criar extrato da compra de licença
      await this.extratoService.createExtrato(
        user.id,
        ExtratoType.INVESTMENT,
        valorEmReais,
        `Compra de licença - Plano ${planoId} (R$ ${valorEmReais.toFixed(2)}) - TXID: ${payment.txid}`,
        payment.id,
        'payment'
      );

      this.logger.log(`🔑 Licença ativada: Plano ${planoId} (R$ ${valorEmReais.toFixed(2)}) | Usuário: ${user.nome}`);

    } catch (error) {
      this.logger.error(`❌ Erro ao ativar licença para usuário ${user.nome}:`, error);
    }
  }

  private async processApprovedPayments() {
    try {
      this.logger.log('🔄 Processando pagamentos aprovados...');
      
      // Buscar pagamentos com status APPROVED (1) que ainda não foram processados
      const approvedPayments = await this.pagamentoRepository.find({
        where: { status: PaymentStatus.APPROVED },
        relations: ['user']
      });

      if (approvedPayments.length === 0) {
        this.logger.log('✅ Nenhum pagamento aprovado encontrado');
        return;
      }

      this.logger.log(`🎁 Encontrados ${approvedPayments.length} pagamentos aprovados para processar`);

      for (const payment of approvedPayments) {
        // Verificar se o pagamento ainda está com status APPROVED (evitar processamento duplicado)
        const currentPayment = await this.pagamentoRepository.findOne({
          where: { id: payment.id, status: PaymentStatus.APPROVED }
        });

        if (!currentPayment) {
          this.logger.log(`⚠️ Pagamento ${payment.id} já foi processado por outro processo, pulando...`);
          continue;
        }

        // Atualizar status para CONFIRMED (2) ANTES de processar para evitar duplicação
        await this.pagamentoRepository.update(payment.id, {
          status: PaymentStatus.CONFIRMED,
          updated_at: new Date()
        });

        // Processar o pagamento
        await this.processCompletedPayment(payment);
        
        this.logger.log(`✅ Pagamento ${payment.id} processado e confirmado`);
      }

    } catch (error) {
      this.logger.error('❌ Erro ao processar pagamentos aprovados:', error);
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
