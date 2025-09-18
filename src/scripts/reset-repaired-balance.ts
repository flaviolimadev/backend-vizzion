import 'dotenv/config';
import dataSource from '../database/data-source';
import { Extrato } from '../modules/user/entities/extrato.entity';

async function main() {
  console.log('Connecting to database...');
  await dataSource.initialize();
  console.log('✅ Database connected.');

  const extratoRepo = dataSource.getRepository(Extrato);

  // Reset all extratos to repaired_balance: false
  console.log('🔄 Resetando todos os extratos para repaired_balance: false...');
  
  // Primeiro, vamos remover completamente o repaired_balance do metadata
  const result = await extratoRepo
    .createQueryBuilder()
    .update(Extrato)
    .set({ 
      metadata: () => `CASE 
        WHEN metadata IS NULL THEN NULL
        WHEN metadata::text LIKE '%repaired_balance%' THEN 
          CASE 
            WHEN metadata::text = '{"repaired_balance": true}' OR metadata::text = '{"repaired_balance": false}' THEN NULL
            ELSE regexp_replace(regexp_replace(metadata::text, ',\\s*"repaired_balance":\\s*(true|false)', '', 'g'), '"repaired_balance":\\s*(true|false),?\\s*', '', 'g')
          END
        ELSE metadata
      END`
    })
    .where('type IN (:...types)', { types: ['referral', 'bonus', 'yield'] })
    .execute();

  console.log(`✅ Resetados ${result.affected} extratos.`);
  await dataSource.destroy();
}

main().catch((err) => {
  console.error('Reset script failed:', err);
  process.exit(1);
});
