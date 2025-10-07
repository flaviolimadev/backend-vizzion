-- Ver extratos que foram marcados como processados
SELECT 
    COUNT(*) as total_marcados,
    SUM(CAST(amount AS NUMERIC)) as total_valor
FROM extratos
WHERE metadata LIKE '%repaired_balance%'
  AND type IN ('REFERRAL', 'BONUS', 'YIELD', 'PROFIT');

-- Ver alguns usuários com extratos marcados mas possível balance baixo
SELECT 
    u.email,
    u.balance,
    u.balance_invest,
    COUNT(e.id) as extratos_processados,
    SUM(CAST(e.amount AS NUMERIC)) as total_deveria_ter
FROM users u
JOIN extratos e ON e.user_id = u.id
WHERE e.metadata LIKE '%repaired_balance%'
  AND e.type IN ('REFERRAL', 'BONUS', 'YIELD', 'PROFIT')
  AND e.status = 1
GROUP BY u.id, u.email, u.balance, u.balance_invest
HAVING SUM(CAST(e.amount AS NUMERIC)) > CAST(u.balance AS NUMERIC)
LIMIT 10;
