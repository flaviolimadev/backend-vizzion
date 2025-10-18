import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { Extrato } from '../entities/extrato.entity';
import { Saque } from '../entities/saque.entity';
import { Pagamento, PaymentMethod, PaymentStatus } from '../entities/pagamento.entity';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { RolesGuard } from '../../auth/guards/roles.guard';

@ApiTags('admin-users')
@Controller('admin/users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminUserController {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Extrato) private readonly extratoRepo: Repository<Extrato>,
    @InjectRepository(Saque) private readonly saqueRepo: Repository<Saque>,
    @InjectRepository(Pagamento) private readonly pagamentoRepo: Repository<Pagamento>,
  ) {}

  @Get()
  async list() {
    return this.userRepo.find();
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    return this.userRepo.findOne({ where: { id } });
  }

  @Post()
  async create(@Body() body: Partial<User>) {
    const entity = this.userRepo.create(body);
    const saved = await this.userRepo.save(entity);
    return saved;
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() body: Partial<User>) {
    await this.userRepo.update(id, body);
    return this.userRepo.findOne({ where: { id } });
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.userRepo.delete(id);
    return { deleted: true };
  }

  @Get(':id/extrato')
  async getExtrato(@Param('id') id: string) {
    return this.extratoRepo.find({
      where: { user_id: id },
      order: { created_at: 'DESC' }
    });
  }

  @Get(':id/details')
  @ApiOperation({ summary: 'Obter detalhes completos do usuário para admin' })
  @ApiResponse({ status: 200, description: 'Detalhes completos do usuário retornados com sucesso' })
  async getUserDetails(@Param('id') id: string) {
    // Buscar usuário
    const user = await this.userRepo.findOne({ 
      where: { id },
      select: [
        'id', 'nome', 'sobrenome', 'email', 'contato', 'avatar',
        'plano', 'balance', 'balance_invest', 'balance_block',
        'role', 'referred_at', 'created_at', 'updated_at', 'email_verified'
      ]
    });

    if (!user) {
      throw new Error('Usuário não encontrado');
    }

    // Buscar extrato (últimos 50 registros)
    const extrato = await this.extratoRepo.find({
      where: { user_id: id },
      order: { created_at: 'DESC' },
      take: 50
    });

    // Buscar saques do usuário
    const saques = await this.saqueRepo.find({
      where: { user_id: id },
      order: { created_at: 'DESC' },
      take: 20
    });

    // Buscar pagamentos do usuário
    const pagamentos = await this.pagamentoRepo.find({
      where: { user_id: id },
      order: { created_at: 'DESC' },
      take: 20
    });

    // Buscar rede de referrals (pessoas que este usuário indicou)
    const referredUsers = await this.userRepo.find({
      where: { referred_at: id },
      select: ['id', 'nome', 'sobrenome', 'email', 'plano', 'balance_invest', 'created_at'],
      order: { created_at: 'DESC' }
    });

    // Buscar quem indicou este usuário
    let referredBy = null;
    if (user.referred_at) {
      referredBy = await this.userRepo.findOne({
        where: { id: user.referred_at },
        select: ['id', 'nome', 'sobrenome', 'email']
      });
    }

    // Buscar rede completa (níveis 1 a 10)
    const fullNetwork = await this.buildFullReferralNetwork(id, 10);

    // Calcular estatísticas da rede
    const networkStats = {
      total_referred: referredUsers.length,
      total_network_investment: referredUsers.reduce((sum, u) => sum + Number(u.balance_invest), 0),
      active_referrals: referredUsers.filter(u => Number(u.balance_invest) > 0).length,
      referral_levels: fullNetwork.levelStats,
      total_network_size: fullNetwork.totalUsers,
      total_network_volume: fullNetwork.totalInvestment,
      deepest_level: fullNetwork.deepestLevel
    };

    // Calcular resumo de transações
    const transactionSummary = {
      total_deposits: extrato.filter(e => e.type === 'deposit').reduce((sum, e) => sum + Number(e.amount), 0),
      total_withdrawals: extrato.filter(e => e.type === 'withdrawal').reduce((sum, e) => sum + Math.abs(Number(e.amount)), 0),
      total_bonuses: extrato.filter(e => e.type === 'bonus').reduce((sum, e) => sum + Number(e.amount), 0),
      total_referral_earnings: extrato.filter(e => e.type === 'referral').reduce((sum, e) => sum + Number(e.amount), 0),
      total_yield_earnings: extrato.filter(e => e.type === 'yield').reduce((sum, e) => sum + Number(e.amount), 0),
      pending_withdrawals: saques.filter(s => s.status === 0).length,
      completed_withdrawals: saques.filter(s => s.status === 2).length,
      cancelled_withdrawals: saques.filter(s => s.status === 3).length
    };

    return {
      user: {
        ...user,
        balance: Number(user.balance),
        balance_invest: Number(user.balance_invest),
        balance_block: Number(user.balance_block)
      },
      extrato,
      saques,
      pagamentos,
      referral_network: {
        referred_by: referredBy,
        referred_users: referredUsers,
        stats: networkStats,
        full_network: fullNetwork.networkTree
      },
      transaction_summary: transactionSummary,
      account_health: {
        verification_status: user.email_verified ? 'verified' : 'pending',
        account_age_days: Math.floor((new Date().getTime() - new Date(user.created_at).getTime()) / (1000 * 60 * 60 * 24)),
        risk_level: this.calculateRiskLevel(transactionSummary, networkStats),
        activity_score: this.calculateActivityScore(extrato, saques, pagamentos)
      }
    };
  }

  private async buildFullReferralNetwork(userId: string, maxLevel: number = 10) {
    const levelStats: any = {};
    let totalUsers = 0;
    let totalInvestment = 0;
    let deepestLevel = 0;

    // Inicializar estatísticas por nível (até 10 níveis com otimizações)
    for (let i = 1; i <= maxLevel; i++) {
      levelStats[`level_${i}`] = {
        count: 0,
        total_investment: 0,
        active_users: 0,
        users: []
      };
    }

    // Usar uma abordagem mais eficiente com queries em lote
    const processLevel = async (parentIds: string[], currentLevel: number): Promise<string[]> => {
      if (currentLevel > maxLevel || parentIds.length === 0) return [];

      // Buscar todos os usuários deste nível em uma única query
      const users = await this.userRepo
        .createQueryBuilder('user')
        .select([
          'user.id', 'user.nome', 'user.sobrenome', 'user.email', 
          'user.plano', 'user.balance_invest', 'user.created_at', 'user.referred_at'
        ])
        .where('user.referred_at IN (:...parentIds)', { parentIds })
        .orderBy('user.created_at', 'DESC')
        .getMany();

      const nextLevelIds: string[] = [];

      for (const user of users) {
        totalUsers++;
        const investment = Number(user.balance_invest);
        totalInvestment += investment;
        
        if (currentLevel > deepestLevel) {
          deepestLevel = currentLevel;
        }

        // Atualizar estatísticas do nível
        levelStats[`level_${currentLevel}`].count++;
        levelStats[`level_${currentLevel}`].total_investment += investment;
        if (investment > 0) {
          levelStats[`level_${currentLevel}`].active_users++;
        }

        // Adicionar apenas alguns usuários de exemplo (não todos para performance)
        if (levelStats[`level_${currentLevel}`].users.length < 10) {
          levelStats[`level_${currentLevel}`].users.push({
            id: user.id,
            nome: user.nome,
            sobrenome: user.sobrenome,
            email: user.email,
            plano: user.plano,
            balance_invest: investment,
            created_at: user.created_at
          });
        }

        nextLevelIds.push(user.id);
      }

      // Processar próximo nível
      if (nextLevelIds.length > 0) {
        await processLevel(nextLevelIds, currentLevel + 1);
      }

      return nextLevelIds;
    };

    // Iniciar processamento
    await processLevel([userId], 1);

    return {
      levelStats,
      networkTree: [], // Removido para performance
      totalUsers,
      totalInvestment,
      deepestLevel
    };
  }

  private countDescendants(children: any[]): number {
    let count = children.length;
    for (const child of children) {
      count += this.countDescendants(child.children || []);
    }
    return count;
  }

  private calculateReferralLevels(referredUsers: any[]) {
    const levels = {
      level_1: referredUsers.length,
      level_2: 0, // Será substituído pela nova implementação
      total_network: referredUsers.length
    };
    return levels;
  }

  private calculateRiskLevel(transactionSummary: any, networkStats: any) {
    let risk = 'low';
    
    if (transactionSummary.total_withdrawals > transactionSummary.total_deposits * 2) {
      risk = 'high';
    } else if (transactionSummary.cancelled_withdrawals > 3) {
      risk = 'medium';
    } else if (networkStats.total_referred > 50) {
      risk = 'medium';
    }
    
    return risk;
  }

  private calculateActivityScore(extrato: any[], saques: any[], pagamentos: any[]) {
    const recentActivity = extrato.filter(e => 
      new Date(e.created_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    ).length;
    
    if (recentActivity > 20) return 'high';
    if (recentActivity > 5) return 'medium';
    return 'low';
  }

  @Post(':id/payments')
  @ApiOperation({ summary: 'Criar pagamento manual para usuário' })
  @ApiResponse({ status: 201, description: 'Pagamento criado com sucesso' })
  async createPayment(
    @Param('id') userId: string,
    @Body() body: {
      amount: number;
      method: 'PIX' | 'CRYPTO' | 'BONUS';
      description: 'deposit' | 'licenca';
      status: 0 | 1 | 2 | 3;
    }
  ) {
    // Verificar se usuário existe
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new Error('Usuário não encontrado');
    }

    // Mapear string para enum PaymentMethod
    const methodMap: Record<string, PaymentMethod> = {
      'PIX': PaymentMethod.PIX,
      'CRYPTO': PaymentMethod.CRYPTO,
      'BONUS': PaymentMethod.BONUS
    };

    // Criar pagamento
    const pagamento = this.pagamentoRepo.create({
      user_id: userId,
      method: methodMap[body.method],
      status: body.status,
      value: Math.round(body.amount * 100), // Converter para centavos
      description: body.description,
      txid: `MANUAL_${Date.now()}`,
      client_identifier: `admin_${userId}_${Date.now()}`,
    });

    const savedPagamento = await this.pagamentoRepo.save(pagamento);

    return {
      success: true,
      data: savedPagamento,
      message: 'Pagamento criado com sucesso'
    };
  }
}


