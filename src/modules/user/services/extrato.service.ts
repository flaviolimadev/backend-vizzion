import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Extrato, ExtratoType, ExtratoStatus } from '../entities/extrato.entity';
import { User } from '../entities/user.entity';

@Injectable()
export class ExtratoService {
  constructor(
    @InjectRepository(Extrato)
    private extratoRepository: Repository<Extrato>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async getExtratosByUser(userId: string): Promise<Extrato[]> {
    return this.extratoRepository.find({
      where: { user_id: userId },
      order: { created_at: 'DESC' },
      relations: ['user']
    });
  }

  async createExtrato(
    userId: string,
    type: ExtratoType,
    amount: number,
    description: string,
    referenceId?: string,
    referenceType?: string,
    metadata?: any
  ): Promise<Extrato> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new Error('Usuário não encontrado');
    }

    const extrato = this.extratoRepository.create({
      user_id: userId,
      type,
      amount,
      description,
      reference_id: referenceId,
      reference_type: referenceType,
      metadata: metadata ? JSON.stringify(metadata) : null,
      status: ExtratoStatus.COMPLETED,
      balance_before: user.balance_invest || 0,
      balance_after: (user.balance_invest || 0) + amount
    });

    return this.extratoRepository.save(extrato);
  }

  async getExtratosByType(userId: string, type: ExtratoType): Promise<Extrato[]> {
    return this.extratoRepository.find({
      where: { 
        user_id: userId,
        type 
      },
      order: { created_at: 'DESC' },
      relations: ['user']
    });
  }

  async getExtratosByDateRange(
    userId: string, 
    startDate: Date, 
    endDate: Date
  ): Promise<Extrato[]> {
    return this.extratoRepository
      .createQueryBuilder('extrato')
      .where('extrato.user_id = :userId', { userId })
      .andWhere('extrato.created_at >= :startDate', { startDate })
      .andWhere('extrato.created_at <= :endDate', { endDate })
      .orderBy('extrato.created_at', 'DESC')
      .getMany();
  }
}
