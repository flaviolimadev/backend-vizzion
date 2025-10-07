require('dotenv').config();
const { Pool } = require('pg');
const https = require('https');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
});

async function processOperations() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Inicializando processamento de operações...\n');
    
    // Buscar operações pendentes
    const result = await client.query(
      'SELECT * FROM operations WHERE operado = false ORDER BY clicked_at ASC'
    );

    const pendingOperations = result.rows;
    console.log(`📊 Encontradas ${pendingOperations.length} operações pendentes\n`);

    if (pendingOperations.length === 0) {
      console.log('✅ Nenhuma operação pendente para processar');
      return;
    }

    let processedCount = 0;
    let errorCount = 0;

    for (const operation of pendingOperations) {
      try {
        console.log(`\n📍 Processando operação ${operation.id}`);
        console.log(`   Ativo: ${operation.asset_ticker}`);
        console.log(`   Realizada em: ${operation.clicked_at}`);

        // Buscar candles atuais do ativo
        const response = await new Promise((resolve, reject) => {
          https.get(
            `https://corretora-app.kl5dxx.easypanel.host/api/assets/${operation.asset_id}/candles?timeframe=1m`,
            (res) => {
              let data = '';
              res.on('data', chunk => data += chunk);
              res.on('end', () => resolve(JSON.parse(data)));
            }
          ).on('error', reject);
        });

        const currentCandles = response.candles;

        if (!currentCandles || currentCandles.length === 0) {
          console.log(`   ⚠️  Nenhum candle atual disponível, pulando...`);
          errorCount++;
          continue;
        }

        // PRIMEIRO: Pegar o candle do momento da operação (antes de atualizar)
        const firstCandle = operation.candles_data[0];
        
        if (!firstCandle) {
          console.log(`   ⚠️  Dados de candle inválidos, pulando...`);
          errorCount++;
          continue;
        }

        // Preço de entrada (close do primeiro candle - momento da operação)
        const entryPrice = firstCandle.close;
        
        // AGORA: Pegar o candle mais recente (dos novos candles da API)
        const lastCandle = currentCandles[0];
        
        if (!lastCandle) {
          console.log(`   ⚠️  Nenhum candle atual disponível, pulando...`);
          errorCount++;
          continue;
        }
        
        // Preço de saída (close do último candle ATUALIZADO)
        const exitPrice = lastCandle.close;

        // Calcular variação percentual
        const priceChange = ((exitPrice - entryPrice) / entryPrice) * 100;
        const profit = priceChange > 0;

        // Determinar tipo de operação
        let operationType;
        let resultMessage;

        if (profit) {
          // Preço subiu = foi uma COMPRA (buy)
          operationType = 'buy';
          resultMessage = `COMPRA - Lucro de ${priceChange.toFixed(2)}%`;
        } else {
          // Preço caiu = foi uma VENDA (sell)
          operationType = 'sell';
          resultMessage = `VENDA - Lucro de ${Math.abs(priceChange).toFixed(2)}%`;
        }

        // Criar metadados
        const metadata = {
          operationType,
          entryPrice,
          exitPrice,
          priceChange,
          profit,
          entryTime: firstCandle.datetime,
          exitTime: lastCandle.datetime,
          processedAt: new Date().toISOString(),
        };

        // Atualizar a operação
        await client.query(
          `UPDATE operations 
           SET operado = true, 
               candles_data = $1::jsonb, 
               metadata = $2::jsonb,
               updated_at = NOW()
           WHERE id = $3`,
          [JSON.stringify(currentCandles), JSON.stringify(metadata), operation.id]
        );

        console.log(`   📥 Candles atualizados: ${currentCandles.length} novos candles da API`);
        console.log(`   ✅ ${resultMessage}`);
        console.log(`   💰 Entrada: $${entryPrice.toFixed(5)} (candle original) → Saída: $${exitPrice.toFixed(5)} (candle atualizado)`);
        
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

    console.log('✅ Processamento concluído!');

  } catch (error) {
    console.error('❌ Erro fatal:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// Executar o script
processOperations();

