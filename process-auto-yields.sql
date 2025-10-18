-- Script SQL para processar rendimentos automáticos
-- Este script processa todos os usuários com trading_mode = 'auto' e balance_invest > 0
-- Aplica rendimento de 1.4% sobre o balance_invest

-- Configuração
\set yield_percentage 2.35

-- Iniciar transação
BEGIN;

-- Log de início
\echo '[INFO] Iniciando processamento de rendimentos automáticos...'

-- Verificar quantos usuários serão processados
SELECT 
  COUNT(*) as total_users,
  SUM(balance_invest) as total_investment,
  SUM(balance_invest * :yield_percentage / 100) as total_yield
FROM users 
WHERE trading_mode = 'auto' 
  AND deleted = false 
  AND balance_invest > 0;

-- Criar tabela temporária com os dados dos usuários
CREATE TEMP TABLE temp_auto_users AS
SELECT 
  id,
  nome,
  sobrenome,
  email,
  balance_invest,
  balance,
  (balance_invest * :yield_percentage / 100) as yield_amount
FROM users 
WHERE trading_mode = 'auto' 
  AND deleted = false 
  AND balance_invest > 0;

-- Mostrar usuários que serão processados
\echo '[INFO] Usuários que serão processados:'
SELECT 
  nome || ' ' || sobrenome as nome_completo,
  email,
  balance_invest,
  yield_amount
FROM temp_auto_users
ORDER BY balance_invest DESC;

-- Processar cada usuário
DO $$
DECLARE
  user_record RECORD;
  current_balance DECIMAL(10,2);
  new_balance DECIMAL(10,2);
  processed_count INTEGER := 0;
  total_credited DECIMAL(10,2) := 0;
BEGIN
  -- Loop através de todos os usuários
  FOR user_record IN SELECT * FROM temp_auto_users LOOP
    -- Calcular saldo atual baseado nos extratos
    SELECT COALESCE(SUM(amount), 0) INTO current_balance
    FROM extratos 
    WHERE user_id = user_record.id 
      AND status = 1 
      AND type IN ('profit', 'referral', 'bonus', 'withdrawal');
    
    new_balance := current_balance + user_record.yield_amount;
    
    -- Criar extrato de rendimento
    INSERT INTO extratos (
      user_id, type, amount, description, balance_before, balance_after, 
      status, reference_type, metadata, created_at, updated_at
    ) VALUES (
      user_record.id, 
      'profit', 
      user_record.yield_amount,
      'Rendimento Automático (2.35%)',
      current_balance,
      new_balance,
      1,
      'auto_yield',
      json_build_object(
        'yield_percentage', CASE WHEN user_record.balance_invest > 0 THEN ROUND((user_record.yield_amount / user_record.balance_invest) * 100, 4) ELSE 0 END,
        'base_amount', user_record.balance_invest,
        'processed_at', NOW(),
        'script_version', '1.0'
      )::text,
      NOW(),
      NOW()
    );
    
    -- Atualizar balance do usuário
    UPDATE users 
    SET balance = balance + user_record.yield_amount, updated_at = NOW()
    WHERE id = user_record.id;
    
    processed_count := processed_count + 1;
    total_credited := total_credited + user_record.yield_amount;
    
    -- Log do processamento
    RAISE NOTICE 'Processado: % % (%) - +R$ % | Saldo: R$ % -> R$ %', 
      user_record.nome, 
      user_record.sobrenome, 
      user_record.email,
      user_record.yield_amount,
      current_balance,
      new_balance;
  END LOOP;
  
  -- Log final
  RAISE NOTICE 'RESUMO: % usuários processados, R$ % creditado', 
    processed_count, 
    total_credited;
END $$;

-- Mostrar resumo final
SELECT 
  COUNT(*) as usuarios_processados,
  SUM(yield_amount) as total_creditado,
  AVG(yield_amount) as rendimento_medio
FROM temp_auto_users;

-- Limpar tabela temporária
DROP TABLE temp_auto_users;

-- Commit da transação
COMMIT;

\echo '[SUCCESS] Processamento de rendimentos automáticos concluído com sucesso!'

