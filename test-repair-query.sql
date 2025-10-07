-- Verificar se existem extratos não creditados
SELECT 
    COUNT(*) as total_extratos,
    SUM(CAST(amount AS NUMERIC)) as total_valor
FROM extratos
WHERE status = 1
  AND type IN ('REFERRAL', 'BONUS', 'YIELD', 'PROFIT')
  AND (metadata IS NULL OR metadata NOT ILIKE '%repaired_balance%')
  AND CAST(amount AS NUMERIC) > 0;

-- Ver alguns exemplos
SELECT 
    e.id,
    e.user_id,
    u.email,
    e.type,
    e.amount,
    e.status,
    e.metadata
FROM extratos e
JOIN users u ON u.id = e.user_id
WHERE e.status = 1
  AND e.type IN ('REFERRAL', 'BONUS', 'YIELD', 'PROFIT')
  AND CAST(e.amount AS NUMERIC) > 0
LIMIT 10;
