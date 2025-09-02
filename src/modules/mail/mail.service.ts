import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import { readFile } from 'fs/promises';
import { join } from 'path';

type TemplateName =
  | 'welcome'
  | 'account-verification'
  | 'notice'
  | 'important-info'
  | 'alert'
  | 'password-reset'
  | 'password-changed'
  | 'password-set'
  | 'referral-notification';

@Injectable()
export class MailService {
  private readonly resend: Resend;
  private readonly from: string;

  constructor(private readonly config: ConfigService) {
    const apiKey = this.config.getOrThrow<string>('RESEND_API_KEY');
    this.from = this.config.getOrThrow<string>('MAIL_FROM');
    this.resend = new Resend(apiKey);
  }

  private replacePlaceholders(template: string, vars: Record<string, string | number | boolean | null | undefined>) {
    return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_m, key: string) => {
      const value = vars[key as keyof typeof vars];
      return value === undefined || value === null ? '' : String(value);
    });
  }

  private async loadTemplate(name: TemplateName): Promise<string> {
    const candidates = [
      // Build output (production)
      join(process.cwd(), 'dist', 'mail', 'templates', `${name}.html`),
      // Source (development)
      join(process.cwd(), 'src', 'mail', 'templates', `${name}.html`),
      // Relative to this file (fallback)
      join(__dirname, '..', '..', 'mail', 'templates', `${name}.html`),
    ];
    for (const file of candidates) {
      try {
        return await readFile(file, 'utf8');
      } catch {}
    }
    throw new InternalServerErrorException(`Template não encontrado: ${name}`);
  }

  async sendTemplate(params: {
    to: string | string[];
    subject: string;
    template: TemplateName;
    variables: Record<string, string | number | boolean | null | undefined>;
  }) {
    const htmlRaw = await this.loadTemplate(params.template);
    const html = this.replacePlaceholders(htmlRaw, params.variables);

    const { error } = await this.resend.emails.send({
      from: this.from,
      to: params.to,
      subject: params.subject,
      html,
    });

    if (error) {
      throw new InternalServerErrorException(error.message || 'Falha ao enviar e-mail');
    }
  }
}


