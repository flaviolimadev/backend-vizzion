import { DataSource } from 'typeorm';
import { User } from '../modules/user/entities/user.entity';
import { Extrato, ExtratoType, ExtratoStatus } from '../modules/user/entities/extrato.entity';

// Configuração do banco de dados
const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_DATABASE || 'vizzionbot',
  entities: [User, Extrato],
  synchronize: false,
  logging: false,
});

async function main() {
  const startTime = Date.now();
  console.log(`[${new Date().toISOString()}] 🚀 Iniciando processamento de rendimentos automáticos...`);

  try {
    await dataSource.initialize();
    console.log('✅ Conexão com banco de dados estabelecida');

    const userRepo = dataSource.getRepository(User);
    const extratoRepo = dataSource.getRepository(Extrato);

    // Buscar todos os usuários com trading_mode = 'auto' e balance_invest > 0
    const autoUsers = await userRepo.find({
      where: {
        trading_mode: 'auto',
        deleted: false
      },
      select: ['id', 'nome', 'sobrenome', 'email', 'balance_invest', 'balance']
    });

    console.log(`📊 Encontrados ${autoUsers.length} usuários com trading automático`);

    if (autoUsers.length === 0) {
      console.log('ℹ️ Nenhum usuário encontrado para processar');
      return;
    }

    // Filtrar usuários com saldo de investimento > 0
    const usersWithBalance = autoUsers.filter(user => 
      user.balance_invest && parseFloat(user.balance_invest.toString()) > 0
    );

    console.log(`💰 ${usersWithBalance.length} usuários com saldo de investimento > 0`);

    if (usersWithBalance.length === 0) {
      console.log('ℹ️ Nenhum usuário com saldo de investimento encontrado');
      return;
    }

    const YIELD_PERCENTAGE = 0.55; // 0.55%
    let processed = 0;
    let totalCredited = 0;
    let errors = 0;

    // Processar cada usuário
    for (const user of usersWithBalance) {
      try {
        const balanceInvest = parseFloat(user.balance_invest.toString());
        const yieldAmount = Number((balanceInvest * (YIELD_PERCENTAGE / 100)).toFixed(2));

        if (yieldAmount <= 0) {
          console.log(`⚠️ Valor de rendimento inválido para usuário ${user.email}: R$ ${yieldAmount}`);
          continue;
        }

        // Calcular saldo atual baseado nos extratos
        const currentBalance = await extratoRepo
          .createQueryBuilder('e')
          .select('COALESCE(SUM(e.amount),0)', 'total')
          .where('e.user_id = :userId', { userId: user.id })
          .andWhere('e.status = :status', { status: ExtratoStatus.COMPLETED })
          .andWhere('e.type IN (:...types)', { 
            types: [ExtratoType.YIELD, ExtratoType.REFERRAL, ExtratoType.BONUS, ExtratoType.WITHDRAWAL] 
          })
          .getRawOne()
          .then(r => Number(parseFloat(r?.total || '0').toFixed(2)));

        const newBalance = Number((currentBalance + yieldAmount).toFixed(2));

        // Criar extrato de rendimento automático
        const extrato = extratoRepo.create({
          user_id: user.id,
          type: ExtratoType.YIELD,
          amount: yieldAmount,
          description: `Rendimento Automático (${YIELD_PERCENTAGE}%)`,
          balance_before: currentBalance,
          balance_after: newBalance,
          status: ExtratoStatus.COMPLETED,
          reference_type: 'auto_yield',
          metadata: JSON.stringify({
            yield_percentage: YIELD_PERCENTAGE,
            base_amount: balanceInvest,
            processed_at: new Date().toISOString(),
            script_version: '1.0'
          })
        });

        await extratoRepo.save(extrato);

        // Atualizar balance do usuário
        await userRepo.increment({ id: user.id }, 'balance', yieldAmount);

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
    console.log(`👥 Usuários processados: ${processed}/${usersWithBalance.length}`);
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
    if (dataSource.isInitialized) {
      await dataSource.destroy();
      console.log('🔌 Conexão com banco de dados encerrada');
    }
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

export { main };

