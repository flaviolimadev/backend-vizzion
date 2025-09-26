import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Saque, SaqueType, SaqueStatus, KeyType } from '../entities/saque.entity';
import { User } from '../entities/user.entity';
import { Extrato, ExtratoType } from '../entities/extrato.entity';
import { CreateSaqueDto } from '../dto/saque.dto';
import { MailService } from '../../mail/mail.service';

@Injectable()
export class SaqueService {
  constructor(
    @InjectRepository(Saque)
    private readonly saqueRepository: Repository<Saque>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Extrato)
    private readonly extratoRepository: Repository<Extrato>,
    private readonly mailService: MailService,
  ) {}

  async createSaque(userId: string, createSaqueDto: CreateSaqueDto) {
    console.log('🚀 createSaque - Iniciando:', {
      userId,
      createSaqueDto,
      timestamp: new Date().toISOString()
    });

    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      console.log('❌ Usuário não encontrado:', userId);
      throw new NotFoundException('Usuário não encontrado');
    }

    console.log('👤 Usuário encontrado:', {
      id: user.id,
      balance: user.balance,
      balance_invest: user.balance_invest,
      balance_block: user.balance_block
    });

    // Regra: só permite saque se houver valor investido
    if (Number(user.balance_invest) <= 0) {
      console.log('❌ Erro: Usuário sem saldo investido:', user.balance_invest);
      throw new BadRequestException('Você precisa ter saldo investido para realizar saques.');
    }

    console.log('✅ Usuário tem saldo investido:', user.balance_invest);

    // Verificar se o usuário tem saldo suficiente baseado no tipo de saque
    const { type, amount, cpf, key_type, key_value, notes } = createSaqueDto;
    
    console.log('🔍 Dados do saque:', {
      type,
      amount,
      cpf,
      key_type,
      key_value,
      notes
    });
    
    const currentBalance = type === SaqueType.BALANCE ? 
      Number(user.balance) : 
      Number(user.balance_invest);
    
    console.log('💰 Saldo atual:', {
      type,
      currentBalance,
      userBalance: user.balance,
      userBalanceInvest: user.balance_invest
    });
    
    if (currentBalance <= 0) {
      const balanceType = type === SaqueType.BALANCE ? 'saldo disponível' : 'saldo investido';
      console.log('❌ Erro: Saldo insuficiente:', { balanceType, currentBalance });
      throw new BadRequestException(`Você precisa ter ${balanceType} para realizar saques.`);
    }

    if (amount < 10) {
      console.log('❌ Erro: Valor mínimo não atingido:', amount);
      throw new BadRequestException('Saque mínimo é de R$ 10,00');
    }

    console.log('✅ Valor mínimo OK:', amount);

    // Validar tipo de saque
    if (!Object.values(SaqueType).includes(type)) {
      console.log('❌ Erro: Tipo de saque inválido:', type);
      throw new BadRequestException('Tipo de saque inválido');
    }

    console.log('✅ Tipo de saque OK:', type);

    // Validar tipo de chave
    if (!Object.values(KeyType).includes(key_type)) {
      console.log('❌ Erro: Tipo de chave inválido:', key_type);
      throw new BadRequestException('Tipo de chave inválido');
    }

    console.log('✅ Tipo de chave OK:', key_type);

    // Validar formato da chave baseado no tipo
    if (key_type === KeyType.CPF) {
      const cleanCpf = key_value.replace(/\D/g, '');
      if (cleanCpf.length !== 11) {
        console.log('❌ Erro: CPF inválido:', { key_value, cleanCpf, length: cleanCpf.length });
        throw new BadRequestException('CPF deve ter 11 dígitos');
      }
      console.log('✅ CPF OK:', cleanCpf);
    } else if (key_type === KeyType.EMAIL) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(key_value)) {
        console.log('❌ Erro: Email inválido:', key_value);
        throw new BadRequestException('Email inválido');
      }
      console.log('✅ Email OK:', key_value);
    } else if (key_type === KeyType.CONTATO) {
      const cleanPhone = key_value.replace(/\D/g, '');
      if (cleanPhone.length < 10 || cleanPhone.length > 11) {
        console.log('❌ Erro: Telefone inválido:', { key_value, cleanPhone, length: cleanPhone.length });
        throw new BadRequestException('Telefone deve ter 10 ou 11 dígitos');
      }
      console.log('✅ Telefone OK:', cleanPhone);
    }

    // Calcular taxa baseada no tipo
    const taxRate = type === SaqueType.BALANCE ? 0.05 : 0.25; // 5% para balance, 25% para balance_invest
    const tax = Number((amount * taxRate).toFixed(2));
    const finalAmount = Number((amount - tax).toFixed(2));

    // Verificar se o usuário tem saldo suficiente
    if (currentBalance < amount) {
      throw new BadRequestException(`Saldo insuficiente. Disponível: R$ ${currentBalance.toFixed(2)}`);
    }

    // Criar o saque
    const saque = this.saqueRepository.create({
      user_id: userId,
      type,
      amount,
      tax,
      final_amount: finalAmount,
      status: SaqueStatus.PENDING,
      cpf,
      key_type,
      key_value,
      notes
    });

    const savedSaque = await this.saqueRepository.save(saque);

    // Atualizar o saldo do usuário
    if (type === SaqueType.BALANCE) {
      await this.userRepository.update(userId, {
        balance: Number((Number(user.balance) - amount).toFixed(2))
      });
    } else {
      await this.userRepository.update(userId, {
        balance_invest: Number((Number(user.balance_invest) - amount).toFixed(2))
      });
    }

    // Criar extrato de saque
    const extrato = this.extratoRepository.create({
      user_id: userId,
      type: ExtratoType.WITHDRAWAL,
      amount: -amount, // Valor negativo para saque
      description: `Saque ${type === SaqueType.BALANCE ? 'Saldo Disponível' : 'Saldo Investido'} - Taxa: ${(taxRate * 100).toFixed(0)}% - Valor líquido: R$ ${finalAmount.toFixed(2)}`,
      reference_id: savedSaque.id,
      reference_type: 'saque',
      status: 1, // COMPLETED
      balance_before: currentBalance,
      balance_after: Number((currentBalance - amount).toFixed(2))
    });

    await this.extratoRepository.save(extrato);

    // Enviar email de confirmação de solicitação de saque
    try {
      const freshUser = await this.userRepository.findOne({ where: { id: userId }, select: ['email', 'nome', 'sobrenome'] });
      const displayName = freshUser ? (freshUser.nome || freshUser.email) : user.email;
      await this.mailService.sendTemplate({
        to: user.email,
        subject: 'Solicitação de Saque Recebida',
        template: 'withdrawal-request',
        variables: {
          name: displayName,
          withdraw_type: type === SaqueType.BALANCE ? 'Saldo Disponível (5% taxa)' : 'Saldo Investido (25% taxa)',
          amount: amount.toFixed(2),
          tax: tax.toFixed(2),
          final_amount: finalAmount.toFixed(2),
          cpf,
          key_type,
          key_value,
          protocol: savedSaque.id,
        },
      });
    } catch (mailErr) {
      // Não falhar a operação de saque se o email falhar; apenas logar
      console.error('Falha ao enviar e-mail de solicitação de saque:', mailErr);
    }

    console.log(`✅ Saque criado: R$ ${amount.toFixed(2)} | Taxa: R$ ${tax.toFixed(2)} | Líquido: R$ ${finalAmount.toFixed(2)} | Usuário: ${user.nome}`);

    return {
      success: true,
      message: `Saque solicitado com sucesso! Valor líquido: R$ ${finalAmount.toFixed(2)}`,
      saque: savedSaque,
      final_amount: finalAmount,
      tax: tax
    };
  }

  async getSaquesByUser(userId: string) {
    return this.saqueRepository.find({
      where: { user_id: userId },
      order: { created_at: 'DESC' }
    });
  }

  async getAllSaques() {
    return this.saqueRepository.find({
      relations: ['user'],
      order: { created_at: 'DESC' }
    });
  }

  async updateSaqueStatus(saqueId: string, status: SaqueStatus, notes?: string) {
    const saque = await this.saqueRepository.findOne({ where: { id: saqueId } });
    if (!saque) {
      throw new NotFoundException('Saque não encontrado');
    }

    await this.saqueRepository.update(saqueId, {
      status,
      notes: notes || saque.notes
    });

    return this.saqueRepository.findOne({ 
      where: { id: saqueId },
      relations: ['user']
    });
  }
}
