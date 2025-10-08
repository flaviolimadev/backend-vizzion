require('dotenv').config();
const { Pool } = require('pg');
const { Resend } = require('resend');
const fs = require('fs');
const path = require('path');

// Configuração
const DELAY_BETWEEN_EMAILS = 5; // 5 segundos entre cada email (respeitando rate limit)

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
});

const resend = new Resend(process.env.RESEND_API_KEY);

function sleep(seconds) {
  return new Promise(resolve => setTimeout(resolve, seconds * 1000));
}

function loadTemplate() {
  const templatePath = path.join(__dirname, 'src', 'mail', 'templates', 'live-ops-announcement.html');
  return fs.readFileSync(templatePath, 'utf8');
}

function replacePlaceholders(template, vars) {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, key) => {
    const value = vars[key];
    return value === undefined || value === null ? '' : String(value);
  });
}

async function sendLiveOpsAnnouncement() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Inicializando envio de anúncio OP AO VIVO...\n');

    // Carregar template
    const template = loadTemplate();
    console.log('✅ Template carregado com sucesso\n');

    // Buscar usuários
    const result = await client.query(`
      SELECT id, nome, sobrenome, email, contato, status
      FROM users 
      WHERE email IS NOT NULL 
        AND email != '' 
        AND email !~ '^[0-9]+$'
      ORDER BY created_at ASC
    `);

    const users = result.rows;
    console.log(`📧 Encontrados ${users.length} usuários para envio\n`);

    if (users.length === 0) {
      console.log('⚠️  Nenhum usuário encontrado.');
      return;
    }

    console.log('⚠️  ATENÇÃO: Este script enviará emails para TODOS os usuários ativos.');
    console.log(`   Total de emails a enviar: ${users.length}`);
    console.log(`   Delay entre envios: ${DELAY_BETWEEN_EMAILS} segundos`);
    console.log(`   Tempo estimado: ${Math.ceil((users.length * DELAY_BETWEEN_EMAILS) / 60)} minutos\n`);

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      const userName = `${user.nome} ${user.sobrenome}`.trim() || 'Usuário';

      try {
        console.log(`[${i + 1}/${users.length}] Enviando para: ${user.email} (${userName})`);

        const html = replacePlaceholders(template, {
          app_name: 'Vizzion Bot',
          user_name: userName,
          action_url: process.env.FRONTEND_URL || 'https://app.vizzionbot.pro',
          year: new Date().getFullYear(),
        });

        // Garantir formato correto do from
        const fromEmail = process.env.MAIL_FROM 
          ? process.env.MAIL_FROM.replace(/^["']|["']$/g, '') // Remove aspas se houver
          : 'Vizzion Bot <no-reply@vizzionbot.pro>';

        const { error } = await resend.emails.send({
          from: fromEmail,
          to: user.email,
          subject: '🎉 Nova Funcionalidade: Acompanhe suas Operações ao Vivo!',
          html: html,
        });

        if (error) {
          throw new Error(error.message || 'Falha ao enviar e-mail');
        }

        console.log(`   ✅ Enviado com sucesso!`);
        successCount++;

        // Aguardar antes do próximo envio (exceto no último)
        if (i < users.length - 1) {
          console.log(`   ⏳ Aguardando ${DELAY_BETWEEN_EMAILS} segundos...\n`);
          await sleep(DELAY_BETWEEN_EMAILS);
        }
      } catch (error) {
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
  } catch (error) {
    console.error('❌ Erro fatal:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// Executar o script
sendLiveOpsAnnouncement();

