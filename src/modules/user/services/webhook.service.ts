import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WebhookLog } from '../entities/webhook-log.entity';
import { Pagamento } from '../entities/pagamento.entity';

interface VizzionPayWebhook {
  event: string;
  token?: string;
  offerCode?: string;
  client: {
    id: string;
    name: string;
    email: string;
    phone: string;
    cpf?: string;
    cnpj?: string;
    address?: any;
  };
  transaction: {
    id: string;
    identifier: string;
    status: string;
    paymentMethod: string;
    originalCurrency: string;
    originalAmount: number;
    currency: string;
    amount: number;
    exchangeRate?: number;
    createdAt: string;
    payedAt?: string;
    pixInformation?: any;
    pixMetadata?: any;
  };
  subscription?: any;
  orderItems?: any[];
  trackProps?: any;
}

@Injectable()
export class WebhookService {
  constructor(
    @InjectRepository(WebhookLog)
    private webhookLogRepository: Repository<WebhookLog>,
    @InjectRepository(Pagamento)
    private pagamentoRepository: Repository<Pagamento>,
  ) {}

  async processWebhook(webhookData: VizzionPayWebhook): Promise<{ status: string; message: string }> {
    let savedWebhook: WebhookLog | null = null;
    
    try {
      console.log('📞 Processando webhook da VizzionPay:', {
        event: webhookData.event,
        transactionId: webhookData.transaction.id,
        status: webhookData.transaction.status
      });

      // Salvar webhook no banco
      const webhookLog = this.webhookLogRepository.create({
        event: webhookData.event,
        token: webhookData.token,
        offerCode: webhookData.offerCode,
        client: webhookData.client,
        transaction: webhookData.transaction,
        subscription: webhookData.subscription,
        orderItems: webhookData.orderItems,
        trackProps: webhookData.trackProps,
        status: 'processing'
      });

      savedWebhook = await this.webhookLogRepository.save(webhookLog);

      // Processar baseado no evento
      switch (webhookData.event) {
        case 'TRANSACTION_CREATED':
          await this.handleTransactionCreated(webhookData);
          break;
        case 'TRANSACTION_PAID':
          await this.handleTransactionPaid(webhookData);
          break;
        case 'TRANSACTION_CANCELED':
          await this.handleTransactionCanceled(webhookData);
          break;
        case 'TRANSACTION_REFUNDED':
          await this.handleTransactionRefunded(webhookData);
          break;
        default:
          console.log(`⚠️ Evento não tratado: ${webhookData.event}`);
      }

      // Marcar como processado
      await this.webhookLogRepository.update(savedWebhook.id, {
        status: 'processed'
      });

      return {
        status: 'success',
        message: 'Webhook processado com sucesso'
      };

    } catch (error: any) {
      console.error('❌ Erro ao processar webhook:', error);
      
      // Marcar como falhou
      if (savedWebhook) {
        await this.webhookLogRepository.update(savedWebhook.id, {
          status: 'failed',
          errorMessage: error.message,
          retryCount: savedWebhook.retryCount + 1
        });
      }

      throw new HttpException(
        'Erro ao processar webhook',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  private async handleTransactionCreated(webhookData: VizzionPayWebhook): Promise<void> {
    console.log('🆕 Transação criada:', webhookData.transaction.id);
    // Implementar lógica para transação criada se necessário
  }

  private async handleTransactionPaid(webhookData: VizzionPayWebhook): Promise<void> {
    console.log('✅ Transação paga:', webhookData.transaction.id);
    
    // Buscar pagamento pelo identifier
    const pagamento = await this.pagamentoRepository.findOne({
      where: { txid: webhookData.transaction.identifier }
    });

    if (pagamento) {
      // Atualizar status do pagamento
      await this.pagamentoRepository.update(pagamento.id, {
        status: 'COMPLETED' as any,
        updated_at: new Date()
      });

      console.log(`✅ Pagamento ${pagamento.id} atualizado para COMPLETED`);
    } else {
      console.log(`⚠️ Pagamento não encontrado para identifier: ${webhookData.transaction.identifier}`);
    }
  }

  private async handleTransactionCanceled(webhookData: VizzionPayWebhook): Promise<void> {
    console.log('❌ Transação cancelada:', webhookData.transaction.id);
    
    const pagamento = await this.pagamentoRepository.findOne({
      where: { txid: webhookData.transaction.identifier }
    });

    if (pagamento) {
      await this.pagamentoRepository.update(pagamento.id, {
        status: 'CANCELED' as any,
        updated_at: new Date()
      });

      console.log(`❌ Pagamento ${pagamento.id} atualizado para CANCELED`);
    }
  }

  private async handleTransactionRefunded(webhookData: VizzionPayWebhook): Promise<void> {
    console.log('🔄 Transação estornada:', webhookData.transaction.id);
    
    const pagamento = await this.pagamentoRepository.findOne({
      where: { txid: webhookData.transaction.identifier }
    });

    if (pagamento) {
      await this.pagamentoRepository.update(pagamento.id, {
        status: 'REFUNDED' as any,
        updated_at: new Date()
      });

      console.log(`🔄 Pagamento ${pagamento.id} atualizado para REFUNDED`);
    }
  }

  async getWebhookLogs(limit: number = 50, offset: number = 0): Promise<WebhookLog[]> {
    return this.webhookLogRepository.find({
      order: { created_at: 'DESC' },
      take: limit,
      skip: offset
    });
  }
}
