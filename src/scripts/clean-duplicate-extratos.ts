import 'dotenv/config';
import dataSource from '../database/data-source';
import { Extrato } from '../modules/user/entities/extrato.entity';

async function main() {
  console.log('Connecting to database...');
  await dataSource.initialize();
  console.log('✅ Database connected.');

  const extratoRepo = dataSource.getRepository(Extrato);

  // Buscar extratos duplicados (mesmo user_id, type, description, amount, criados no mesmo minuto)
  const duplicates = await extratoRepo
    .createQueryBuilder('e')
    .select([
      'e.user_id',
      'e.type', 
      'e.description',
      'e.amount',
      'DATE_TRUNC(\'minute\', e.created_at) as minute',
      'COUNT(*) as count',
      'ARRAY_AGG(e.id ORDER BY e.created_at) as ids'
    ])
    .where('e.status = :status', { status: 1 })
    .groupBy('e.user_id, e.type, e.description, e.amount, DATE_TRUNC(\'minute\', e.created_at)')
    .having('COUNT(*) > 1')
    .getRawMany();

  console.log(`🔍 Encontrados ${duplicates.length} grupos de extratos duplicados`);

  if (duplicates.length === 0) {
    console.log('✅ Nenhum extrato duplicado encontrado.');
    await dataSource.destroy();
    return;
  }

  let totalRemoved = 0;
  for (const duplicate of duplicates) {
    const ids = duplicate.ids.slice(1); // Manter o primeiro, remover os demais
    console.log(`🗑️ Removendo ${ids.length} extratos duplicados do usuário ${duplicate.e_user_id}: ${duplicate.e_description} - R$ ${duplicate.e_amount}`);
    
    await extratoRepo.delete(ids);
    totalRemoved += ids.length;
  }

  console.log(`✅ Removidos ${totalRemoved} extratos duplicados.`);
  await dataSource.destroy();
}

main().catch((err) => {
  console.error('Clean duplicates script failed:', err);
  process.exit(1);
});
