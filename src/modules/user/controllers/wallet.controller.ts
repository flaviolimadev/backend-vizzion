import { Controller, Post, Get, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsPositive, Min } from 'class-validator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { WalletService } from '../services/wallet.service';

export class WithdrawDto {
  @ApiProperty({ 
    description: 'Valor para saque', 
    example: 100.00,
    minimum: 0.01
  })
  @IsNumber({}, { message: 'Valor deve ser um número' })
  @IsPositive({ message: 'Valor deve ser positivo' })
  @Min(0.01, { message: 'Valor mínimo para saque é R$ 0,01' })
  amount: number;

  @ApiProperty({ 
    description: 'Tipo de saldo para saque', 
    enum: ['balance', 'balance_invest'],
    example: 'balance'
  })
  type: 'balance' | 'balance_invest';
}

@ApiTags('Wallet')
@Controller('wallet')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Post('withdraw')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Realizar saque' })
  @ApiResponse({ status: 200, description: 'Saque realizado com sucesso' })
  @ApiResponse({ status: 400, description: 'Saldo insuficiente ou dados inválidos' })
  async withdraw(@Request() req, @Body() withdrawDto: WithdrawDto) {
    return this.walletService.withdraw(req.user.sub, withdrawDto.amount, withdrawDto.type);
  }

  @Get('balances')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obter saldos do usuário' })
  @ApiResponse({ status: 200, description: 'Saldos obtidos com sucesso' })
  async getBalances(@Request() req) {
    return this.walletService.getUserBalances(req.user.sub);
  }
} 