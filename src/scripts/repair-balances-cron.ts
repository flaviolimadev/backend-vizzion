import 'dotenv/config';
import { In } from 'typeorm';
import dataSource from '../database/data-source';
import { Extrato, ExtratoType } from '../modules/user/entities/extrato.entity';
import { User } from '../modules/user/entities/user.entity';

async function main() {
  const startTime = Date.now();
  
  try {
    // Conectar ao banco com timeout
    await Promise.race([
      dataSource.initialize(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Database connection timeout')), 10000))
    ]);

    const extratoRepo = dataSource.getRepository(Extrato);
    const userRepo = dataSource.getRepository(User);

    // Verificação rápida se há algo para processar
    const totalToRepair = await extratoRepo
      .createQueryBuilder('e')
      .where('e.status = :status', { status: 1 })
      .andWhere('e.type IN (:...types)', { types: [ExtratoType.REFERRAL, ExtratoType.BONUS, ExtratoType.YIELD] })
      .andWhere('(e.metadata IS NULL OR e.metadata NOT ILIKE :marker)', { marker: '%repaired_balance%'} )
      .getCount();

    // Log apenas se houver algo para processar ou erro
    if (totalToRepair === 0) {
      // Log silencioso - apenas timestamp para debug se necessário
      console.log(`[${new Date().toISOString()}] No extratos to repair`);
      return;
    }

    console.log(`[${new Date().toISOString()}] 🔍 Found ${totalToRepair} extratos to repair`);

    // Processar em lotes pequenos para não travar o banco
    const BATCH_SIZE = 20;
    let processed = 0;
    let totalCredited = 0;

    while (processed < totalToRepair) {
      const extratos = await extratoRepo
        .createQueryBuilder('e')
        .where('e.status = :status', { status: 1 })
        .andWhere('e.type IN (:...types)', { types: [ExtratoType.REFERRAL, ExtratoType.BONUS, ExtratoType.YIELD] })
        .andWhere('(e.metadata IS NULL OR e.metadata NOT ILIKE :marker)', { marker: '%repaired_balance%'} )
        .orderBy('e.created_at', 'ASC')
        .limit(BATCH_SIZE)
        .getMany();

      if (extratos.length === 0) break;

      for (const ex of extratos) {
        const user = await userRepo.findOne({ where: { id: ex.user_id }, select: ['id', 'balance'] });
        if (!user) {
          await extratoRepo.update({ id: ex.id }, { metadata: appendMarker(ex.metadata) });
          continue;
        }

        const amount = typeof ex.amount === 'string' ? parseFloat(ex.amount) : Number(ex.amount || 0);
        const safeAmount = Number.isFinite(amount) ? amount : 0;
        
        if (safeAmount <= 0) {
          await extratoRepo.update({ id: ex.id }, { metadata: appendMarker(ex.metadata) });
          continue;
        }

        // Incremento atômico
        await userRepo.increment({ id: user.id }, 'balance', safeAmount);
        await extratoRepo.update({ id: ex.id }, { metadata: appendMarker(ex.metadata) });

        totalCredited += safeAmount;
        processed++;
      }

      // Pequena pausa entre lotes para não sobrecarregar o banco
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    const duration = Date.now() - startTime;
    console.log(`[${new Date().toISOString()}] ✅ Repaired ${processed} extratos, credited R$ ${totalCredited.toFixed(2)} in ${duration}ms`);

  } catch (error) {
    console.error(`[${new Date().toISOString()}] ❌ Repair script failed:`, error);
    throw error;
  } finally {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  }
}

function appendMarker(existing: string | null): string {
  try {
    if (!existing) return JSON.stringify({ repaired_balance: true, repaired_at: new Date().toISOString() });
    const parsed = JSON.parse(existing);
    parsed.repaired_balance = true;
    parsed.repaired_at = new Date().toISOString();
    return JSON.stringify(parsed);
  } catch {
    return `${existing} | repaired_balance:${new Date().toISOString()}`;
  }
}

main().catch((err) => {
  console.error(`[${new Date().toISOString()}] Repair script failed:`, err);
  process.exit(1);
});
