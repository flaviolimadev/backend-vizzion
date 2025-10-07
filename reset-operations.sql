-- Resetar todas as operações para reprocessamento

BEGIN;

-- Resetar operado para false
UPDATE operations 
SET operado = false, 
    metadata = NULL 
WHERE operado = true;

-- Mostrar quantas operações foram resetadas
SELECT 
    '✅ Operações resetadas: ' || COUNT(*) as status
FROM operations 
WHERE operado = false;

COMMIT;

SELECT '✅ Reset concluído! Execute o script de processamento novamente.' as info;
