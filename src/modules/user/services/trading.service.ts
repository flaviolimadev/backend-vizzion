import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';

@Injectable()
export class TradingService {
  constructor(
    @InjectRepository(User) private userRepository: Repository<User>,
  ) {}

  async getTradingMode(userId: string): Promise<{ mode: string }> {
    const user = await this.userRepository.findOne({ 
      where: { id: userId }, 
      select: ['trading_mode'] 
    });
    
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    return { mode: user.trading_mode || 'manual' };
  }

  async updateTradingMode(userId: string, mode: 'manual' | 'auto'): Promise<{ success: boolean; mode: string }> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    await this.userRepository.update(userId, { trading_mode: mode });

    return { 
      success: true, 
      mode 
    };
  }
} 