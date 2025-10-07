-- Script para reparar balanços dos usuários
-- Adiciona ao balance os valores de extratos (REFERRAL, BONUS, YIELD, PROFIT) que ainda não foram creditados

BEGIN;

-- 1. Criar tabela temporária com os valores a serem creditados por usuário
CREATE TEMP TABLE temp_credits AS
SELECT 
    e.user_id,
    SUM(CAST(e.amount AS NUMERIC)) as total_to_credit,
    COUNT(*) as extrato_count,
    u.email,
    CAST(u.balance AS NUMERIC) as current_balance
FROM extratos e
JOIN users u ON u.id = e.user_id
WHERE e.status = 1
  AND e.type IN ('referral', 'bonus', 'yield', 'profit')
  AND (e.metadata IS NULL OR e.metadata NOT ILIKE '%repaired_balance%')
  AND CAST(e.amount AS NUMERIC) > 0
GROUP BY e.user_id, u.email, u.balance;

-- 2. Mostrar o que será creditado
SELECT 
    '🔍 Extratos pendentes para reparar: ' || COUNT(*) as info
FROM extratos
WHERE status = 1
  AND type IN ('REFERRAL', 'BONUS', 'YIELD', 'PROFIT')
  AND (metadata IS NULL OR metadata NOT ILIKE '%repaired_balance%');

-- 3. Mostrar resumo por usuário
SELECT 
    'Usuário: ' || email as usuario,
    'Balance Atual: R$ ' || ROUND(current_balance, 2) as balance_atual,
    'Será Creditado: R$ ' || ROUND(total_to_credit, 2) as valor_creditar,
    'Novo Balance: R$ ' || ROUND(current_balance + total_to_credit, 2) as novo_balance,
    'Quantidade de Extratos: ' || extrato_count as qtd_extratos
FROM temp_credits
ORDER BY email;

-- 4. Atualizar os balances dos usuários
UPDATE users u
SET balance = u.balance + tc.total_to_credit
FROM temp_credits tc
WHERE u.id = tc.user_id;

-- 5. Marcar os extratos como processados
UPDATE extratos e
SET metadata = CASE
    WHEN e.metadata IS NULL THEN '{"repaired_balance": true}'
    WHEN e.metadata LIKE '{%' THEN 
        REPLACE(e.metadata, '}', ', "repaired_balance": true}')
    ELSE e.metadata || ' | repaired_balance'
END
WHERE e.status = 1
  AND e.type IN ('referral', 'bonus', 'yield', 'profit')
  AND (e.metadata IS NULL OR e.metadata NOT ILIKE '%repaired_balance%')
  AND CAST(e.amount AS NUMERIC) > 0;

-- 6. Relatório final
SELECT 
    '✅ Reparação concluída!' as status,
    COUNT(DISTINCT user_id) || ' usuários atualizados' as usuarios,
    COUNT(*) || ' extratos marcados como processados' as extratos
FROM extratos
WHERE metadata LIKE '%repaired_balance%';

COMMIT;

-- Verificação final - mostrar todos os usuários com seus novos balances
SELECT 
    email,
    'R$ ' || ROUND(CAST(balance AS NUMERIC), 2) as balance_atual
FROM users
WHERE CAST(balance AS NUMERIC) > 0
ORDER BY email;

