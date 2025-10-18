#!/usr/bin/env node
/*
  Reporte de pagamentos por período com separação de depósitos vs licenças.
  - Conta confirmados (status 2) e pendentes (status 0)
  - Indica método (PIX vs CRYPTO), user_id e txid
  - Separa description: 'deposit' vs 'licenca'

  Uso:
    node scripts/report-pagamentos.js --from 2025-10-03 --to 2025-10-11
    node scripts/report-pagamentos.js --from 2025-10-03 --to 2025-10-11 --out report.json
    node scripts/report-pagamentos.js --from 2025-10-03 --to 2025-10-11 --out report.json --summary

  Observação: Lê credenciais do Postgres via variáveis de ambiente (.env)
*/

const path = require('path');
const fs = require('fs');
const { DataSource } = require('typeorm');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 5432),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
});

function parseArgs() {
  const args = process.argv.slice(2);
  const res = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--from' && args[i + 1]) res.from = args[++i];
    else if (a === '--to' && args[i + 1]) res.to = args[++i];
    else if (a === '--out' && args[i + 1]) res.out = args[++i];
    else if (a === '--summary') res.summary = true;
  }
  if (!res.from || !res.to) {
    console.error('Uso: node scripts/report-pagamentos.js --from YYYY-MM-DD --to YYYY-MM-DD');
    process.exit(1);
  }
  return res;
}

function fmtMoney(cents) {
  if (cents == null) return '-';
  return (Number(cents) / 100).toFixed(2);
}

async function main() {
  const { from, to, out, summary } = parseArgs();
  await dataSource.initialize();
  try {
    // Considera intervalo inclusivo: [from 00:00:00, to 23:59:59]
    const fromTs = `${from} 00:00:00`;
    const toTs = `${to} 23:59:59`;

    const query = `
      SELECT id, user_id, method, status, value, description, txid, created_at
      FROM pagamentos
      WHERE created_at BETWEEN $1 AND $2
      ORDER BY created_at ASC
    `;
    const rows = await dataSource.query(query, [fromTs, toTs]);

    const normalizeMethod = (m) => {
      if (!m) return 'UNKNOWN';
      const up = String(m).toUpperCase();
      if (up.includes('PIX')) return 'PIX';
      if (up.includes('CRYPTO')) return 'CRYPTO';
      return up;
    };

    const bucket = {
      deposit: [],
      licenca: [],
      outros: [],
    };

    for (const row of rows) {
      const desc = (row.description || '').toLowerCase();
      const kind = desc.includes('licenca') || desc.includes('licença') || desc.includes('license') || desc.includes('upgrade')
        ? 'licenca'
        : (desc.includes('deposit') ? 'deposit' : 'deposit'); // padrão deposit se não marcado

      const item = {
        id: row.id,
        user_id: row.user_id,
        method: normalizeMethod(row.method),
        status: Number(row.status),
        value_cents: Number(row.value),
        txid: row.txid || null,
        created_at: row.created_at,
      };

      if (kind === 'deposit') bucket.deposit.push(item);
      else if (kind === 'licenca') bucket.licenca.push(item);
      else bucket.outros.push(item);
    }

    function summarize(items) {
      const byStatus = { pending: 0, confirmed: 0, other: 0 };
      const byMethod = { PIX: 0, CRYPTO: 0, OTHER: 0 };
      for (const it of items) {
        if (it.status === 0) byStatus.pending++;
        else if (it.status === 2) byStatus.confirmed++;
        else byStatus.other++;

        if (it.method === 'PIX') byMethod.PIX++;
        else if (it.method === 'CRYPTO') byMethod.CRYPTO++;
        else byMethod.OTHER++;
      }
      return { count: items.length, byStatus, byMethod };
    }

    const sumDeposit = summarize(bucket.deposit);
    const sumLicenca = summarize(bucket.licenca);

    const formatRow = (it) => ({
      id: it.id,
      user_id: it.user_id,
      method: it.method,
      status: it.status,
      value_brl: fmtMoney(it.value_cents),
      txid: it.txid,
      created_at: it.created_at,
    });

    const result = {
      range: { from, to },
      resumo: {
        deposit: sumDeposit,
        licenca: sumLicenca,
      },
      detalhes: {
        deposit: bucket.deposit.map(formatRow),
        licenca: bucket.licenca.map(formatRow),
      },
    };

    if (out) {
      fs.writeFileSync(out, JSON.stringify(result, null, 2), 'utf8');
    }
    if (summary) {
      console.log(JSON.stringify(result.resumo, null, 2));
    } else if (!out) {
      // Apenas imprime tudo se não estiver salvando em arquivo
      console.log(JSON.stringify(result, null, 2));
    }
  } finally {
    await dataSource.destroy();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});


