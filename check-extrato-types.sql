-- Ver todos os tipos de extrato que existem
SELECT DISTINCT type, COUNT(*) as quantidade
FROM extratos
WHERE status = 1
GROUP BY type
ORDER BY quantidade DESC;

-- Ver alguns exemplos de cada tipo
SELECT id, user_id, type, amount, status, metadata
FROM extratos
WHERE status = 1
ORDER BY created_at DESC
LIMIT 20;
