#!/usr/bin/env ts-node

/**
 * Script executável para processar rendimentos automáticos
 * 
 * Este script:
 * 1. Busca todos os usuários com trading_mode = 'auto' e balance_invest > 0
 * 2. Calcula rendimento de 1.4% sobre o balance_invest
 * 3. Cria extrato de rendimento
 * 4. Atualiza o balance do usuário
 * 
 * Uso: 
 *   ts-node run-auto-yields.ts
 *   ou
 *   npx ts-node run-auto-yields.ts
 */

import { Client } from 'pg';

interface User {
  id: string;
  nome: string;
  sobrenome: string;
  email: string;
  balance_invest: number;
  balance: number;
}

interface ProcessResult {
  processed: number;
  totalCredited: number;
  errors: number;
  duration: number;
}

class AutoYieldProcessor {
  private client: Client;
  private readonly YIELD_PERCENTAGE = 1.4;

  constructor() {
    this.client = new Client({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      user: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'password',
      database: process.env.DB_DATABASE || 'vizzionbot',
    });
  }

  async connect(): Promise<void> {
    await this.client.connect();
    console.log('✅ Conexão com banco de dados estabelecida');
  }

  async disconnect(): Promise<void> {
    await this.client.end();
    console.log('🔌 Conexão com banco de dados encerrada');
  }

  async getAutoUsers(): Promise<User[]> {
    const query = `
      SELECT id, nome, sobrenome, email, balance_invest, balance
      FROM users 
      WHERE trading_mode = 'auto' 
        AND deleted = false 
        AND balance_invest > 0
      ORDER BY balance_invest DESC
    `;

    const result = await this.client.query(query);
    return result.rows;
  }

  async getCurrentBalance(userId: string): Promise<number> {
    const query = `
      SELECT COALESCE(SUM(amount), 0) as total
      FROM extratos 
      WHERE user_id = $1 
        AND status = 1 
        AND type IN ('YIELD', 'REFERRAL', 'BONUS', 'WITHDRAWAL')
    `;

    const result = await this.client.query(query, [userId]);
    return Number(parseFloat(result.rows[0]?.total || '0').toFixed(2));
  }

  async processUser(user: User): Promise<{ success: boolean; yieldAmount: number; error?: string }> {
    try {
      const balanceInvest = parseFloat(user.balance_invest.toString());
      const yieldAmount = Number((balanceInvest * (this.YIELD_PERCENTAGE / 100)).toFixed(2));

      if (yieldAmount <= 0) {
        return { success: false, yieldAmount: 0, error: 'Valor de rendimento inválido' };
      }

      const currentBalance = await this.getCurrentBalance(user.id);
      const newBalance = Number((currentBalance + yieldAmount).toFixed(2));

      // Criar extrato de rendimento automático
      const extratoQuery = `
        INSERT INTO extratos (
          user_id, type, amount, description, balance_before, balance_after, 
          status, reference_type, metadata, created_at, updated_at
        ) VALUES (
          $1, 'YIELD', $2, $3, $4, $5, 1, 'auto_yield', $6, NOW(), NOW()
        )
      `;

      const metadata = JSON.stringify({
        yield_percentage: this.YIELD_PERCENTAGE,
        base_amount: balanceInvest,
        processed_at: new Date().toISOString(),
        script_version: '1.0'
      });

      await this.client.query(extratoQuery, [
        user.id,
        yieldAmount,
        `Rendimento Automático (${this.YIELD_PERCENTAGE}%)`,
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

      await this.client.query(updateBalanceQuery, [yieldAmount, user.id]);

      console.log(`✅ ${user.nome} ${user.sobrenome} (${user.email}): +R$ ${yieldAmount.toFixed(2)} | Saldo anterior: R$ ${currentBalance.toFixed(2)} | Novo saldo: R$ ${newBalance.toFixed(2)}`);

      return { success: true, yieldAmount };

    } catch (error) {
      return { 
        success: false, 
        yieldAmount: 0, 
        error: error instanceof Error ? error.message : 'Erro desconhecido' 
      };
    }
  }

  async processAllUsers(): Promise<ProcessResult> {
    const startTime = Date.now();
    console.log(`[${new Date().toISOString()}] 🚀 Iniciando processamento de rendimentos automáticos...`);

    const users = await this.getAutoUsers();
    console.log(`📊 Encontrados ${users.length} usuários com trading automático e saldo > 0`);

    if (users.length === 0) {
      console.log('ℹ️ Nenhum usuário encontrado para processar');
      return { processed: 0, totalCredited: 0, errors: 0, duration: Date.now() - startTime };
    }

    let processed = 0;
    let totalCredited = 0;
    let errors = 0;

    // Processar cada usuário
    for (const user of users) {
      const result = await this.processUser(user);
      
      if (result.success) {
        processed++;
        totalCredited += result.yieldAmount;
      } else {
        errors++;
        console.error(`❌ Erro ao processar usuário ${user.email}: ${result.error}`);
      }

      // Pequena pausa para não sobrecarregar o banco
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    const duration = Date.now() - startTime;

    console.log(`\n📈 RESUMO DO PROCESSAMENTO:`);
    console.log(`⏱️ Tempo total: ${duration}ms`);
    console.log(`👥 Usuários processados: ${processed}/${users.length}`);
    console.log(`💰 Total creditado: R$ ${totalCredited.toFixed(2)}`);
    console.log(`❌ Erros: ${errors}`);
    console.log(`📊 Taxa de rendimento: ${this.YIELD_PERCENTAGE}%`);

    if (errors > 0) {
      console.log(`⚠️ ${errors} usuários tiveram erro no processamento`);
    }

    return { processed, totalCredited, errors, duration };
  }
}

async function main() {
  const processor = new AutoYieldProcessor();
  
  try {
    await processor.connect();
    await processor.processAllUsers();
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ❌ Erro no script de rendimentos automáticos:`, error);
    process.exit(1);
  } finally {
    await processor.disconnect();
  }
}

// Executar o script
if (require.main === module) {
  main()
    .then(() => {
      console.log(`[${new Date().toISOString()}] ✅ Script de rendimentos automáticos concluído com sucesso`);
      process.exit(0);
    })
    .catch((error) => {
      console.error(`[${new Date().toISOString()}] ❌ Script de rendimentos automáticos falhou:`, error);
      process.exit(1);
    });
}
