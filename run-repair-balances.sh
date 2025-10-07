#!/bin/bash

# Script para executar a reparação de balanços
# Carrega variáveis do .env e executa o SQL

# Carregar variáveis do .env
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | grep -v '^$' | xargs)
else
    echo "❌ Arquivo .env não encontrado!"
    exit 1
fi

echo "🔧 Executando reparação de balanços..."
echo "📊 Banco: $DB_DATABASE em $DB_HOST:$DB_PORT"
echo ""

# Executar o script SQL
PGPASSWORD="$DB_PASSWORD" psql \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USERNAME" \
    -d "$DB_DATABASE" \
    -f repair-balances.sql

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Reparação concluída com sucesso!"
else
    echo ""
    echo "❌ Erro ao executar a reparação!"
    exit 1
fi

