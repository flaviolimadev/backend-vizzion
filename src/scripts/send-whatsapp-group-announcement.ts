import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { MailService } from '../modules/mail/mail.service';
import { DataSource } from 'typeorm';

const DELAY_BETWEEN_EMAILS = 3; // 3 segundos entre cada email
let successCount = 0;

async function sleep(seconds: number) {
  return new Promise(resolve => setTimeout(resolve, seconds * 1000));
}

async function sendWhatsAppGroupAnnouncement() {
  console.log('🚀 Inicializando envio de anúncio do Grupo WhatsApp...\n');

  // Criar aplicação NestJS
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });

  try {
    const mailService = app.get(MailService);
    const dataSource = app.get(DataSource);

    // Buscar todos os usuários ativos
    const users = await dataSource.query(`
      SELECT id, nome, sobrenome, email, contato 
      FROM users 
      WHERE email IS NOT NULL 
        AND email != '' 
        AND status = 1
      ORDER BY created_at ASC
    `);

    console.log(`📧 Encontrados ${users.length} usuários para envio\n`);

    if (users.length === 0) {
      console.log('⚠️  Nenhum usuário encontrado.');
      return;
    }

    // Confirmar antes de enviar
    console.log('⚠️  ATENÇÃO: Este script enviará emails para TODOS os usuários ativos.');
    console.log(`   Total de emails a enviar: ${users.length}`);
    console.log(`   Delay entre envios: ${DELAY_BETWEEN_EMAILS} segundos`);
    console.log(`   Tempo estimado: ${Math.ceil((users.length * DELAY_BETWEEN_EMAILS) / 60)} minutos\n`);

    let errorCount = 0;

    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      const userName = `${user.nome} ${user.sobrenome}`.trim() || 'Usuário';

      try {
        console.log(`[${i + 1}/${users.length}] Enviando para: ${user.email} (${userName})`);

        await mailService.sendTemplate({
          to: user.email,
          subject: '🎉 Grupo Oficial Vizzion Bot no WhatsApp - Participe Agora!',
          template: 'whatsapp-group-announcement' as any,
          variables: {
            app_name: 'Vizzion Bot',
            user_name: userName,
            action_url: process.env.FRONTEND_URL || 'https://app.vizzionbot.pro',
            year: new Date().getFullYear(),
          },
        });

        console.log(`   ✅ Enviado com sucesso!`);
        successCount++;

        // Aguardar antes do próximo envio (exceto no último)
        if (i < users.length - 1) {
          console.log(`   ⏳ Aguardando ${DELAY_BETWEEN_EMAILS} segundos...\n`);
          await sleep(DELAY_BETWEEN_EMAILS);
        }
      } catch (error: any) {
        console.error(`   ❌ Erro ao enviar: ${error.message}`);
        errorCount++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 RESUMO DO ENVIO');
    console.log('='.repeat(60));
    console.log(`✅ Emails enviados com sucesso: ${successCount}`);
    console.log(`❌ Erros: ${errorCount}`);
    console.log(`📧 Total processado: ${users.length}`);
    console.log('='.repeat(60) + '\n');

    console.log('✅ Processo concluído!');
  } catch (error: any) {
    console.error('❌ Erro fatal:', error.message);
    process.exit(1);
  } finally {
    await app.close();
  }
}

// Executar o script
sendWhatsAppGroupAnnouncement();
