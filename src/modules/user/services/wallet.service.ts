import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';

@Injectable()
export class WalletService {
  constructor(
    @InjectRepository(User) private userRepository: Repository<User>,
  ) {}

  async withdraw(userId: string, amount: number, type: 'balance' | 'balance_invest'): Promise<{ success: boolean; message: string; finalAmount?: number; penalty?: number }> {
    const user = await this.userRepository.findOne({ 
      where: { id: userId },
      select: ['id', 'balance', 'balance_invest', 'balance_block']
    });
    
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    const currentBalance = type === 'balance' ? Number(user.balance) : Number(user.balance_invest);
    
    if (currentBalance < amount) {
      throw new BadRequestException(`Saldo insuficiente. Saldo atual: R$ ${currentBalance.toFixed(2)}`);
    }

    if (type === 'balance') {
      // Saque do saldo disponível (sem multa)
      await this.userRepository.update(userId, {
        balance: Number(user.balance) - amount
      });

      return {
        success: true,
        message: `Saque de R$ ${amount.toFixed(2)} realizado com sucesso`,
        finalAmount: amount
      };
    } else {
      // Saque do saldo investido (com multa de 25%)
      const penalty = amount * 0.25; // 25% de multa
      const finalAmount = amount - penalty; // 75% do valor
      
      await this.userRepository.update(userId, {
        balance_invest: Number(user.balance_invest) - amount,
        balance_block: Number(user.balance_block) + penalty // A multa vai para saldo bloqueado
      });

      return {
        success: true,
        message: `Saque de R$ ${amount.toFixed(2)} realizado. Valor líquido: R$ ${finalAmount.toFixed(2)}. Multa: R$ ${penalty.toFixed(2)}`,
        finalAmount: finalAmount,
        penalty: penalty
      };
    }
  }

  async getUserBalances(userId: string) {
    const user = await this.userRepository.findOne({ 
      where: { id: userId },
      select: ['balance', 'balance_invest', 'balance_block']
    });
    
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    return {
      balance: Number(user.balance),
      balance_invest: Number(user.balance_invest),
      balance_block: Number(user.balance_block),
      total: Number(user.balance) + Number(user.balance_invest) + Number(user.balance_block)
    };
  }
} 