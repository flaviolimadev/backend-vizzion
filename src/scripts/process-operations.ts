import 'dotenv/config';
import { DataSource } from 'typeorm';
import { Operation } from '../modules/user/entities/operation.entity';
import axios from 'axios';

// Configuração do DataSource
const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  entities: [Operation],
  synchronize: false,
});

interface Candle {
  datetime: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  timestamp: number;
}

interface CandlesResponse {
  candles: Candle[];
}

async function processOperations() {
  try {
    console.log('🔧 Inicializando processamento de operações...\n');
    
    await AppDataSource.initialize();
    console.log('✅ Conexão com banco estabelecida\n');

    const operationRepository = AppDataSource.getRepository(Operation);

    // Buscar operações pendentes (operado = false)
    const pendingOperations = await operationRepository.find({
      where: { operado: false },
      order: { clickedAt: 'ASC' },
    });

    console.log(`📊 Encontradas ${pendingOperations.length} operações pendentes\n`);

    if (pendingOperations.length === 0) {
      console.log('✅ Nenhuma operação pendente para processar');
      await AppDataSource.destroy();
      return;
    }

    let processedCount = 0;
    let errorCount = 0;

    for (const operation of pendingOperations) {
      try {
        console.log(`\n📍 Processando operação ${operation.id}`);
        console.log(`   Ativo: ${operation.assetTicker}`);
        console.log(`   Realizada em: ${operation.clickedAt}`);

        // Buscar candles atuais do ativo
        const response = await axios.get<CandlesResponse>(
          `https://corretora-app.kl5dxx.easypanel.host/api/assets/${operation.assetId}/candles?timeframe=1m`
        );

        const currentCandles = response.data.candles;

        if (!currentCandles || currentCandles.length === 0) {
          console.log(`   ⚠️  Nenhum candle atual disponível, pulando...`);
          errorCount++;
          continue;
        }

        // Pegar o primeiro candle (momento da operação)
        const firstCandle = operation.candlesData[0];
        // Pegar o candle mais recente (atual)
        const lastCandle = currentCandles[0];

        if (!firstCandle || !lastCandle) {
          console.log(`   ⚠️  Dados de candle inválidos, pulando...`);
          errorCount++;
          continue;
        }

        // Preço de entrada (close do primeiro candle)
        const entryPrice = firstCandle.close;
        // Preço de saída (close do último candle)
        const exitPrice = lastCandle.close;

        // Calcular variação percentual
        const priceChange = ((exitPrice - entryPrice) / entryPrice) * 100;
        const profit = priceChange > 0;

        // Determinar tipo de operação
        let operationType: 'buy' | 'sell';
        let resultMessage: string;

        if (profit) {
          // Preço subiu = foi uma COMPRA (buy)
          operationType = 'buy';
          resultMessage = `COMPRA - Lucro de ${priceChange.toFixed(2)}%`;
        } else {
          // Preço caiu = foi uma VENDA (sell)
          operationType = 'sell';
          resultMessage = `VENDA - Lucro de ${Math.abs(priceChange).toFixed(2)}%`;
        }

        // Atualizar a operação
        operation.candlesData = currentCandles; // Atualizar com candles atuais
        operation.operado = true;
        
        // Adicionar metadados sobre a operação
        (operation as any).metadata = {
          operationType,
          entryPrice,
          exitPrice,
          priceChange,
          profit,
          entryTime: firstCandle.datetime,
          exitTime: lastCandle.datetime,
          processedAt: new Date().toISOString(),
        };

        await operationRepository.save(operation);

        console.log(`   ✅ ${resultMessage}`);
        console.log(`   💰 Entrada: $${entryPrice.toFixed(5)} → Saída: $${exitPrice.toFixed(5)}`);
        
        processedCount++;

        // Pequeno delay para não sobrecarregar a API
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (error) {
        console.error(`   ❌ Erro ao processar operação ${operation.id}:`, error.message);
        errorCount++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 RESUMO DO PROCESSAMENTO');
    console.log('='.repeat(60));
    console.log(`✅ Operações processadas: ${processedCount}`);
    console.log(`❌ Erros: ${errorCount}`);
    console.log(`📈 Total: ${pendingOperations.length}`);
    console.log('='.repeat(60) + '\n');

    await AppDataSource.destroy();
    console.log('✅ Processamento concluído!');

  } catch (error) {
    console.error('❌ Erro fatal:', error);
    process.exit(1);
  }
}

// Executar o script
processOperations();

