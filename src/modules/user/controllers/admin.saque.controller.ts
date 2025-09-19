import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags, ApiQuery } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Saque, SaqueStatus, SaqueType } from '../entities/saque.entity';
import { User } from '../entities/user.entity';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { RolesGuard } from '../../auth/guards/roles.guard';

@ApiTags('admin-saques')
@Controller('admin/saques')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
@Roles('admin')
export class AdminSaqueController {
  constructor(
    @InjectRepository(Saque) private readonly saqueRepo: Repository<Saque>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Listar todos os saques com informações do usuário' })
  @ApiResponse({ status: 200, description: 'Lista de saques retornada com sucesso' })
  @ApiQuery({ name: 'status', required: false, description: 'Filtrar por status (0=PENDING, 1=PROCESSING, 2=COMPLETED, 3=CANCELLED)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Limitar número de resultados' })
  @ApiQuery({ name: 'offset', required: false, description: 'Pular número de resultados' })
  async listAll(
    @Query('status') status?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string
  ) {
    const queryBuilder = this.saqueRepo
      .createQueryBuilder('saque')
      .leftJoinAndSelect('saque.user', 'user')
      .select([
        'saque.id',
        'saque.user_id',
        'saque.type',
        'saque.amount',
        'saque.tax',
        'saque.final_amount',
        'saque.status',
        'saque.cpf',
        'saque.key_type',
        'saque.key_value',
        'saque.notes',
        'saque.created_at',
        'saque.updated_at',
        'user.id',
        'user.nome',
        'user.sobrenome',
        'user.email',
        'user.contato',
        'user.balance',
        'user.balance_invest',
        'user.plano'
      ])
      .orderBy('saque.created_at', 'DESC');

    if (status !== undefined) {
      queryBuilder.andWhere('saque.status = :status', { status: parseInt(status) });
    }

    if (limit) {
      queryBuilder.limit(parseInt(limit));
    }

    if (offset) {
      queryBuilder.offset(parseInt(offset));
    }

    return queryBuilder.getMany();
  }

  @Get('resumo')
  @ApiOperation({ summary: 'Obter resumo dos saques por status' })
  @ApiResponse({ status: 200, description: 'Resumo dos saques retornado com sucesso' })
  async getResumo() {
    const [pendentes, processando, pagos, cancelados, totalValue, totalTax] = await Promise.all([
      // Saques pendentes (status 0)
      this.saqueRepo
        .createQueryBuilder('saque')
        .select([
          'COUNT(*) as count',
          'COALESCE(SUM(saque.amount), 0) as total_amount',
          'COALESCE(SUM(saque.final_amount), 0) as total_final_amount',
          'COALESCE(SUM(saque.tax), 0) as total_tax'
        ])
        .where('saque.status = :status', { status: SaqueStatus.PENDING })
        .getRawOne(),

      // Saques em processamento (status 1)
      this.saqueRepo
        .createQueryBuilder('saque')
        .select([
          'COUNT(*) as count',
          'COALESCE(SUM(saque.amount), 0) as total_amount',
          'COALESCE(SUM(saque.final_amount), 0) as total_final_amount',
          'COALESCE(SUM(saque.tax), 0) as total_tax'
        ])
        .where('saque.status = :status', { status: SaqueStatus.PROCESSING })
        .getRawOne(),

      // Saques pagos/concluídos (status 2)
      this.saqueRepo
        .createQueryBuilder('saque')
        .select([
          'COUNT(*) as count',
          'COALESCE(SUM(saque.amount), 0) as total_amount',
          'COALESCE(SUM(saque.final_amount), 0) as total_final_amount',
          'COALESCE(SUM(saque.tax), 0) as total_tax'
        ])
        .where('saque.status = :status', { status: SaqueStatus.COMPLETED })
        .getRawOne(),

      // Saques cancelados (status 3)
      this.saqueRepo
        .createQueryBuilder('saque')
        .select([
          'COUNT(*) as count',
          'COALESCE(SUM(saque.amount), 0) as total_amount',
          'COALESCE(SUM(saque.final_amount), 0) as total_final_amount',
          'COALESCE(SUM(saque.tax), 0) as total_tax'
        ])
        .where('saque.status = :status', { status: SaqueStatus.CANCELLED })
        .getRawOne(),

      // Total geral de valores
      this.saqueRepo
        .createQueryBuilder('saque')
        .select([
          'COUNT(*) as total_count',
          'COALESCE(SUM(saque.amount), 0) as total_amount',
          'COALESCE(SUM(saque.final_amount), 0) as total_final_amount'
        ])
        .getRawOne(),

      // Total de taxas arrecadadas
      this.saqueRepo
        .createQueryBuilder('saque')
        .select('COALESCE(SUM(saque.tax), 0) as total_tax_collected')
        .where('saque.status IN (:...statuses)', { statuses: [SaqueStatus.COMPLETED, SaqueStatus.PROCESSING] })
        .getRawOne()
    ]);

    return {
      resumo_por_status: {
        pendentes: {
          count: parseInt(pendentes.count),
          total_solicitado: parseFloat(pendentes.total_amount),
          total_liquido: parseFloat(pendentes.total_final_amount),
          total_taxa: parseFloat(pendentes.total_tax),
          status: 'PENDING',
          descricao: 'Saques aguardando processamento'
        },
        processando: {
          count: parseInt(processando.count),
          total_solicitado: parseFloat(processando.total_amount),
          total_liquido: parseFloat(processando.total_final_amount),
          total_taxa: parseFloat(processando.total_tax),
          status: 'PROCESSING',
          descricao: 'Saques em processamento'
        },
        pagos: {
          count: parseInt(pagos.count),
          total_solicitado: parseFloat(pagos.total_amount),
          total_liquido: parseFloat(pagos.total_final_amount),
          total_taxa: parseFloat(pagos.total_tax),
          status: 'COMPLETED',
          descricao: 'Saques concluídos/pagos'
        },
        cancelados: {
          count: parseInt(cancelados.count),
          total_solicitado: parseFloat(cancelados.total_amount),
          total_liquido: parseFloat(cancelados.total_final_amount),
          total_taxa: parseFloat(cancelados.total_tax),
          status: 'CANCELLED',
          descricao: 'Saques cancelados'
        }
      },
      totais_gerais: {
        total_saques: parseInt(totalValue.total_count),
        total_valor_solicitado: parseFloat(totalValue.total_amount),
        total_valor_liquido: parseFloat(totalValue.total_final_amount),
        total_taxas_arrecadadas: parseFloat(totalTax.total_tax_collected)
      },
      estatisticas: {
        taxa_media: totalValue.total_count > 0 ? 
          (parseFloat(totalTax.total_tax_collected) / parseFloat(totalValue.total_amount) * 100).toFixed(2) + '%' : '0%',
        valor_medio_saque: totalValue.total_count > 0 ? 
          (parseFloat(totalValue.total_amount) / parseInt(totalValue.total_count)).toFixed(2) : '0.00'
      }
    };
  }

  @Get('pendentes')
  @ApiOperation({ summary: 'Listar apenas saques pendentes (status 0)' })
  @ApiResponse({ status: 200, description: 'Lista de saques pendentes' })
  async listPendentes() {
    return this.saqueRepo.find({
      where: { status: SaqueStatus.PENDING },
      relations: ['user'],
      order: { created_at: 'ASC' } // Mais antigos primeiro para processamento
    });
  }

  @Get('por-usuario/:userId')
  @ApiOperation({ summary: 'Listar saques de um usuário específico' })
  @ApiResponse({ status: 200, description: 'Lista de saques do usuário' })
  async listByUser(@Param('userId') userId: string) {
    const user = await this.userRepo.findOne({ 
      where: { id: userId },
      select: ['id', 'nome', 'sobrenome', 'email', 'contato', 'balance', 'balance_invest', 'plano']
    });

    if (!user) {
      throw new Error('Usuário não encontrado');
    }

    const saques = await this.saqueRepo.find({
      where: { user_id: userId },
      order: { created_at: 'DESC' }
    });

    return {
      usuario: user,
      saques,
      resumo: {
        total_saques: saques.length,
        total_solicitado: saques.reduce((sum, s) => sum + Number(s.amount), 0),
        total_liquido: saques.reduce((sum, s) => sum + Number(s.final_amount), 0),
        total_taxas: saques.reduce((sum, s) => sum + Number(s.tax), 0)
      }
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obter detalhes de um saque específico' })
  @ApiResponse({ status: 200, description: 'Detalhes do saque retornados com sucesso' })
  async getById(@Param('id') id: string) {
    const saque = await this.saqueRepo.findOne({
      where: { id },
      relations: ['user']
    });

    if (!saque) {
      throw new Error('Saque não encontrado');
    }

    return saque;
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Atualizar status de um saque' })
  @ApiResponse({ status: 200, description: 'Status do saque atualizado com sucesso' })
  async updateStatus(
    @Param('id') id: string,
    @Body() body: { status: SaqueStatus; notes?: string }
  ) {
    const saque = await this.saqueRepo.findOne({ 
      where: { id },
      relations: ['user']
    });

    if (!saque) {
      throw new Error('Saque não encontrado');
    }

    await this.saqueRepo.update(id, {
      status: body.status,
      notes: body.notes || saque.notes,
      updated_at: new Date()
    });

    const updatedSaque = await this.saqueRepo.findOne({
      where: { id },
      relations: ['user']
    });

    return {
      success: true,
      message: `Status do saque atualizado para ${this.getStatusDescription(body.status)}`,
      saque: updatedSaque
    };
  }

  private getStatusDescription(status: SaqueStatus): string {
    switch (status) {
      case SaqueStatus.PENDING: return 'PENDENTE';
      case SaqueStatus.PROCESSING: return 'PROCESSANDO';
      case SaqueStatus.COMPLETED: return 'CONCLUÍDO';
      case SaqueStatus.CANCELLED: return 'CANCELADO';
      default: return 'DESCONHECIDO';
    }
  }
}


