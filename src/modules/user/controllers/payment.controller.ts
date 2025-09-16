import { Controller, Post, Get, Body, HttpException, HttpStatus, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PaymentService } from '../services/payment.service';
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
    private readonly configService: ConfigService
  ) {}

  @Post('create')
  @ApiOperation({ summary: 'Criar pagamento' })
  @ApiResponse({ status: 201, description: 'Pagamento criado com sucesso' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 404, description: 'Usuário não encontrado' })
  async createPayment(@Body() createPaymentDto: CreatePaymentDto) {
    console.log('🚀 Criando pagamento com PaymentService');
    console.log('📊 Dados recebidos:', JSON.stringify(createPaymentDto, null, 2));
    
    // Validar se userId foi fornecido
    if (!createPaymentDto.userId) {
      throw new HttpException('userId é obrigatório', HttpStatus.BAD_REQUEST);
    }
    
    // Usar o PaymentService para criar o pagamento
    return this.paymentService.createPayment(createPaymentDto.userId, createPaymentDto);
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
}
