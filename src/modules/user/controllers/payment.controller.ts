import { Controller, Post, Get, Body, HttpException, HttpStatus, UseGuards, Req, Param, Query } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PaymentService } from '../services/payment.service';
import { WebhookService } from '../services/webhook.service';
import { ConfigService } from '@nestjs/config';
import { PaymentMethod } from '../entities/pagamento.entity';

export interface CreatePaymentDto {
  amount: number;
  method: PaymentMethod;
  description?: string;
  userId?: string;
  customer?: {
    name: string;
    email: string;
    phone: string;
    documentType: string;
    document: string;
  };
}

@ApiTags('Payments')
@Controller('payments')
export class PaymentController {
  constructor(
    private readonly paymentService: PaymentService,
    private readonly webhookService: WebhookService,
    private readonly configService: ConfigService
  ) {}

  @Post('create')
  @ApiOperation({ summary: 'Criar pagamento' })
  @ApiResponse({ status: 201, description: 'Pagamento criado com sucesso' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 404, description: 'Usuário não encontrado' })
  async createPayment(@Body() createPaymentDto: CreatePaymentDto) {
    console.log(`🚀 Criando pagamento - R$ ${(createPaymentDto.amount / 100).toFixed(2)} | ${createPaymentDto.method}`);
    
    // Validar se userId foi fornecido
    if (!createPaymentDto.userId) {
      throw new HttpException('userId é obrigatório', HttpStatus.BAD_REQUEST);
    }
    
    // Usar o PaymentService para criar o pagamento
    return this.paymentService.createPayment(createPaymentDto.userId, createPaymentDto);
  }

  @Post('create-usdt')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Criar pagamento USDT TRC20' })
  @ApiResponse({ status: 201, description: 'Pagamento USDT criado com sucesso' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  async createUsdtPayment(@Req() req: any, @Body() body: { amount: number; description?: string }) {
    console.log(`🚀 createUsdtPayment controller: userId=${req.user.sub}, amount=${body.amount}, description=${body.description}`);
    return this.paymentService.createUsdtPayment(req.user.sub, body.amount, body.description);
  }

  @Get('pending')
  
  @ApiOperation({ summary: 'Buscar pagamentos pendentes do usuário' })
  @ApiResponse({ status: 200, description: 'Pagamentos pendentes retornados com sucesso' })
  async getPendingPayments(@Req() req: any) {
    const userId = "2eaad0dd-1ebd-4d75-8d3a-053d881fc2ab";
    if (!userId) {
      throw new HttpException('Usuário não autenticado', HttpStatus.UNAUTHORIZED);
    }
    
    const payments = await this.paymentService.getPaymentsByUser(userId);
    // Filtrar apenas pagamentos pendentes (status 0)
    const pendingPayments = payments.filter(payment => payment.status === 0);
    
    return {
      status: true,
      data: pendingPayments
    };
  }

  @Post('test')
  @ApiOperation({ summary: 'Teste de pagamento' })
  @ApiResponse({ status: 200, description: 'Teste executado com sucesso' })
  async testPayment() {
    return {
      status: 'success',
      message: 'Endpoint de teste funcionando',
      timestamp: new Date().toISOString()
    };
  }

  @Get('status/:id')
  @ApiOperation({ summary: 'Consultar status do pagamento por ID público' })
  @ApiResponse({ status: 200, description: 'Status retornado com sucesso' })
  @ApiResponse({ status: 404, description: 'Pagamento não encontrado' })
  async getPaymentStatus(@Param('id') id: string) {
    // IDs mock_ são usados quando a API real não está ativa; retornar pendente para permitir polling do front
    if (id && id.startsWith('mock_')) {
      return { status: 'pending' };
    }

    // Para IDs reais, retornar 404 até haver método específico no service
    throw new HttpException('Pagamento não encontrado', HttpStatus.NOT_FOUND);
  }

  @Post('webhook')
  @ApiOperation({ summary: 'Webhook da VizzionPay' })
  @ApiResponse({ status: 200, description: 'Webhook processado com sucesso' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 500, description: 'Erro interno do servidor' })
  async handleWebhook(@Body() webhookData: any) {
    console.log('📞 Webhook recebido da VizzionPay:', {
      event: webhookData.event,
      transactionId: webhookData.transaction?.id,
      status: webhookData.transaction?.status
    });

    try {
      const result = await this.webhookService.processWebhook(webhookData);
      return result;
    } catch (error: any) {
      console.error('❌ Erro ao processar webhook:', error);
      throw new HttpException(
        error.message || 'Erro ao processar webhook',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('webhook-logs')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Listar logs de webhooks' })
  @ApiResponse({ status: 200, description: 'Logs retornados com sucesso' })
  async getWebhookLogs(
    @Query('limit') limit: string = '50',
    @Query('offset') offset: string = '0'
  ) {
    const limitNum = parseInt(limit, 10) || 50;
    const offsetNum = parseInt(offset, 10) || 0;
    
    return this.webhookService.getWebhookLogs(limitNum, offsetNum);
  }
}
