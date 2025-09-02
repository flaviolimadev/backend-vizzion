import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { PlanoResponseDto, UserPlanoResponseDto } from '../dto/plano.dto';

@Injectable()
export class PlanoService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  // Lista de planos disponíveis
  private readonly planosDisponiveis = [
    { id: 1, valor: 4, popular: false, maxDeposito: 20, descricao: 'Plano Básico' },
    { id: 2, valor: 20, popular: false, maxDeposito: 100, descricao: 'Plano Iniciante' },
    { id: 3, valor: 100, popular: false, maxDeposito: 500, descricao: 'Plano Intermediário' },
    { id: 4, valor: 500, popular: true, maxDeposito: 2500, descricao: 'Plano Avançado' },
    { id: 5, valor: 1000, popular: false, maxDeposito: 5000, descricao: 'Plano Profissional' },
    { id: 6, valor: 2000, popular: false, maxDeposito: 10000, descricao: 'Plano Expert' },
    { id: 7, valor: 5000, popular: false, maxDeposito: 25000, descricao: 'Plano Master' },
    { id: 8, valor: 10000, popular: false, maxDeposito: 50000, descricao: 'Plano Elite' },
    { id: 9, valor: 15000, popular: false, maxDeposito: 75000, descricao: 'Plano Premium' },
    { id: 10, valor: 20000, popular: false, maxDeposito: 100000, descricao: 'Plano VIP' },
  ];

  async getPlanosDisponiveis(): Promise<PlanoResponseDto[]> {
    return this.planosDisponiveis.map(plano => ({
      id: plano.id,
      valor: plano.valor,
      popular: plano.popular,
      maxDeposito: plano.maxDeposito,
      descricao: plano.descricao,
    }));
  }

  async getUserPlano(userId: string): Promise<UserPlanoResponseDto> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['plano', 'created_at']
    });

    if (!user) {
      throw new Error('Usuário não encontrado');
    }

    const planoAtual = user.plano;
    const temLicenca = planoAtual > 0;
    
    // Encontrar o próximo upgrade disponível
    const proximoUpgrade = this.planosDisponiveis.find(
      plano => plano.valor > planoAtual
    )?.valor;

    return {
      planoAtual,
      temLicenca,
      dataCompra: temLicenca ? user.created_at.toISOString() : undefined,
      proximoUpgrade,
    };
  }

  async upgradePlano(userId: string, novoPlano: number): Promise<{ success: boolean; message: string }> {
    const user = await this.userRepository.findOne({
      where: { id: userId }
    });

    if (!user) {
      throw new Error('Usuário não encontrado');
    }

    // Verificar se o plano existe
    const planoExiste = this.planosDisponiveis.find(p => p.valor === novoPlano);
    if (!planoExiste) {
      throw new Error('Plano não encontrado');
    }

    // Verificar se é um upgrade válido
    if (novoPlano <= user.plano) {
      throw new Error('Novo plano deve ser superior ao plano atual');
    }

    // Atualizar o plano do usuário
    await this.userRepository.update(userId, { plano: novoPlano });

    return {
      success: true,
      message: `Plano atualizado para US$ ${novoPlano.toLocaleString()} com sucesso!`
    };
  }

  getPlanoInfo(valor: number) {
    return this.planosDisponiveis.find(p => p.valor === valor);
  }
}
