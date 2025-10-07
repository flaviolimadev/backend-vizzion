-- Ver tipos de extrato que existem
SELECT DISTINCT type, COUNT(*) as quantidade
FROM extratos
WHERE status = 1
GROUP BY type
ORDER BY quantidade DESC;

-- Ver exemplos de extratos recentes
SELECT 
    e.id,
    e.type,
    e.amount,
    e.status,
    e.description,
    u.email,
    e.created_at
FROM extratos e
JOIN users u ON u.id = e.user_id
WHERE e.status = 1
ORDER BY e.created_at DESC
LIMIT 30;

