import { Injectable, NotFoundException, ConflictException, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { Extrato } from './entities/extrato.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ConfigService } from '@nestjs/config';
import { MailService } from '../mail/mail.service';
import { AvatarService } from './avatar.service';
import { randomBytes } from 'crypto';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User) private repo: Repository<User>,
    @InjectRepository(Extrato) private extratoRepository: Repository<Extrato>,
    private readonly config: ConfigService,
    private readonly mail: MailService,
    private readonly avatarService: AvatarService,
  ) {}

  private async hashPassword(raw: string) {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(raw, salt);
  }

  async create(dto: CreateUserDto) {
    // aplica hash
    const hashed = await this.hashPassword(dto.password);
    
    // Limpar o número de telefone removendo caracteres especiais, mas mantendo o + inicial
    const cleanPhone = dto.contato.replace(/[^\d+]/g, '');
    
    const entity = this.repo.create({
      ...dto,
      email: dto.email.toLowerCase(), // Garantir que email seja minúsculo
      contato: cleanPhone, // Usar número limpo
      password: hashed,
      status: 0,
      deleted: false,
      avatar: null,
    });

    try {
      const saved = await this.repo.save(entity);

      const verifiedTrue = this.config.get<boolean>('VERIFIED_EMAIL') || this.config.get<boolean>('VERIFIED-EMAIL');
      if (verifiedTrue) {
        const code = (randomBytes(3).toString('hex')).toUpperCase(); // 6 hex chars
        const hash = await bcrypt.hash(code, 10);
        const expires = new Date(Date.now() + 30 * 60 * 1000); // 30 min

        await this.repo.update(saved.id, {
          verification_code_hash: hash,
          verification_expires_at: expires,
        });

        const appUrl = this.config.get<string>('APP_PUBLIC_URL');
        await this.mail.sendTemplate({
          to: saved.email,
          subject: 'Confirme seu e-mail',
          template: 'account-verification',
          variables: {
            app_name: 'VisionBot',
            year: new Date().getFullYear(),
            verification_url: `${appUrl}/verify-account?user=${saved.id}`,
            name: saved.nome || saved.email,
            code,
          },
        });
      }

      // Se o usuário foi indicado, enviar email de notificação em cadeia (até o 20º nível)
      if (saved.referred_at) {
        try {
          const appUrl = this.config.get<string>('APP_PUBLIC_URL');
          let currentReferrerId: string | null | undefined = saved.referred_at;
          for (let level = 1; level <= 20 && currentReferrerId; level++) {
            const referrer = await this.repo.findOne({
              where: { id: currentReferrerId },
              select: ['id', 'nome', 'sobrenome', 'email', 'referred_at']
            });
            if (!referrer) break;

            console.log(`📧 Enviando email de notificação de indicação (nível ${level}) para:`, referrer.email);
            await this.mail.sendTemplate({
              to: referrer.email,
              subject: 'Nova indicação registrada!',
              template: 'referral-notification',
              variables: {
                app_name: 'VisionBot',
                year: new Date().getFullYear(),
                referrer_name: referrer.nome || referrer.email,
                new_user_name: `${saved.nome} ${saved.sobrenome}`,
                new_user_email: saved.email,
                new_user_contact: saved.contato,
                dashboard_url: `${appUrl}/settings`,
                cta_label: 'Ver indicações',
                level,
              },
            });
            console.log(`✅ Email de notificação de indicação (nível ${level}) enviado`);

            currentReferrerId = referrer.referred_at;
          }
        } catch (emailError) {
          console.error('❌ Erro ao enviar emails de notificação de indicação em cadeia:', emailError);
          // Não falha o cadastro se emails falharem
        }
      }

      return saved;
    } catch (e: any) {
      // erro de violação de unique (email/contato)
      if (e.code === '23505') {
        throw new ConflictException('Email ou contato já está em uso');
      }
      throw e;
    }
  }

  async findAll() {
    return this.repo.find();
  }

  async findOne(id: string) {
    const user = await this.repo.findOne({ 
      where: { id },
      select: ['id', 'nome', 'sobrenome', 'email', 'contato', 'avatar']
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async update(id: string, dto: UpdateUserDto) {
    const user = await this.findOne(id);

    // re-hash se senha foi enviada
    let password = user.password;
    if (dto.password) {
      password = await this.hashPassword(dto.password);
    }

    Object.assign(user, { ...dto, password });

    try {
      return await this.repo.save(user);
    } catch (e: any) {
      if (e.code === '23505') {
        throw new ConflictException('Email ou contato já está em uso');
      }
      throw e;
    }
  }

  async remove(id: string) {
    const user = await this.findOne(id);
    await this.repo.remove(user);
    return { deleted: true };
  }

  async verifyEmail(userId: string, code: string) {
    const user = await this.repo.findOne({
      where: { id: userId },
      select: ['id', 'email', 'nome', 'email_verified', 'verification_code_hash', 'verification_expires_at'],
    });
    if (!user) throw new NotFoundException('User not found');
    if (user.email_verified) return { verified: true };
    if (!user.verification_code_hash || !user.verification_expires_at) throw new BadRequestException('Código inválido');
    if (user.verification_expires_at.getTime() < Date.now()) throw new BadRequestException('Código expirado');

    const ok = await bcrypt.compare(code, user.verification_code_hash);
    if (!ok) throw new BadRequestException('Código inválido');

    await this.repo.update(userId, {
      email_verified: true,
      verification_code_hash: null,
      verification_expires_at: null,
    });

    // Envia email de boas-vindas
    const appUrl = this.config.get<string>('APP_PUBLIC_URL');
    await this.mail.sendTemplate({
      to: user.email,
      subject: 'Bem-vindo(a)!',
      template: 'welcome',
      variables: {
        app_name: 'Base Backend',
        year: new Date().getFullYear(),
        name: user.nome || user.email,
        action_url: `${appUrl}/dashboard`,
        cta_label: 'Acessar painel',
      },
    });

    return { verified: true };
  }

  async resendVerificationCode(userId: string) {
    const user = await this.repo.findOne({
      where: { id: userId },
      select: ['id', 'email', 'nome', 'email_verified'],
    });
    if (!user) throw new NotFoundException('User not found');
    if (user.email_verified) throw new BadRequestException('Email já verificado');

    // Gerar novo código
    const code = (randomBytes(3).toString('hex')).toUpperCase(); // 6 hex chars
    const hash = await bcrypt.hash(code, 10);
    const expires = new Date(Date.now() + 30 * 60 * 1000); // 30 min

    await this.repo.update(userId, {
      verification_code_hash: hash,
      verification_expires_at: expires,
    });

    // Enviar novo email
    const appUrl = this.config.get<string>('APP_PUBLIC_URL');
    await this.mail.sendTemplate({
      to: user.email,
      subject: 'Novo código de verificação',
      template: 'account-verification',
      variables: {
        app_name: 'Base Backend',
        year: new Date().getFullYear(),
        verification_url: `${appUrl}/verify?user=${userId}`,
        name: user.nome || user.email,
        code,
      },
    });

    return { sent: true };
  }

  async getMe(userId: string) {
    const user = await this.repo.findOne({ 
      where: { id: userId }, 
      select: ['id', 'nome', 'sobrenome', 'email', 'contato', 'avatar', 'referred_at', 'plano', 'balance_invest', 'balance', 'balance_block', 'role'] 
    });
    if (!user) throw new NotFoundException('Usuário não encontrado');
    
    // Adicionar URL do avatar se existir

    const userData = {
      id: user.id,
      nome: user.nome,
      sobrenome: user.sobrenome,
      email: user.email,
      contato: user.contato,
      avatar: user.avatar ? await this.avatarService.getAvatarDisplayUrl(user.avatar) : null,
      referred_at: user.referred_at,
      plano: user.plano,
      role: user.role,
      balance_invest: Number(user.balance_invest),
      balance: Number(user.balance),
      balance_block: Number(user.balance_block),
    };
    
    return userData;
  }

  async updateMe(userId: string, dto: UpdateUserDto) {
    const user = await this.repo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuário não encontrado');
    
    await this.repo.update(userId, dto);
    return { updated: true };
  }

  async checkPassword(userId: string) {
    const user = await this.repo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    // Verificar se o usuário tem senha cadastrada
    const hasPassword = !!user.password;
    
    return { hasPassword };
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    console.log('🔐 changePassword called with:', { userId, currentPassword: currentPassword ? '***' : 'EMPTY', newPassword: newPassword ? '***' : 'EMPTY' });
    
    // Validar parâmetros
    if (!newPassword) {
      console.log('❌ Nova senha vazia');
      throw new BadRequestException('Nova senha é obrigatória');
    }

    if (newPassword.length < 8) {
      console.log('❌ Nova senha muito curta:', { newLength: newPassword.length });
      throw new BadRequestException('A nova senha deve ter pelo menos 8 caracteres');
    }

    const user = await this.repo.findOne({ where: { id: userId } });
    if (!user) {
      console.log('❌ Usuário não encontrado:', userId);
      throw new NotFoundException('Usuário não encontrado');
    }

    console.log('👤 Usuário encontrado:', { id: user.id, email: user.email, hasPassword: !!user.password });

    // Se o usuário não tem senha, definir senha inicial
    if (!user.password) {
      console.log('🔐 Definindo senha inicial...');
      const hashedNewPassword = await bcrypt.hash(newPassword, 10);
      await this.repo.update(userId, { password: hashedNewPassword });
      
      // Enviar email de senha inicial definida
      try {
        const appUrl = this.config.get<string>('APP_PUBLIC_URL');
        await this.mail.sendTemplate({
          to: user.email,
          subject: 'Senha inicial definida com sucesso',
          template: 'password-set',
          variables: {
            app_name: 'VisionBot',
            year: new Date().getFullYear(),
            name: user.nome || user.email,
            action_url: `${appUrl}/settings`,
            cta_label: 'Acessar configurações',
          },
        });
        console.log('📧 Email de senha inicial enviado');
      } catch (emailError) {
        console.error('❌ Erro ao enviar email de senha inicial:', emailError);
      }
      
      console.log('✅ Senha inicial definida com sucesso');
      return { changed: true, message: 'Senha inicial definida com sucesso' };
    }

    // Se o usuário tem senha, verificar senha atual
    if (!currentPassword) {
      console.log('❌ Senha atual obrigatória para usuários com senha cadastrada');
      throw new BadRequestException('Senha atual é obrigatória');
    }

    if (currentPassword.length < 8) {
      console.log('❌ Senha atual muito curta:', { currentLength: currentPassword.length });
      throw new BadRequestException('A senha atual deve ter pelo menos 8 caracteres');
    }

    // Verificar se a senha atual está correta
    console.log('🔍 Verificando senha atual...');
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    console.log('✅ Resultado da verificação:', isCurrentPasswordValid);
    
    if (!isCurrentPasswordValid) {
      throw new UnauthorizedException('Senha atual incorreta');
    }

    // Hash da nova senha
    console.log('🔐 Gerando hash da nova senha...');
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    await this.repo.update(userId, { password: hashedNewPassword });
    
    // Enviar email de senha alterada
    try {
      const appUrl = this.config.get<string>('APP_PUBLIC_URL');
      await this.mail.sendTemplate({
        to: user.email,
        subject: 'Senha alterada com sucesso',
        template: 'password-changed',
        variables: {
          app_name: 'VisionBot',
          year: new Date().getFullYear(),
          name: user.nome || user.email,
          action_url: `${appUrl}/settings`,
          cta_label: 'Acessar configurações',
        },
      });
      console.log('📧 Email de senha alterada enviado');
    } catch (emailError) {
      console.error('❌ Erro ao enviar email de senha alterada:', emailError);
    }
    
    console.log('✅ Senha alterada com sucesso');
    return { changed: true, message: 'Senha alterada com sucesso' };
  }

  async updateAvatar(userId: string, avatarKey: string) {
    const user = await this.repo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuário não encontrado');

    // Se já tinha avatar, deletar o anterior
    if (user.avatar) {
      try {
        await this.avatarService.deleteAvatar(user.avatar);
      } catch (error) {
        console.error('Erro ao deletar avatar anterior:', error);
      }
    }

    // Atualizar com nova chave do avatar
    await this.repo.update(userId, { avatar: avatarKey });
    
    const avatarUrl = await this.avatarService.getAvatarDisplayUrl(avatarKey);
    return { 
      updated: true, 
      avatarUrl
    };
  }

  async deleteAvatar(userId: string) {
    const user = await this.repo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuário não encontrado');

    if (user.avatar) {
      try {
        await this.avatarService.deleteAvatar(user.avatar);
      } catch (error) {
        console.error('Erro ao deletar avatar:', error);
      }
    }

    // Remover referência do avatar
    await this.repo.update(userId, { avatar: null });
    
    return { deleted: true };
  }

  async getReferrals(userId: string) {
    const referrals = await this.repo.find({
      where: { referred_at: userId },
      select: ['id', 'nome', 'sobrenome', 'email', 'created_at'],
      order: { created_at: 'DESC' }
    });
    
    return referrals;
  }

  async getReferralStats(userId: string) {
    const totalReferrals = await this.repo.count({
      where: { referred_at: userId }
    });
    
    return {
      totalReferrals,
      referralLink: `${process.env.FRONTEND_URL}/register?ref=${userId}`
    };
  }

  async getLicenseSales(userId: string) {
    // Buscar todos os usuários que este usuário indicou e que têm plano diferente de 0
    const referredUsers = await this.repo.find({
      where: { referred_at: userId },
      select: ['id', 'nome', 'sobrenome', 'email', 'plano', 'created_at'],
      relations: ['planoObj']
    });

    // Mapear valores dos planos (baseado no webhook-payment-processor.service.ts)
    const planValues = {
      1: 4,     // Plano Iniciante (R$ 4,00)
      2: 20,    // Plano Iniciante (R$ 20,00)
      3: 100,   // Plano Intermediário (R$ 100,00)
      4: 500,   // Plano Avançado (R$ 500,00)
      5: 1000,  // Plano Profissional (R$ 1.000,00)
      6: 2000,  // Plano Expert (R$ 2.000,00)
      7: 5000,  // Plano Master (R$ 5.000,00)
      8: 10000, // Plano Elite (R$ 10.000,00)
      9: 15000, // Plano Premium (R$ 15.000,00)
      10: 20000 // Plano VIP (R$ 20.000,00)
    };

    // Calcular vendas totais
    let totalSales = 0;
    const salesDetails = [];

    for (const user of referredUsers) {
      if (user.plano && user.plano > 0) {
        const planValue = planValues[user.plano] || 0;
        totalSales += planValue;
        
        salesDetails.push({
          userId: user.id,
          nome: user.nome,
          sobrenome: user.sobrenome,
          email: user.email,
          plano: user.plano,
          valor: planValue,
          created_at: user.created_at
        });
      }
    }

    // Meta da promoção: R$ 30.000
    const targetAmount = 30000;
    const progressPercentage = Math.min((totalSales / targetAmount) * 100, 100);

    return {
      totalSales,
      targetAmount,
      progressPercentage: Math.round(progressPercentage * 100) / 100,
      salesCount: salesDetails.length,
      salesDetails,
      remainingAmount: Math.max(targetAmount - totalSales, 0)
    };
  }

  async getReferralTree(userId: string, maxLevel: number = 6): Promise<any> {
    const buildTree = async (parentId: string, currentLevel: number): Promise<any> => {
      if (currentLevel > maxLevel) return null;

      const directReferrals = await this.repo.find({
        where: { referred_at: parentId },
        select: ['id', 'nome', 'sobrenome', 'email', 'created_at'],
        order: { created_at: 'DESC' }
      });

      const tree: any = {
        level: currentLevel,
        totalDirect: directReferrals.length,
        totalInNetwork: 0,
        referrals: []
      };

      for (const referral of directReferrals) {
        const subTree = await buildTree(referral.id, currentLevel + 1);
        const referralData = {
          id: referral.id,
          nome: referral.nome,
          sobrenome: referral.sobrenome,
          email: referral.email,
          created_at: referral.created_at,
          level: currentLevel,
          directReferrals: subTree ? subTree.totalDirect : 0,
          totalInNetwork: subTree ? subTree.totalInNetwork : 0,
          children: subTree ? subTree.referrals : []
        };
        
        tree.referrals.push(referralData);
        tree.totalInNetwork += 1 + (subTree ? subTree.totalInNetwork : 0);
      }

      return tree;
    };

    return await buildTree(userId, 1);
  }

  async getReferralStatsByLevel(userId: string): Promise<any> {
    const stats: any = {
      totalReferrals: 0,
      levelStats: []
    };

    for (let level = 1; level <= 10; level++) {
      const count = await this.getReferralsByLevel(userId, level);
      
      // Percentuais corretos para licenças (10 níveis)
      let percentage = 0;
      switch (level) {
        case 1: percentage = 15; break;
        case 2: percentage = 5; break;
        case 3: percentage = 3; break;
        case 4: percentage = 2; break;
        case 5: percentage = 1; break;
        case 6: percentage = 1; break;
        case 7: percentage = 1; break;
        case 8: percentage = 1; break;
        case 9: percentage = 0.5; break;
        case 10: percentage = 0.5; break;
      }
      
      stats.levelStats.push({
        level,
        count,
        percentage
      });
      stats.totalReferrals += count;
    }

    return stats;
  }

  async getReferralEarnings(userId: string): Promise<any> {
    // Buscar ganhos de indicação direta (Nível 1)
    const directEarnings = await this.extratoRepository
      .createQueryBuilder('extrato')
      .where('extrato.user_id = :userId', { userId })
      .andWhere('extrato.type = :type', { type: 'referral' })
      .andWhere('extrato.description LIKE :pattern', { pattern: '%Nível 1%' })
      .select('SUM(extrato.amount)', 'total')
      .getRawOne();

    // Buscar ganhos de indicação indireta (Níveis 2-10)
    const indirectEarnings = await this.extratoRepository
      .createQueryBuilder('extrato')
      .where('extrato.user_id = :userId', { userId })
      .andWhere('extrato.type = :type', { type: 'referral' })
      .andWhere('extrato.description NOT LIKE :pattern', { pattern: '%Nível 1%' })
      .andWhere('extrato.description LIKE :levelPattern', { levelPattern: '%Nível%' })
      .select('SUM(extrato.amount)', 'total')
      .getRawOne();

    // Buscar ganhos de bônus (tipo 'bonus')
    const bonusEarnings = await this.extratoRepository
      .createQueryBuilder('extrato')
      .where('extrato.user_id = :userId', { userId })
      .andWhere('extrato.type = :type', { type: 'bonus' })
      .select('SUM(extrato.amount)', 'total')
      .getRawOne();

    return {
      directEarnings: parseFloat(directEarnings?.total || '0'),
      indirectEarnings: parseFloat(indirectEarnings?.total || '0'),
      bonusEarnings: parseFloat(bonusEarnings?.total || '0'),
      totalReferralEarnings: parseFloat(directEarnings?.total || '0') + parseFloat(indirectEarnings?.total || '0') + parseFloat(bonusEarnings?.total || '0')
    };
  }

  private async getReferralsByLevel(userId: string, level: number): Promise<number> {
    if (level === 1) {
      return await this.repo.count({
        where: { referred_at: userId }
      });
    }

    // Para níveis mais profundos, precisamos fazer uma busca recursiva
    const getLevelCount = async (parentIds: string[], currentLevel: number): Promise<number> => {
      if (currentLevel > level || parentIds.length === 0) return 0;
      
      const referrals = await this.repo.find({
        where: { referred_at: In(parentIds) },
        select: ['id']
      });

      if (currentLevel === level) {
        return referrals.length;
      }

      const childIds = referrals.map(r => r.id);
      return await getLevelCount(childIds, currentLevel + 1);
    };

    return await getLevelCount([userId], 1);
  }
}
