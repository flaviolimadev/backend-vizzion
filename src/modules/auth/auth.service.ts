import { Injectable, NotFoundException, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { User } from '../user/entities/user.entity';
import { UserToken } from './entities/user-token.entity';
import { PasswordReset } from './entities/password-reset.entity';
import { MailService } from '../mail/mail.service';

interface JwtPayload {
  sub: string;
  jti?: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(UserToken) private readonly tokens: Repository<UserToken>,
    @InjectRepository(PasswordReset) private readonly resets: Repository<PasswordReset>,
    private readonly mail: MailService,
  ) {}

  private async validateUser(email: string, password: string): Promise<User> {
    const user = await this.users.findOne({ where: { email }, select: ['id', 'email', 'password', 'email_verified'] });
    if (!user) throw new UnauthorizedException('Credenciais inválidas');

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) throw new UnauthorizedException('Credenciais inválidas');

    return user;
  }

  private async signAccessToken(userId: string): Promise<string> {
    const payload: JwtPayload = { sub: userId };
    return this.jwt.signAsync(payload);
  }

  private async signRefreshToken(userId: string, jti: string): Promise<string> {
    const payload: JwtPayload = { sub: userId, jti };
    const secret = this.config.get<string>('JWT_REFRESH_SECRET');
    const expiresIn = this.config.get<string>('JWT_REFRESH_EXPIRES_IN') || '7d';
    return this.jwt.signAsync(payload, { secret, expiresIn });
  }

  private async storeRefreshToken(userId: string, jti: string, refreshToken: string, expiresAt: Date) {
    const hash = await bcrypt.hash(refreshToken, 10);
    const entity = this.tokens.create({
      userId,
      jti,
      tokenHash: hash,
      isRevoked: false,
      expiresAt,
    });
    await this.tokens.save(entity);
  }

  async login(email: string, password: string) {
    const user = await this.validateUser(email, password);
    const mustVerify = this.config.get<boolean>('VERIFIED_EMAIL') === true;
    if (mustVerify && !(user as any).email_verified) {
      // Não emitir tokens; cliente deve redirecionar para /verify com userId
      throw new UnauthorizedException({ statusCode: 401, message: 'Email não verificado', userId: user.id });
    }
    const jti = randomUUID();

    const accessToken = await this.signAccessToken(user.id);

    const refreshToken = await this.signRefreshToken(user.id, jti);
    const decoded: any = this.jwt.decode(refreshToken);
    const expSec = typeof decoded === 'object' && decoded?.exp ? decoded.exp : undefined;
    const expiresAt = expSec ? new Date(expSec * 1000) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await this.storeRefreshToken(user.id, jti, refreshToken, expiresAt);

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
    };
  }

  async refresh(refreshToken: string) {
    const secret = this.config.get<string>('JWT_REFRESH_SECRET');
    let payload: JwtPayload;
    try {
      payload = await this.jwt.verifyAsync<JwtPayload>(refreshToken, { secret });
    } catch {
      throw new UnauthorizedException('Refresh token inválido');
    }

    const record = await this.tokens.findOne({ where: { jti: payload.jti!, userId: payload.sub } });
    if (!record || record.isRevoked) throw new ForbiddenException('Refresh token revogado');
    if (record.expiresAt.getTime() < Date.now()) throw new ForbiddenException('Refresh token expirado');

    const match = await bcrypt.compare(refreshToken, record.tokenHash);
    if (!match) throw new ForbiddenException('Refresh token inválido');

    // Rotaciona: revoga o atual e emite novos tokens
    record.isRevoked = true;
    await this.tokens.save(record);

    const newJti = randomUUID();
    const accessToken = await this.signAccessToken(payload.sub);
    const newRefreshToken = await this.signRefreshToken(payload.sub, newJti);
    const decoded: any = this.jwt.decode(newRefreshToken);
    const expSec = typeof decoded === 'object' && decoded?.exp ? decoded.exp : undefined;
    const expiresAt = expSec ? new Date(expSec * 1000) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await this.storeRefreshToken(payload.sub, newJti, newRefreshToken, expiresAt);

    return {
      access_token: accessToken,
      refresh_token: newRefreshToken,
    };
  }

  async logout(userId: string) {
    await this.tokens.update({ userId, isRevoked: false }, { isRevoked: true });
    return { loggedOut: true };
  }

  async requestPasswordReset(email: string) {
    const user = await this.users.findOne({ where: { email } });
    if (!user) throw new NotFoundException('Email não encontrado'); // retorna erro para email inexistente

    const tokenPlain = randomUUID();
    const hash = await bcrypt.hash(tokenPlain, 10);
    const minutes = this.config.get<number>('PASSWORD_RESET_EXPIRES_MIN') || 30;
    const expiresAt = new Date(Date.now() + minutes * 60 * 1000);

    await this.resets.save(this.resets.create({ userId: user.id, tokenHash: hash, expiresAt }));

    const appUrl = this.config.get<string>('APP_PUBLIC_URL');
    await this.mail.sendTemplate({
      to: user.email,
      subject: 'Redefinição de senha',
      template: 'password-reset',
      variables: {
        app_name: 'Base Backend',
        year: new Date().getFullYear(),
        name: user.nome || user.email,
        reset_url: `${appUrl}/reset-password?user=${user.id}&token=${tokenPlain}`,
        expires_minutes: minutes,
        requested_at: new Date().toISOString(),
        ip_address: '0.0.0.0',
        support_email: 'suporte@exemplo.com',
      },
    });

    return { requested: true };
  }

  async performPasswordReset(token: string, newPassword: string) {
    const all = await this.resets.find({ order: { createdAt: 'DESC' } });
    let match: PasswordReset | undefined;
    for (const r of all) {
      if (await bcrypt.compare(token, r.tokenHash)) {
        match = r;
        break;
      }
    }
    if (!match) throw new UnauthorizedException('Token inválido');
    if (match.expiresAt.getTime() < Date.now()) throw new UnauthorizedException('Token expirado');

    const user = await this.users.findOne({ where: { id: match.userId } });
    if (!user) throw new UnauthorizedException('Token inválido');

    const hashed = await bcrypt.hash(newPassword, 10);
    user.password = hashed;
    await this.users.save(user);

    // invalidar resets do usuário
    await this.resets.delete({ userId: user.id });

    return { reset: true };
  }

  async me(userId: string) {
    const user = await this.users.findOne({ where: { id: userId }, select: ['id', 'email', 'email_verified'] });
    if (!user) throw new UnauthorizedException('Usuário inválido');
    const mustVerify = this.config.get<boolean>('VERIFIED_EMAIL') === true;
    return {
      id: user.id,
      email: user.email,
      email_verified: (user as any).email_verified ?? false,
      mustVerify,
    };
  }
}


