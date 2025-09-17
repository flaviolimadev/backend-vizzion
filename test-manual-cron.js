const { Client } = require('pg');

const client = new Client({
  host: 'easypainel.ctrlser.com',
  port: 5432,
  database: 'vizionbot',
  user: 'postgres',
  password: 'dbc87486ba5d6b890cdc'
});

async function testManualCron() {
  try {
    await client.connect();
    
    // Simular o que o cron deveria fazer
    console.log('🔄 Simulando processamento de pagamentos aprovados...');
    
    // Buscar pagamentos com status APPROVED (1)
    const result = await client.query(`
      SELECT p.*, u.nome, u.plano, u.balance_invest
      FROM pagamentos p
      JOIN users u ON p.user_id = u.id
      WHERE p.status = 1
      ORDER BY p.created_at DESC
      LIMIT 5
    `);
    
    console.log(`🎁 Encontrados ${result.rows.length} pagamentos aprovados`);
    
    for (const payment of result.rows) {
      console.log(`\n=== Processando pagamento ${payment.id} ===`);
      console.log('Usuário:', payment.nome);
      console.log('Descrição:', payment.description);
      console.log('Valor:', payment.value);
      console.log('Status atual:', payment.status);
      
      // Simular a transação atômica
      const updateResult = await client.query(`
        UPDATE pagamentos 
        SET status = 2, updated_at = NOW()
        WHERE id = $1 AND status = 1
        RETURNING id
      `, [payment.id]);
      
      if (updateResult.rows.length === 0) {
        console.log('⚠️ Pagamento já foi processado por outro processo');
        continue;
      }
      
      console.log('✅ Status atualizado para CONFIRMED');
      
      // Processar o pagamento
      const valorEmReais = payment.value / 100;
      
      if (payment.description === 'deposit') {
        const balanceAntes = parseFloat((payment.balance_invest || 0).toString());
        const novoBalanceInvest = balanceAntes + valorEmReais;
        
        // Atualizar balance_invest
        await client.query(`
          UPDATE users 
          SET balance_invest = $1, updated_at = NOW()
          WHERE id = $2
        `, [novoBalanceInvest, payment.user_id]);
        
        // Criar extrato
        await client.query(`
          INSERT INTO extratos (user_id, type, amount, balance_before, balance_after, description, reference_id, reference_type, status, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
        `, [
          payment.user_id,
          'deposit',
          valorEmReais,
          balanceAntes,
          novoBalanceInvest,
          `Depósito via ${payment.method || 'PIX'} - TXID: ${payment.txid}`,
          payment.id,
          'payment',
          1
        ]);
        
        console.log(`💰 Depósito processado: +R$ ${valorEmReais.toFixed(2)} | Novo saldo: R$ ${novoBalanceInvest.toFixed(2)}`);
        
      } else if (payment.description === 'licenca') {
        // Mapear valor da licença para ID do plano
        const planMapping = {
          4: 1, 20: 2, 100: 3, 500: 4, 1000: 5, 2000: 6, 5000: 7, 10000: 8, 15000: 9, 20000: 10
        };
        
        const planoId = planMapping[valorEmReais];
        
        if (planoId) {
          // Atualizar plano do usuário
          await client.query(`
            UPDATE users 
            SET plano = $1, updated_at = NOW()
            WHERE id = $2
          `, [planoId, payment.user_id]);
          
          // Criar extrato da compra de licença
          await client.query(`
            INSERT INTO extratos (user_id, type, amount, balance_before, balance_after, description, reference_id, reference_type, status, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
          `, [
            payment.user_id,
            'investment',
            valorEmReais,
            payment.balance_invest || 0,
            payment.balance_invest || 0,
            `Compra de licença - Plano ${planoId} (R$ ${valorEmReais.toFixed(2)}) - TXID: ${payment.txid}`,
            payment.id,
            'payment',
            1
          ]);
          
          console.log(`🔑 Licença processada - Plano: ${planoId}`);
        } else {
          console.log(`❌ Valor de licença não mapeado: R$ ${valorEmReais}`);
        }
      }
      
      console.log(`✅ Pagamento ${payment.id} processado com sucesso`);
    }
    
  } catch (error) {
    console.error('Erro:', error.message);
  } finally {
    await client.end();
  }
}

testManualCron();
