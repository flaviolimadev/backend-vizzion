#!/bin/bash

# Configurações
SCRIPT_DIR="/Users/flaviolima/Documents/vizzionbot/backend-vizzion"
LOG_FILE="/var/log/vizzionbot/repair-balances.log"
MAX_LOG_SIZE=10485760  # 10MB

# Criar diretório de log se não existir
mkdir -p "$(dirname "$LOG_FILE")"

# Rotacionar log se estiver muito grande
if [ -f "$LOG_FILE" ] && [ $(stat -f%z "$LOG_FILE" 2>/dev/null || stat -c%s "$LOG_FILE" 2>/dev/null || echo 0) -gt $MAX_LOG_SIZE ]; then
    mv "$LOG_FILE" "${LOG_FILE}.old"
fi

# Mudar para diretório do projeto
cd "$SCRIPT_DIR" || {
    echo "[$(date -Iseconds)] ERROR: Cannot change to $SCRIPT_DIR" >> "$LOG_FILE"
    exit 1
}

# Verificar se o arquivo compilado existe
if [ ! -f "dist/scripts/repair-balances-cron.js" ]; then
    echo "[$(date -Iseconds)] ERROR: Compiled script not found. Running npm run build..." >> "$LOG_FILE"
    npm run build >> "$LOG_FILE" 2>&1
fi

# Executar script com timeout de 5 minutos
timeout 300 /usr/bin/node dist/scripts/repair-balances-cron.js >> "$LOG_FILE" 2>&1

# Verificar exit code
EXIT_CODE=$?
if [ $EXIT_CODE -eq 124 ]; then
    echo "[$(date -Iseconds)] ERROR: Script timed out after 5 minutes" >> "$LOG_FILE"
elif [ $EXIT_CODE -ne 0 ]; then
    echo "[$(date -Iseconds)] ERROR: Script failed with exit code $EXIT_CODE" >> "$LOG_FILE"
fi

exit $EXIT_CODE

