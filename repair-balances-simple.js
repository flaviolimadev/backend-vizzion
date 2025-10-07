require('dotenv').config();
const pg = require('pg');
const Client = pg.Client;

async function main() {
  const client = new Client({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 5432),
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
  });

  console.log('🔌 Connecting to database...');
  await client.connect();
  console.log('✅ Database connected.');

  try {
    // Buscar extratos pendentes de reparação
    const result = await client.query(`
      SELECT id, user_id, amount, type, metadata
      FROM extratos
      WHERE status = 1
        AND type IN ('REFERRAL', 'BONUS', 'YIELD', 'PROFIT')
        AND (metadata IS NULL OR metadata NOT ILIKE '%repaired_balance%')
      ORDER BY created_at ASC
    `);

    const extratos = result.rows;
    const totalToRepair = extratos.length;

    console.log(`🔍 Extratos pendentes para reparar: ${totalToRepair}`);

    if (totalToRepair === 0) {
      console.log('✅ Nada para reparar. Encerrando.');
      await client.end();
      return;
    }

    const byUser = {};
    let processed = 0;

    for (const extrato of extratos) {
      // Buscar usuário
      const userResult = await client.query(
        'SELECT id, email, balance FROM users WHERE id = $1',
        [extrato.user_id]
      );

      if (userResult.rows.length === 0) {
        // Marcar como processado mesmo sem usuário
        await updateExtratoMetadata(client, extrato);
        continue;
      }

      const user = userResult.rows[0];
      const amount = parseFloat(extrato.amount || 0);
      const safeAmount = Number.isFinite(amount) && amount > 0 ? amount : 0;

      if (safeAmount <= 0) {
        // Nada para creditar, apenas marcar como processado
        await updateExtratoMetadata(client, extrato);
        continue;
      }

      // Incrementar saldo do usuário
      await client.query(
        'UPDATE users SET balance = balance + $1 WHERE id = $2',
        [safeAmount, user.id]
      );

      // Marcar extrato como reparado
      await updateExtratoMetadata(client, extrato);

      // Contabilizar para relatório
      if (!byUser[user.id]) {
        byUser[user.id] = { email: user.email, added: 0, count: 0 };
      }
      byUser[user.id].added += safeAmount;
      byUser[user.id].count += 1;

      processed++;
      if (processed % 50 === 0) {
        console.log(`... processados ${processed}/${totalToRepair}`);
      }
    }

    // Gerar relatório
    const usersResult = await client.query(
      'SELECT id, email, balance FROM users ORDER BY email ASC'
    );

    console.log('\n==== Balance Repair Report ====');
    for (const user of usersResult.rows) {
      const userStats = byUser[user.id];
      if (userStats && userStats.added > 0) {
        const balance = parseFloat(user.balance || 0);
        console.log(
          `${user.email}\t` +
          `balance=R$ ${balance.toFixed(2)}\t` +
          `added=R$ ${userStats.added.toFixed(2)}\t` +
          `count=${userStats.count}`
        );
      }
    }

    console.log(`\n✅ Reparação concluída. ${processed} extratos processados.`);

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await client.end();
  }
}

async function updateExtratoMetadata(client, extrato) {
  let newMetadata;
  try {
    if (!extrato.metadata) {
      newMetadata = JSON.stringify({ repaired_balance: true });
    } else {
      const parsed = JSON.parse(extrato.metadata);
      parsed.repaired_balance = true;
      newMetadata = JSON.stringify(parsed);
    }
  } catch {
    newMetadata = `${extrato.metadata} | repaired_balance`;
  }

  await client.query(
    'UPDATE extratos SET metadata = $1 WHERE id = $2',
    [newMetadata, extrato.id]
  );
}

main().catch((err) => {
  console.error('❌ Repair script failed:', err);
  process.exit(1);
});

