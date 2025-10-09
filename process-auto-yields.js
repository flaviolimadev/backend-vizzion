#!/usr/bin/env node

/**
 * Script para processar rendimentos automáticos
 * 
 * Este script:
 * 1. Busca todos os usuários com trading_mode = 'auto' e balance_invest > 0
 * 2. Calcula rendimento de 1.4% sobre o balance_invest
 * 3. Cria extrato de rendimento
 * 4. Atualiza o balance do usuário
 * 
 * Uso: node process-auto-yields.js
 */

require('dotenv').config();
const { Client } = require('pg');

// Configuração do banco de dados
const client = new Client({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_DATABASE || 'vizzionbot',
});

async function main() {
  const startTime = Date.now();
  console.log(`[${new Date().toISOString()}] 🚀 Iniciando processamento de rendimentos automáticos...`);

  try {
    await client.connect();
    console.log('✅ Conexão com banco de dados estabelecida');

    // Buscar todos os usuários com trading_mode = 'auto' e balance_invest > 0
    const usersQuery = `
      SELECT id, nome, sobrenome, email, balance_invest, balance
      FROM users 
      WHERE trading_mode = 'auto' 
        AND deleted = false 
        AND balance_invest > 0
    `;

    const usersResult = await client.query(usersQuery);
    const users = usersResult.rows;

    console.log(`📊 Encontrados ${users.length} usuários com trading automático e saldo > 0`);

    if (users.length === 0) {
      console.log('ℹ️ Nenhum usuário encontrado para processar');
      return;
    }

    const YIELD_PERCENTAGE = 1.4; // 1.4%
    let processed = 0;
    let totalCredited = 0;
    let errors = 0;

    // Processar cada usuário
    for (const user of users) {
      try {
        const balanceInvest = parseFloat(user.balance_invest);
        const yieldAmount = Number((balanceInvest * (YIELD_PERCENTAGE / 100)).toFixed(2));

        if (yieldAmount <= 0) {
          console.log(`⚠️ Valor de rendimento inválido para usuário ${user.email}: R$ ${yieldAmount}`);
          continue;
        }

        // Calcular saldo atual baseado nos extratos
        const balanceQuery = `
          SELECT COALESCE(SUM(amount), 0) as total
          FROM extratos 
          WHERE user_id = $1 
            AND status = 1 
            AND type IN ('profit', 'referral', 'bonus', 'withdrawal')
        `;

        const balanceResult = await client.query(balanceQuery, [user.id]);
        const currentBalance = Number(parseFloat(balanceResult.rows[0]?.total || '0').toFixed(2));
        const newBalance = Number((currentBalance + yieldAmount).toFixed(2));

        // Criar extrato de rendimento automático
        const extratoQuery = `
          INSERT INTO extratos (
            user_id, type, amount, description, balance_before, balance_after, 
            status, reference_type, metadata, created_at, updated_at
          ) VALUES (
            $1, 'profit', $2, $3, $4, $5, 1, 'auto_yield', $6, NOW(), NOW()
          )
        `;

        const metadata = JSON.stringify({
          yield_percentage: YIELD_PERCENTAGE,
          base_amount: balanceInvest,
          processed_at: new Date().toISOString(),
          script_version: '1.0'
        });

        await client.query(extratoQuery, [
          user.id,
          yieldAmount,
          `Rendimento Automático (${YIELD_PERCENTAGE}%)`,
          currentBalance,
          newBalance,
          metadata
        ]);

        // Atualizar balance do usuário
        const updateBalanceQuery = `
          UPDATE users 
          SET balance = balance + $1, updated_at = NOW()
          WHERE id = $2
        `;

        await client.query(updateBalanceQuery, [yieldAmount, user.id]);

        processed++;
        totalCredited += yieldAmount;

        console.log(`✅ ${user.nome} ${user.sobrenome} (${user.email}): +R$ ${yieldAmount.toFixed(2)} | Saldo anterior: R$ ${currentBalance.toFixed(2)} | Novo saldo: R$ ${newBalance.toFixed(2)}`);

        // Pequena pausa para não sobrecarregar o banco
        await new Promise(resolve => setTimeout(resolve, 50));

      } catch (error) {
        errors++;
        console.error(`❌ Erro ao processar usuário ${user.email}:`, error);
      }
    }

    const duration = Date.now() - startTime;
    console.log(`\n📈 RESUMO DO PROCESSAMENTO:`);
    console.log(`⏱️ Tempo total: ${duration}ms`);
    console.log(`👥 Usuários processados: ${processed}/${users.length}`);
    console.log(`💰 Total creditado: R$ ${totalCredited.toFixed(2)}`);
    console.log(`❌ Erros: ${errors}`);
    console.log(`📊 Taxa de rendimento: ${YIELD_PERCENTAGE}%`);

    if (errors > 0) {
      console.log(`⚠️ ${errors} usuários tiveram erro no processamento`);
    }

  } catch (error) {
    console.error(`[${new Date().toISOString()}] ❌ Erro no script de rendimentos automáticos:`, error);
    throw error;
  } finally {
    await client.end();
    console.log('🔌 Conexão com banco de dados encerrada');
  }
}

// Executar o script
main()
  .then(() => {
    console.log(`[${new Date().toISOString()}] ✅ Script de rendimentos automáticos concluído com sucesso`);
    process.exit(0);
  })
  .catch((error) => {
    console.error(`[${new Date().toISOString()}] ❌ Script de rendimentos automáticos falhou:`, error);
    process.exit(1);
  });
