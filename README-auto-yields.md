# Script de Rendimentos Automáticos

Este conjunto de scripts processa rendimentos automáticos para usuários com `trading_mode = 'auto'` e `balance_invest > 0`.

## 📋 O que o script faz:

1. **Busca usuários**: Encontra todos os usuários com `trading_mode = 'auto'` e `balance_invest > 0`
2. **Calcula rendimento**: Aplica 1.4% sobre o `balance_invest` de cada usuário
3. **Cria extrato**: Registra o rendimento na tabela `extratos` com tipo `YIELD`
4. **Atualiza saldo**: Adiciona o valor do rendimento ao `balance` do usuário

## 🚀 Como executar:

### Opção 1: Script Shell (Mais fácil)
```bash
cd backend-vizzion
./run-auto-yields.sh
```

### Opção 2: Script TypeScript
```bash
cd backend-vizzion
npx ts-node run-auto-yields.ts
```

### Opção 3: Script JavaScript
```bash
cd backend-vizzion
node process-auto-yields.js
```

### Opção 4: Script SQL direto
```bash
cd backend-vizzion
psql -h localhost -U postgres -d vizzionbot -f process-auto-yields.sql
```

## ⚙️ Configuração:

Certifique-se de que as variáveis de ambiente estão definidas:

```bash
export DB_HOST="localhost"
export DB_PORT="5432"
export DB_USERNAME="postgres"
export DB_PASSWORD="sua_senha"
export DB_DATABASE="vizzionbot"
```

## 📊 Exemplo de saída:

```
🚀 Iniciando processamento de rendimentos automáticos...
📅 Data/Hora: 2025-01-29 15:30:00

✅ Conexão com banco de dados estabelecida
📊 Encontrados 15 usuários com trading automático e saldo > 0

✅ João Silva (joao@email.com): +R$ 14.00 | Saldo anterior: R$ 1000.00 | Novo saldo: R$ 1014.00
✅ Maria Santos (maria@email.com): +R$ 28.00 | Saldo anterior: R$ 2000.00 | Novo saldo: R$ 2028.00
...

📈 RESUMO DO PROCESSAMENTO:
⏱️ Tempo total: 1250ms
👥 Usuários processados: 15/15
💰 Total creditado: R$ 420.00
❌ Erros: 0
📊 Taxa de rendimento: 1.4%

✅ Processamento concluído!
```

## 🔧 Configurações do script:

- **Taxa de rendimento**: 1.4% (configurável)
- **Tipo de extrato**: `YIELD`
- **Status**: `COMPLETED` (1)
- **Referência**: `auto_yield`

## 📝 Logs e auditoria:

Cada rendimento processado gera:
- **Extrato** com todos os detalhes
- **Metadata** com informações do processamento
- **Log** detalhado no console

## ⚠️ Importante:

- O script é **idempotente** - pode ser executado múltiplas vezes
- Usuários com `balance_invest = 0` são ignorados
- Apenas usuários com `trading_mode = 'auto'` são processados
- O script usa transações para garantir consistência

## 🛠️ Troubleshooting:

### Erro de conexão:
```bash
# Verificar se o PostgreSQL está rodando
sudo systemctl status postgresql

# Verificar variáveis de ambiente
echo $DB_HOST $DB_PORT $DB_USERNAME $DB_DATABASE
```

### Erro de permissão:
```bash
# Dar permissão de execução
chmod +x run-auto-yields.sh
```

### Erro de dependências:
```bash
# Instalar dependências Node.js
npm install pg

# Ou instalar ts-node
npm install -g ts-node
```

