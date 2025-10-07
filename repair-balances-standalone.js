require('dotenv').config();
require('reflect-metadata');
const { DataSource } = require('typeorm');
const path = require('path');

// Definir as entidades manualmente
const Extrato = require('./dist/modules/user/entities/extrato.entity').Extrato;
const User = require('./dist/modules/user/entities/user.entity').User;
const ExtratoType = require('./dist/modules/user/entities/extrato.entity').ExtratoType;

const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 5432),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  synchronize: false,
  logging: false,
  entities: [Extrato, User],
});

async function main() {
  console.log('🔌 Connecting to database...');
  await dataSource.initialize();
  console.log('✅ Database connected.');

  const extratoRepo = dataSource.getRepository(Extrato);
  const userRepo = dataSource.getRepository(User);

  // Buscar extratos de indicação (direta/indireta), rendimentos e bônus
  // que ainda não foram marcados como reparados no metadata
  const qb = extratoRepo
    .createQueryBuilder('e')
    .where('e.status = :status', { status: 1 })
    .andWhere('e.type IN (:...types)', { 
      types: [ExtratoType.REFERRAL, ExtratoType.BONUS, ExtratoType.YIELD, ExtratoType.PROFIT] 
    })
    .andWhere('(e.metadata IS NULL OR e.metadata NOT ILIKE :marker)', { marker: '%repaired_balance%' })
    .orderBy('e.created_at', 'ASC');

  const totalToRepair = await qb.getCount();
  console.log(`🔍 Extratos pendentes para reparar: ${totalToRepair}`);

  if (totalToRepair === 0) {
    console.log('✅ Nada para reparar. Encerrando.');
    await dataSource.destroy();
    return;
  }

  const extratos = await qb.getMany();

  const byUser = {};

  let processed = 0;
  for (const ex of extratos) {
    const user = await userRepo.findOne({ 
      where: { id: ex.user_id }, 
      select: ['id', 'email', 'balance'] 
    });
    
    if (!user) continue;

    const amount = typeof ex.amount === 'string' ? parseFloat(ex.amount) : Number(ex.amount || 0);
    const safeAmount = Number.isFinite(amount) ? amount : 0;
    
    if (safeAmount <= 0) {
      // nada para creditar
      await extratoRepo.update({ id: ex.id }, { metadata: appendMarker(ex.metadata) });
      continue;
    }

    // Incremento atômico
    await userRepo.increment({ id: user.id }, 'balance', safeAmount);

    // Marcar extrato como reparado
    await extratoRepo.update({ id: ex.id }, { metadata: appendMarker(ex.metadata) });

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

  // Montar relatório final de emails e balances
  const users = await userRepo.find({ 
    select: ['id', 'email', 'balance'], 
    order: { email: 'ASC' } 
  });
  
  const report = users.map(u => ({
    email: u.email,
    balance: numberify(u.balance),
    creditedByScript: numberify(byUser[u.id]?.added || 0),
    creditedCount: byUser[u.id]?.count || 0
  }));

  // Exibir
  console.log('\n==== Balance Repair Report ====');
  for (const row of report) {
    if (row.creditedByScript > 0 || row.balance > 0) {
      console.log(
        `${row.email}\t` +
        `balance=R$ ${row.balance.toFixed(2)}\t` +
        `added=R$ ${row.creditedByScript.toFixed(2)}\t` +
        `count=${row.creditedCount}`
      );
    }
  }

  console.log(`\n✅ Reparação concluída. ${processed} extratos processados.`);

  await dataSource.destroy();
}

function appendMarker(existing) {
  try {
    if (!existing) return JSON.stringify({ repaired_balance: true });
    const parsed = JSON.parse(existing);
    parsed.repaired_balance = true;
    return JSON.stringify(parsed);
  } catch {
    return `${existing} | repaired_balance`;
  }
}

function numberify(v) {
  const n = typeof v === 'string' ? parseFloat(v) : Number(v || 0);
  return Number.isFinite(n) ? n : 0;
}

main().catch((err) => {
  console.error('❌ Repair script failed:', err);
  process.exit(1);
});

