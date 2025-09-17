import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WebhookLog } from '../entities/webhook-log.entity';
import { Pagamento, PaymentStatus } from '../entities/pagamento.entity';
import { User } from '../entities/user.entity';
import { ExtratoService } from './extrato.service';
import { Extrato, ExtratoType } from '../entities/extrato.entity';

@Injectable()
export class WebhookPaymentProcessorService {
  private readonly logger = new Logger(WebhookPaymentProcessorService.name);

  constructor(
    @InjectRepository(WebhookLog)
    private webhookLogRepository: Repository<WebhookLog>,
    @InjectRepository(Pagamento)
    private pagamentoRepository: Repository<Pagamento>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Extrato)
    private extratoRepository: Repository<Extrato>,
    private extratoService: ExtratoService,
  ) {}

  @Cron('*/2 * * * *') // A cada 2 minutos
  async processWebhookPayments() {
    try {
      this.logger.log('🔄 Processando pagamentos via webhooks...');
      
      // Calcular data limite (24 horas atrás)
      const now = new Date();
      const twentyFourHoursAgo = new Date(now.getTime() - (24 * 60 * 60 * 1000));
      
      // Buscar webhooks com evento TRANSACTION_PAID que ainda não foram processados
      // e que foram criados há menos de 24 horas
      const paidWebhooks = await this.webhookLogRepository
        .createQueryBuilder('webhook')
        .where('webhook.event = :event', { event: 'TRANSACTION_PAID' })
        .andWhere('webhook.status = :status', { status: 'processed' })
        .andWhere('webhook.created_at > :dateLimit', { dateLimit: twentyFourHoursAgo })
        .orderBy('webhook.created_at', 'ASC')
        .getMany();

      if (paidWebhooks.length === 0) {
        this.logger.log('✅ Nenhum webhook TRANSACTION_PAID encontrado (últimas 24h)');
        return;
      }

      this.logger.log(`🔍 Encontrados ${paidWebhooks.length} webhooks TRANSACTION_PAID (últimas 24h)`);
      this.logger.log(`📅 Data limite: ${twentyFourHoursAgo.toISOString()}`);

      for (const webhook of paidWebhooks) {
        try {
          await this.processWebhookPayment(webhook);
        } catch (error) {
          this.logger.error(`❌ Erro ao processar webhook ${webhook.id}:`, error);
        }
      }

    } catch (error) {
      this.logger.error('❌ Erro ao processar pagamentos via webhooks:', error);
    }
  }

  private async processWebhookPayment(webhook: WebhookLog) {
    try {
      const transactionId = webhook.transaction?.id;
      
      if (!transactionId) {
        this.logger.warn(`⚠️ Webhook ${webhook.id} não possui transaction.id`);
        return;
      }

      this.logger.log(`🔍 Processando webhook ${webhook.id} - Transaction ID: ${transactionId}`);

      // Buscar pagamento pelo txid (que deve ser igual ao transaction.id)
      const pagamento = await this.pagamentoRepository.findOne({
        where: { txid: transactionId },
        relations: ['user']
      });

      if (!pagamento) {
        this.logger.warn(`⚠️ Pagamento não encontrado para transaction ID: ${transactionId}`);
        return;
      }

      // Verificar se o pagamento está com status PENDING (0)
      if (pagamento.status !== PaymentStatus.PENDING) {
        this.logger.log(`⚠️ Pagamento ${pagamento.id} já foi processado (status: ${pagamento.status}), pulando...`);
        return;
      }

      this.logger.log(`✅ Pagamento encontrado: ${pagamento.id} | Status: ${pagamento.status} | Descrição: ${pagamento.description}`);

      // Verificar se já existe extrato para este pagamento (evita duplicação)
      const existingExtrato = await this.extratoRepository.findOne({
        where: {
          reference_id: pagamento.id,
          type: pagamento.description === 'deposit' ? ExtratoType.DEPOSIT : ExtratoType.INVESTMENT
        }
      });

      if (existingExtrato) {
        this.logger.log(`⚠️ Pagamento ${pagamento.id} já foi processado (extrato encontrado), pulando...`);
        // Atualizar status para CONFIRMED mesmo assim
        await this.pagamentoRepository.update(pagamento.id, {
          status: PaymentStatus.CONFIRMED,
          updated_at: new Date()
        });
        return;
      }

      // Usar uma transação atômica para evitar processamento duplicado
      await this.pagamentoRepository.manager.transaction(async (transactionalEntityManager) => {
        // Verificar e atualizar o status em uma única operação atômica
        const updateResult = await transactionalEntityManager.update(
          Pagamento,
          { 
            id: pagamento.id, 
            status: PaymentStatus.PENDING 
          },
          { 
            status: PaymentStatus.CONFIRMED,
            updated_at: new Date()
          }
        );

        // Se nenhuma linha foi afetada, significa que outro processo já processou
        if (updateResult.affected === 0) {
          this.logger.log(`⚠️ Pagamento ${pagamento.id} já foi processado por outro processo, pulando...`);
          return;
        }

        this.logger.log(`🔄 Processando pagamento ${pagamento.id}...`);
        
        // Processar o pagamento
        await this.processCompletedPayment(pagamento);
        
        this.logger.log(`✅ Pagamento ${pagamento.id} processado e confirmado via webhook`);
      });

    } catch (error) {
      this.logger.error(`❌ Erro ao processar webhook payment ${webhook.id}:`, error);
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
}
