import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { Plano } from '../entities/plano.entity';
import { PlanoResponseDto, UserPlanoResponseDto, UpgradePlanoDto } from '../dto/plano.dto';

@Injectable()
export class PlanoService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Plano)
    private planoRepository: Repository<Plano>,
  ) {}

  async getPlanosDisponiveis(): Promise<PlanoResponseDto[]> {
    const planos = await this.planoRepository.find({
      where: { ativo: true },
      order: { ordem: 'ASC' },
    });

    return planos.map(plano => ({
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

    const planoId = user.plano;
    const temLicenca = planoId > 0;
    
    let planoAtual = 0;
    let proximoUpgrade: number | undefined;
    let nomePlano: string | undefined;

    if (temLicenca) {
      // Buscar o plano atual
      const planoAtualObj = await this.planoRepository.findOne({
        where: { id: planoId, ativo: true }
      });
      
      if (planoAtualObj) {
        planoAtual = planoAtualObj.valor;
        nomePlano = planoAtualObj.descricao;
        
        // Encontrar o próximo upgrade disponível
        const planosAtivos = await this.planoRepository.find({
          where: { ativo: true },
          order: { ordem: 'ASC' },
        });
        const proximoPlano = planosAtivos.find(
          plano => plano.ordem > planoAtualObj.ordem
        );
        proximoUpgrade = proximoPlano?.valor;
      }
    }

    return {
      planoAtual,
      temLicenca,
      dataCompra: temLicenca ? user.created_at.toISOString() : undefined,
      proximoUpgrade,
      nomePlano,
    };
  }

  async upgradePlano(userId: string, novoPlanoValor: number): Promise<{ success: boolean; message: string }> {
    const user = await this.userRepository.findOne({
      where: { id: userId }
    });

    if (!user) {
      throw new Error('Usuário não encontrado');
    }

    // Verificar se o plano existe
    const novoPlano = await this.planoRepository.findOne({
      where: { valor: novoPlanoValor, ativo: true }
    });
    if (!novoPlano) {
      throw new Error('Plano não encontrado');
    }

    // Se o usuário já tem um plano, verificar se é um upgrade válido
    if (user.plano > 0) {
      const planoAtual = await this.planoRepository.findOne({
        where: { id: user.plano, ativo: true }
      });
      
      if (planoAtual && novoPlano.ordem <= planoAtual.ordem) {
        throw new Error('Novo plano deve ser superior ao plano atual');
      }
    }

    // Atualizar o plano do usuário (salvar o ID do plano)
    await this.userRepository.update(userId, { plano: novoPlano.id });

    return {
      success: true,
      message: `Plano atualizado para R$ ${(novoPlanoValor * 5).toLocaleString()} com sucesso!`
    };
  }

  async getPlanoInfo(valor: number) {
    return await this.planoRepository.findOne({
      where: { valor, ativo: true }
    });
  }

  async getPlanoById(id: number) {
    return await this.planoRepository.findOne({
      where: { id, ativo: true }
    });
  }

  // Método alternativo usando relacionamento
  async getUserPlanoWithRelation(userId: string): Promise<UserPlanoResponseDto> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['planoObj'],
      select: ['plano', 'created_at', 'planoObj']
    });

    if (!user) {
      throw new Error('Usuário não encontrado');
    }

    const temLicenca = user.plano > 0;
    let planoAtual = 0;
    let proximoUpgrade: number | undefined;

    if (temLicenca && user.planoObj) {
      planoAtual = user.planoObj.valor;
      
      // Encontrar o próximo upgrade disponível
      const planosAtivos = await this.planoRepository.find({
        where: { ativo: true },
        order: { ordem: 'ASC' },
      });
      const proximoPlano = planosAtivos.find(
        plano => plano.ordem > user.planoObj!.ordem
      );
      proximoUpgrade = proximoPlano?.valor;
    }

    return {
      planoAtual,
      temLicenca,
      dataCompra: temLicenca ? user.created_at.toISOString() : undefined,
      proximoUpgrade,
    };
  }
}
