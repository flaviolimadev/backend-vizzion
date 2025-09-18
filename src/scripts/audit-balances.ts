import 'dotenv/config';
import { DataSource } from 'typeorm';
import dataSource from '../database/data-source';
import { Extrato, ExtratoType } from '../modules/user/entities/extrato.entity';
import { User } from '../modules/user/entities/user.entity';

async function main() {
  console.log('Connecting to database...');
  await dataSource.initialize();
  console.log('✅ Database connected.');

  const extratoRepo = dataSource.getRepository(Extrato);
  const userRepo = dataSource.getRepository(User);

  // Compute per-user sums
  const users = await userRepo.find({ select: ['id', 'email', 'balance'] });
  console.log(`🔍 Auditing ${users.length} users...`);

  let mismatchCount = 0;
  const rows: Array<{ email: string; dbBalance: number; computed: number; direct: number; indirect: number; yield: number; bonus: number; diff: number }>= [];

  for (const u of users) {
    // Sum yields
    const yieldSumRaw = await extratoRepo
      .createQueryBuilder('e')
      .select('COALESCE(SUM(e.amount),0)', 'total')
      .where('e.user_id = :userId', { userId: u.id })
      .andWhere('e.status = :status', { status: 1 })
      .andWhere('e.type = :type', { type: ExtratoType.YIELD })
      .getRawOne();
    const yieldSum = parseFloat(yieldSumRaw?.total || '0');

    // Sum referral direct: descriptions containing "Nível 1"
    const directSumRaw = await extratoRepo
      .createQueryBuilder('e')
      .select('COALESCE(SUM(e.amount),0)', 'total')
      .where('e.user_id = :userId', { userId: u.id })
      .andWhere('e.status = :status', { status: 1 })
      .andWhere('e.type = :type', { type: ExtratoType.REFERRAL })
      .andWhere('e.description LIKE :pattern', { pattern: '%Nível 1%' })
      .getRawOne();
    const directSum = parseFloat(directSumRaw?.total || '0');

    // Sum referral indirect: descriptions containing "Nível" but not "Nível 1"
    const indirectSumRaw = await extratoRepo
      .createQueryBuilder('e')
      .select('COALESCE(SUM(e.amount),0)', 'total')
      .where('e.user_id = :userId', { userId: u.id })
      .andWhere('e.status = :status', { status: 1 })
      .andWhere('e.type = :type', { type: ExtratoType.REFERRAL })
      .andWhere('e.description LIKE :levelPattern', { levelPattern: '%Nível%' })
      .andWhere('e.description NOT LIKE :notPattern', { notPattern: '%Nível 1%' })
      .getRawOne();
    const indirectSum = parseFloat(indirectSumRaw?.total || '0');

    // Sum bonus extratos
    const bonusSumRaw = await extratoRepo
      .createQueryBuilder('e')
      .select('COALESCE(SUM(e.amount),0)', 'total')
      .where('e.user_id = :userId', { userId: u.id })
      .andWhere('e.status = :status', { status: 1 })
      .andWhere('e.type = :type', { type: ExtratoType.BONUS })
      .getRawOne();
    const bonusSum = parseFloat(bonusSumRaw?.total || '0');

    const computed = round2(yieldSum + directSum + indirectSum + bonusSum);
    const dbBalance = numberify(u.balance);
    const diff = round2(computed - dbBalance);

    if (Math.abs(diff) > 0.009) mismatchCount++;
    rows.push({ email: u.email, dbBalance, computed, direct: directSum, indirect: indirectSum, yield: yieldSum, bonus: bonusSum, diff });
  }

  console.log('==== Audit Balance vs Computed (yield + referral direct + referral indirect + bonus) ====');
  for (const r of rows) {
    if (Math.abs(r.diff) > 0.009) {
      console.log(`${r.email}\tDB=${fmt(r.dbBalance)}\tComputed=${fmt(r.computed)}\tYield=${fmt(r.yield)}\tDirect=${fmt(r.direct)}\tIndirect=${fmt(r.indirect)}\tBonus=${fmt(r.bonus)}\tDiff=${fmt(r.diff)}`);
    }
  }
  console.log(`Total with mismatch: ${mismatchCount}/${rows.length}`);

  // Duplicate check: same user, type REFERRAL or YIELD, same description and amount within same minute
  console.log('==== Possible duplicates (same user, type, description, amount, same minute) ====');
  const dupes = await extratoRepo.query(`
    SELECT user_id, type, description, amount::text AS amount, to_char(date_trunc('minute', created_at), 'YYYY-MM-DD HH24:MI') as minute, COUNT(*)
    FROM extratos
    WHERE status = 1 AND type IN ('referral','yield')
    GROUP BY user_id, type, description, amount::text, date_trunc('minute', created_at)
    HAVING COUNT(*) > 1
    ORDER BY COUNT(*) DESC
  `);
  if (dupes.length === 0) {
    console.log('No duplicates detected by the heuristic.');
  } else {
    for (const d of dupes) {
      console.log(`${d.user_id}\t${d.type}\t${d.description}\tR$ ${parseFloat(d.amount).toFixed(2)}\t${d.minute}\tcount=${d.count}`);
    }
  }

  await dataSource.destroy();
}

function numberify(v: any): number {
  const n = typeof v === 'string' ? parseFloat(v) : Number(v || 0);
  return Number.isFinite(n) ? n : 0;
}

function round2(v: number): number { return Math.round(v * 100) / 100; }
function fmt(v: number): string { return `R$ ${v.toFixed(2)}`; }

main().catch((err) => {
  console.error('Audit script failed:', err);
  process.exit(1);
});


