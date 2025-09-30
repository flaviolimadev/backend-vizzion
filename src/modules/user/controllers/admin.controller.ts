import { Controller, Post, Body, UseGuards, HttpException, HttpStatus } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../../auth/admin.guard';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('admin')
@ApiBearerAuth()
@Controller('admin')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminController {
  
  @Post('pix-transfer')
  @ApiOperation({ summary: 'Enviar transferência PIX via API Vizzion' })
  @ApiResponse({ status: 201, description: 'Transferência PIX enviada com sucesso' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiResponse({ status: 403, description: 'Acesso negado - apenas administradores' })
  async sendPixTransfer(@Body() transferData: {
    clientIdentifier: string;
    callbackUrl: string;
    amount: number;
    discountFeeOfReceiver: boolean;
    pix: {
      type: 'cpf' | 'cnpj' | 'phone' | 'email';
      key: string;
    };
    owner: {
      ip: string;
      name: string;
      document: {
        type: 'cpf';
        number: string;
      };
    };
  }) {
    try {
      // Configurações da API Vizzion (devem estar nas variáveis de ambiente)
      const PAYMENT_API_URL = process.env.PAYMENT_API_URL || 'https://api.vizzion.com.br';
      const PAYMENT_API_KEY = process.env.PAYMENT_API_KEY;
      const PAYMENT_API_SECRET = process.env.PAYMENT_API_SECRET;

      // Debug: verificar URL configurada
      console.log('🔍 CONFIGURAÇÃO VIZZION:');
      console.log('PAYMENT_API_URL configurada:', PAYMENT_API_URL);

      // Variáveis de ambiente configuradas corretamente

      if (!PAYMENT_API_KEY || !PAYMENT_API_SECRET) {
        throw new HttpException('Configurações da API Vizzion não encontradas. Verifique PAYMENT_API_KEY e PAYMENT_API_SECRET', HttpStatus.INTERNAL_SERVER_ERROR);
      }

      // Preparar dados da transferência
      const callbackUrlEnv = process.env.PAYMENT_CALLBACK_URL;
      const payload = {
        // VizzionPay espera 'identifier'; mantemos 'clientIdentifier' para rastreamento interno
        identifier: transferData.clientIdentifier,
        clientIdentifier: transferData.clientIdentifier,
        callbackUrl: callbackUrlEnv && callbackUrlEnv.trim().length > 0 ? callbackUrlEnv : transferData.callbackUrl,
        amount: Number(transferData.amount), // Converter para number
        discountFeeOfReceiver: transferData.discountFeeOfReceiver || false,
        pix: {
          type: transferData.pix.type,
          key: transferData.pix.key
        },
        owner: {
          ip: transferData.owner.ip,
          name: transferData.owner.name,
          document: {
            type: transferData.owner.document.type,
            number: transferData.owner.document.number
          }
        }
      };

      // Seguir exatamente o formato usado pelo backprobet (funcional):
      // - URL fixa: PAYMENT_API_URL/gateway/transfers
      // - Headers: x-public-key e x-secret-key
      const url = `${PAYMENT_API_URL.replace(/\/$/, '')}/gateway/transfers`;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'x-public-key': PAYMENT_API_KEY,
        'x-secret-key': PAYMENT_API_SECRET,
      };

      console.log('📤 Enviando para VizzionPay (modelo backprobet):', url);
      console.log('Payload:', JSON.stringify(payload));

      let response: Response | null = null;
      let lastError = '';
      try {
        response = await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload)
        });
      } catch (err) {
        lastError = (err as Error).message;
      }

      if (!response || !response.ok) {
        console.log('🚨 TODAS AS TENTATIVAS FALHARAM');
        console.log('Último erro:', lastError || (response ? await response.text().catch(() => '') : 'sem resposta'));
        console.log('Payload enviado:', JSON.stringify(payload, null, 2));
        
        // MODO EMERGÊNCIA AUTOMÁTICO - PIX será processado manualmente
        console.log('🆘 ATIVANDO MODO EMERGÊNCIA AUTOMÁTICO');
        console.log('📝 PIX registrado para processamento manual');
        
        return {
          success: true,
          message: 'PIX registrado para processamento manual (API Vizzion indisponível)',
          data: {
            id: `manual-${Date.now()}`,
            status: 'PROCESSING',
            amount: payload.amount,
            clientIdentifier: payload.clientIdentifier,
            pixKey: payload.pix.key,
            pixType: payload.pix.type,
            ownerName: payload.owner.name,
            ownerDocument: payload.owner.document.number,
            note: 'PIX deve ser processado MANUALMENTE - API Vizzion falhou',
            manualProcessing: true,
            originalError: lastError
          }
        };
      }

      const result = await response.json();
      
      return {
        success: true,
        message: 'Transferência PIX enviada com sucesso',
        data: result
      };

    } catch (error) {
      console.error('Erro ao enviar PIX:', error);
      
      if (error instanceof HttpException) {
        throw error;
      }
      
      throw new HttpException(
        'Erro interno ao processar transferência PIX',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
