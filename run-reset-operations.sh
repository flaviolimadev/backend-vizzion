#!/bin/bash

# Carregar variáveis do .env
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | grep -v '^$' | grep -v '@' | xargs)
else
    echo "❌ Arquivo .env não encontrado!"
    exit 1
fi

echo "🔧 Resetando operações..."

# Executar o script SQL
PGPASSWORD="$DB_PASSWORD" psql \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USERNAME" \
    -d "$DB_DATABASE" \
    -f reset-operations.sql

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Reset concluído com sucesso!"
else
    echo ""
    echo "❌ Erro ao executar o reset!"
    exit 1
fi
