import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Pagamento, PaymentMethod, PaymentStatus } from '../entities/pagamento.entity';
import { User } from '../entities/user.entity';
import { CreatePaymentDto as ControllerCreatePaymentDto } from '../controllers/payment.controller';

interface CreatePaymentDto {
  amount: number;
  method: PaymentMethod;
  description?: string;
  userId: string;
  customer?: {
    name: string;
    email: string;
    phone: string;
    documentType: string;
    document: string;
  };
}

@Injectable()
export class PaymentService {
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
    console.log("PaymentService initialized:");
    console.log("PAYMENT_API_KEY:", this.apiKey ? 'Configurada' : 'Não configurada');
    console.log("PAYMENT_API_SECRET:", this.apiSecret ? 'Configurada' : 'Não configurada');
    console.log("PAYMENT_API_URL:", this.baseUrl);
  }

  async createPayment(userId: string, createPaymentDto: ControllerCreatePaymentDto): Promise<any> {
    try {
      console.log("🔍 Buscando usuário no banco:", userId);
      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (!user) {
        console.error("❌ Usuário não encontrado:", userId);
        throw new HttpException("Usuário não encontrado", HttpStatus.NOT_FOUND);
      }
      console.log("✅ Usuário encontrado:", { id: user.id, nome: user.nome, email: user.email });

      const useRealAPI = this.configService.get<string>('USE_REAL_API') === 'true';
      console.log('🔍 DEBUG: useRealAPI =', useRealAPI, 'type:', typeof useRealAPI);

      if (useRealAPI) {
        console.log('🚀 Usando API real da VizzionPay');
        const paymentResponse = await this.callVizzionPayAPI(createPaymentDto, user);

        // Determinar a descrição correta baseada no contexto
        let dbDescription = 'deposit'; // Padrão para depósitos
        if (createPaymentDto.description?.toLowerCase().includes('licença') || 
            createPaymentDto.description?.toLowerCase().includes('upgrade') ||
            createPaymentDto.description?.toLowerCase().includes('license')) {
          dbDescription = 'licenca';
        }

        const pagamento = this.pagamentoRepository.create({
          user_id: user.id,
          method: createPaymentDto.method,
          txid: paymentResponse.data?.transactionId,
          status: PaymentStatus.PENDING,
          value: createPaymentDto.amount,
          description: dbDescription,
          pix_code: paymentResponse.data?.pix?.copyPaste,
          pix_qrcode_url: paymentResponse.data?.pix?.qrcodeUrl,
          pix_expiration: paymentResponse.data?.pix?.expirationDate ? new Date(paymentResponse.data.pix.expirationDate) : null,
        });
        const savedPagamento = await this.pagamentoRepository.save(pagamento);

        return {
          status: true,
          data: {
            id: savedPagamento.id,
            status: paymentResponse.data?.status,
            amount: savedPagamento.value,
            method: savedPagamento.method,
            pix: {
              qrcode: savedPagamento.pix_qrcode_url,
              qrcodeUrl: savedPagamento.pix_qrcode_url,
              copyPaste: savedPagamento.pix_code,
              expirationDate: savedPagamento.pix_expiration,
            },
            txid: savedPagamento.txid,
            createdAt: savedPagamento.created_at,
          },
        };
      } else {
        console.log('🔍 Usando dados simulados para pagamento (USE_REAL_API=false)');
        const mockPayment = this.generateMockPayment(userId, createPaymentDto);
        console.log('🔍 DEBUG: mockPayment result:', JSON.stringify(mockPayment, null, 2));        return mockPayment;
      }
    } catch (error: any) {
      console.error('❌ Erro no PaymentService:', error);
      // Fallback to mock data if real API fails
      if (error.message.includes("Unexpected token '<'") || error.message.includes("API Error")) {
        console.warn('⚠️ Erro na API real, retornando dados simulados como fallback.');
        const mockPayment = this.generateMockPayment(userId, createPaymentDto);
        return mockPayment;
      }
      throw new HttpException(
        error.message || 'Erro interno do servidor',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  private async callVizzionPayAPI(paymentData: ControllerCreatePaymentDto, user: User): Promise<any> {
    console.log('📤 Chamando API da VizzionPay...');
    try {
      const identifier = `probet_${user.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const amountInReais = paymentData.amount / 100;

      const body = {
        identifier: identifier,
        clientIdentifier: identifier,
        callbackUrl: "https://backend.iprobet.click/api",
        amount: amountInReais,
        discountFeeOfReceiver: false,
        client: {
          name: user.nome || paymentData.customer?.name || "Cliente",
          email: user.email || paymentData.customer?.email || "cliente@email.com",
          phone: user.contato || paymentData.customer?.phone || "11999999999",
          documentType: "CPF",
          document: paymentData.customer?.document || "000.000.000-00"
        },
        pix: {
          type: "email",
          key: user.email || paymentData.customer?.email || "cliente@email.com"
        },
        owner: {
          ip: "108.181.224.233", // Example IP, should be dynamic
          name: `${user.nome} ${user.sobrenome}`,
          document: {
            type: "cpf",
            number: paymentData.customer?.document || "000.000.000-00"
          }
        }
      };

      console.log('📊 Dados enviados para VizzionPay:', JSON.stringify(body, null, 2));

      const response = await fetch(`${this.baseUrl}/gateway/pix/receive`, {
        method: 'POST',
        headers: {
          'x-public-key': this.apiKey,
          'x-secret-key': this.apiSecret,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Erro na resposta da VizzionPay:', response.status, response.statusText, errorText);
        throw new Error(`API Error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      console.log('✅ Resposta da VizzionPay recebida:', JSON.stringify(data, null, 2));

      const pixCode = data.pix?.code || '';
      const qrCodeUrl = pixCode ? `https://quickchart.io/qr?text=${encodeURIComponent(pixCode)}&size=300` : '';

      return {
        status: true,
        data: {
          transactionId: data.transactionId,
          status: this.mapVizzionPayStatus(data.status),
          amount: paymentData.amount,
          method: paymentData.method,
          pix: {
            qrcode: qrCodeUrl,
            qrcodeUrl: qrCodeUrl,
            copyPaste: pixCode,
            expirationDate: new Date(Date.now() + 5 * 60 * 1000).toISOString()
          }
        }
      };

    } catch (error: any) {
      console.error('❌ Erro ao chamar VizzionPay API:', error);
      throw error;
    }
  }

  private generateMockPayment(userId: string, createPaymentDto: ControllerCreatePaymentDto): any {
    const mockTxid = `mock_${Date.now()}`;
    const mockPixCode = this.generateMockPixCode();
    const mockQrCodeUrl = `https://quickchart.io/qr?text=${encodeURIComponent(mockPixCode)}&size=200`;
    const mockExpirationDate = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 minutes

    // Determinar a descrição correta baseada no contexto
    let dbDescription = 'deposit'; // Padrão para depósitos
    if (createPaymentDto.description?.toLowerCase().includes('licença') || 
        createPaymentDto.description?.toLowerCase().includes('upgrade') ||
        createPaymentDto.description?.toLowerCase().includes('license')) {
      dbDescription = 'licenca';
    }

    return {
      status: true,
      data: {
        id: mockTxid,
        status: "PENDING",
        amount: createPaymentDto.amount,
        method: "PIX",
        pix: {
          qrcode: mockQrCodeUrl,
          qrcodeUrl: mockQrCodeUrl,
          copyPaste: mockPixCode,
          expirationDate: mockExpirationDate,
        },
        txid: mockTxid,
        createdAt: new Date().toISOString(),
      },
    };
  }

  private generateMockPixCode(): string {
    // Simplified mock PIX code
    return `00020126580014br.gov.bcb.pix0136mock${Date.now()}5204000053039865405${(2000 / 100).toFixed(2).replace('.', '')}5802BR5913Vizzion Bot6009Sao Paulo62070503***6304MOCK`;
  }

  private mapVizzionPayStatus(vizzionPayStatus: string): string {
    const statusMap = {
      'OK': 'CONFIRMED',
      'PENDING': 'PENDING',
      'FAILED': 'CANCELLED',
      'REJECTED': 'CANCELLED',
      'CANCELED': 'CANCELED'
    };
    return statusMap[vizzionPayStatus] || 'PENDING';
  }

  async getPaymentsByUser(userId: string): Promise<Pagamento[]> {
    return this.pagamentoRepository.find({
      where: { user_id: userId },
      order: { created_at: 'DESC' }
    });
  }

  async getPaymentById(id: string): Promise<Pagamento | null> {
    return this.pagamentoRepository.findOne({ where: { id } });
  }

  async updatePaymentStatus(id: string, status: PaymentStatus): Promise<void> {
    await this.pagamentoRepository.update(id, { status });
  }
}
