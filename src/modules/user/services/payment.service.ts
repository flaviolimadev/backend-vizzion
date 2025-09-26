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
    console.log("💳 PaymentService initialized");
  }

  async createPayment(userId: string, createPaymentDto: ControllerCreatePaymentDto): Promise<any> {
    try {
      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (!user) {
        console.error("❌ Usuário não encontrado:", userId);
        throw new HttpException("Usuário não encontrado", HttpStatus.NOT_FOUND);
      }

      console.log('🔍 Chamando API VizzionPay...');
      const paymentResponse = await this.callVizzionPayAPI(createPaymentDto, user);
      console.log('✅ Resposta da API:', paymentResponse);

        // Determinar a descrição correta baseada no contexto
        let dbDescription = 'deposit'; // Padrão para depósitos
        if (createPaymentDto.description?.toLowerCase().includes('licença') || 
            createPaymentDto.description?.toLowerCase().includes('upgrade') ||
            createPaymentDto.description?.toLowerCase().includes('license') ||
            createPaymentDto.description?.toLowerCase().includes('licenca')) {
          dbDescription = 'licenca';
        }

        const pagamento = this.pagamentoRepository.create({
          user_id: user.id,
          method: createPaymentDto.method,
          txid: paymentResponse.data?.transactionId,
          client_identifier: paymentResponse.data?.clientIdentifier || `probet_${user.id}_${Date.now()}`,
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
    } catch (error: any) {
      console.error('❌ Erro no PaymentService:', error.message);
      throw new HttpException(
        error.message || 'Erro interno do servidor',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  private async callVizzionPayAPI(paymentData: ControllerCreatePaymentDto, user: User): Promise<any> {
    console.log('📤 Criando pagamento PIX...');
    console.log('🔍 API Key:', this.apiKey ? '***' + this.apiKey.slice(-4) : 'NÃO DEFINIDA');
    console.log('🔍 API Secret:', this.apiSecret ? '***' + this.apiSecret.slice(-4) : 'NÃO DEFINIDA');
    console.log('🔍 Base URL:', this.baseUrl);
    try {
      const identifier = `probet_${user.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const amountInReais = paymentData.amount / 100;

      const formatCpf = (value?: string): string => {
        if (!value) return '000.000.000-00';
        const digits = value.replace(/\D/g, '');
        if (digits.length !== 11) return '000.000.000-00';
        return `${digits.slice(0,3)}.${digits.slice(3,6)}.${digits.slice(6,9)}-${digits.slice(9)}`;
      };

      const customerDocument = formatCpf(paymentData.customer?.document);

      const body = {
        identifier: identifier,
        clientIdentifier: identifier,
        callbackUrl: "https://backend.vizzionbot.pro/payments/webhook",
        amount: amountInReais,
        discountFeeOfReceiver: false,
        client: {
          name: user.nome || paymentData.customer?.name || "Cliente",
          email: user.email || paymentData.customer?.email || "cliente@email.com",
          phone: "41997208398",
          documentType: "CPF",
          document: customerDocument
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
            number: customerDocument
          }
        }
      };

      // Log simplificado dos dados enviados
      console.log(`💰 Valor: R$ ${amountInReais} | Cliente: ${user.nome} | Email: ${user.email}`);

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
      console.log(`✅ PIX criado - ID: ${data.transactionId} | Status: ${data.status}`);
      console.log(`🔍 TXID da API: ${data.transactionId}`);
      console.log(`🔍 ClientIdentifier: ${identifier}`);

      const pixCode = data.pix?.code || '';
      const qrCodeUrl = pixCode ? `https://quickchart.io/qr?text=${encodeURIComponent(pixCode)}&size=300` : '';

      return {
        status: true,
        data: {
          transactionId: data.transactionId,
          clientIdentifier: identifier,
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

  async createUsdtPayment(userId: string, amount: number, description: string = 'licenca'): Promise<any> {
    try {
      console.log(`💰 createUsdtPayment: userId=${userId}, amount=${amount}, description=${description}`);
      
      // Testar conexão com o banco
      try {
        const testConnection = await this.pagamentoRepository.count();
        console.log(`🔍 Teste de conexão com banco: ${testConnection} pagamentos existentes`);
      } catch (connectionError) {
        console.error('❌ Erro de conexão com banco:', connectionError);
        throw new HttpException("Erro de conexão com banco de dados", HttpStatus.INTERNAL_SERVER_ERROR);
      }
      
      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (!user) {
        throw new HttpException("Usuário não encontrado", HttpStatus.NOT_FOUND);
      }

      // Cotação fixa BRL para USD
      const BRL_TO_USD_RATE = 5.5;
      const brlAmount = amount / 100; // Converter centavos para reais
      const usdAmount = Number((brlAmount / BRL_TO_USD_RATE).toFixed(2));
      
      console.log(`💰 Cálculo: ${amount} centavos = R$ ${brlAmount} = $${usdAmount} USD`);
      
      // Verificar se já existe um pagamento com o mesmo valor USD e status pendente
      let finalUsdAmount = usdAmount;
      let attempts = 0;
      const maxAttempts = 100; // Evitar loop infinito
      
      while (attempts < maxAttempts) {
        const existingPayment = await this.pagamentoRepository.findOne({
          where: {
            txid: finalUsdAmount.toString(),
            status: PaymentStatus.PENDING
          }
        });
        
        if (!existingPayment) {
          break; // Valor único encontrado
        }
        
        // Ajustar centavos para tornar único
        finalUsdAmount = Number((finalUsdAmount + 0.01).toFixed(2));
        attempts++;
      }
      
      if (attempts >= maxAttempts) {
        throw new HttpException("Não foi possível gerar valor único para USDT", HttpStatus.INTERNAL_SERVER_ERROR);
      }

      // Criar pagamento USDT
      const pagamento = this.pagamentoRepository.create({
        user_id: userId,
        value: amount, // Valor em reais (centavos)
        method: PaymentMethod.CRYPTO,
        description,
        status: PaymentStatus.PENDING,
        txid: finalUsdAmount.toString() // TXID será o valor em USD
      });

      console.log(`💰 Pagamento a ser criado:`, {
        user_id: userId,
        value: amount,
        method: PaymentMethod.CRYPTO,
        description,
        status: PaymentStatus.PENDING,
        txid: finalUsdAmount.toString()
      });

      try {
        const savedPayment = await this.pagamentoRepository.save(pagamento);
        console.log(`💰 Pagamento USDT criado: ID ${savedPayment.id} | R$ ${(amount / 100).toFixed(2)} | $${finalUsdAmount.toFixed(2)}`);
        console.log(`💰 Pagamento salvo:`, savedPayment);

        return {
          id: savedPayment.id,
          status: 'pending',
          amount: amount,
          method: 'CRYPTO',
          crypto: {
            type: 'USDT',
            network: 'TRC20',
            address: 'TSSTKSeTrqyrDuo59qMpLXaPZhB3Zq8825',
            usdAmount: finalUsdAmount
          },
          createdAt: savedPayment.created_at.toISOString()
        };
      } catch (saveError) {
        console.error('❌ Erro ao salvar pagamento no banco:', saveError);
        throw new HttpException(
          `Erro ao salvar pagamento: ${saveError.message}`,
          HttpStatus.INTERNAL_SERVER_ERROR
        );
      }

    } catch (error: any) {
      console.error('❌ Erro ao criar pagamento USDT:', error);
      throw new HttpException(
        error.message || 'Erro ao criar pagamento USDT',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
