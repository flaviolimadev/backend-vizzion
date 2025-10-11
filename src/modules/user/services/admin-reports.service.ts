import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Extrato, ExtratoType, ExtratoStatus } from '../entities/extrato.entity';
import { User } from '../entities/user.entity';

export interface DepositsReport {
  period: {
    startDate: string;
    endDate: string;
  };
  summary: {
    totalDeposits: number;
    totalLicenses: number;
    totalAmount: number;
    totalLicenseAmount: number;
    totalDepositAmount: number;
    depositCount: number;
    licenseCount: number;
  };
  deposits: Array<{
    id: string;
    userId: string;
    userName: string;
    userEmail: string;
    amount: number;
    type: 'deposit' | 'license';
    description: string;
    status: string;
    createdAt: string;
  }>;
}

@Injectable()
export class AdminReportsService {
  constructor(
    @InjectRepository(Extrato)
    private extratoRepository: Repository<Extrato>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async getDepositsReport(startDate?: string, endDate?: string): Promise<DepositsReport> {
    // Definir período padrão (últimos 30 dias se não especificado)
    const defaultEndDate = new Date();
    const defaultStartDate = new Date();
    defaultStartDate.setDate(defaultStartDate.getDate() - 30);

    const start = startDate ? new Date(startDate) : defaultStartDate;
    const end = endDate ? new Date(endDate) : defaultEndDate;

    // Buscar extratos de depósito e licença no período
    const extratos = await this.extratoRepository
      .createQueryBuilder('extrato')
      .leftJoinAndSelect('extrato.user', 'user')
      .where('extrato.type IN (:...types)', { 
        types: [ExtratoType.DEPOSIT, ExtratoType.INVESTMENT] 
      })
      .andWhere('extrato.status = :status', { status: ExtratoStatus.COMPLETED })
      .andWhere('extrato.created_at BETWEEN :startDate AND :endDate', {
        startDate: start,
        endDate: end,
      })
      .orderBy('extrato.created_at', 'DESC')
      .getMany();

    // Separar depósitos de licenças
    const deposits = extratos.filter(e => e.type === ExtratoType.DEPOSIT);
    const licenses = extratos.filter(e => e.type === ExtratoType.INVESTMENT);

    // Calcular totais
    const totalDepositAmount = deposits.reduce((sum, d) => {
      const amount = typeof d.amount === 'string' ? parseFloat(d.amount) : Number(d.amount || 0);
      return sum + (Number.isFinite(amount) ? amount : 0);
    }, 0);

    const totalLicenseAmount = licenses.reduce((sum, l) => {
      const amount = typeof l.amount === 'string' ? parseFloat(l.amount) : Number(l.amount || 0);
      return sum + (Number.isFinite(amount) ? amount : 0);
    }, 0);

    // Mapear dados para o relatório
    const depositsData = extratos.map(extrato => {
      const amount = typeof extrato.amount === 'string' ? parseFloat(extrato.amount) : Number(extrato.amount || 0);
      const safeAmount = Number.isFinite(amount) ? amount : 0;

      return {
        id: extrato.id,
        userId: extrato.user_id,
        userName: extrato.user ? `${extrato.user.nome} ${extrato.user.sobrenome}` : 'Usuário não encontrado',
        userEmail: extrato.user?.email || 'Email não encontrado',
        amount: safeAmount,
        type: extrato.type === ExtratoType.INVESTMENT ? 'license' : 'deposit',
        description: extrato.description || '',
        status: extrato.status === ExtratoStatus.COMPLETED ? 'Aprovado' : 
                extrato.status === ExtratoStatus.PENDING ? 'Pendente' : 'Cancelado',
        createdAt: extrato.created_at.toISOString(),
      };
    });

    return {
      period: {
        startDate: start.toISOString().split('T')[0],
        endDate: end.toISOString().split('T')[0],
      },
      summary: {
        totalDeposits: deposits.length,
        totalLicenses: licenses.length,
        totalAmount: totalDepositAmount + totalLicenseAmount,
        totalLicenseAmount,
        totalDepositAmount,
        depositCount: deposits.length,
        licenseCount: licenses.length,
      },
      deposits: depositsData,
    };
  }
}
