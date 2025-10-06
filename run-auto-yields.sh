#!/bin/bash

# Script para executar processamento de rendimentos automáticos
# Uso: ./run-auto-yields.sh

set -e

echo "🚀 Iniciando processamento de rendimentos automáticos..."
echo "📅 Data/Hora: $(date)"
echo ""

# Verificar se as variáveis de ambiente estão definidas
if [ -z "$DB_HOST" ]; then
    echo "⚠️ DB_HOST não definido, usando localhost"
    export DB_HOST="localhost"
fi

if [ -z "$DB_PORT" ]; then
    echo "⚠️ DB_PORT não definido, usando 5432"
    export DB_PORT="5432"
fi

if [ -z "$DB_USERNAME" ]; then
    echo "⚠️ DB_USERNAME não definido, usando postgres"
    export DB_USERNAME="postgres"
fi

if [ -z "$DB_PASSWORD" ]; then
    echo "❌ DB_PASSWORD não definido!"
    exit 1
fi

if [ -z "$DB_DATABASE" ]; then
    echo "⚠️ DB_DATABASE não definido, usando vizzionbot"
    export DB_DATABASE="vizzionbot"
fi

echo "🔧 Configuração do banco:"
echo "   Host: $DB_HOST"
echo "   Port: $DB_PORT"
echo "   Database: $DB_DATABASE"
echo "   User: $DB_USERNAME"
echo ""

# Verificar se o Node.js está disponível
if command -v node &> /dev/null; then
    echo "✅ Node.js encontrado, executando script JavaScript..."
    node process-auto-yields.js
elif command -v psql &> /dev/null; then
    echo "✅ PostgreSQL client encontrado, executando script SQL..."
    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USERNAME" -d "$DB_DATABASE" -f process-auto-yields.sql
else
    echo "❌ Nem Node.js nem psql encontrados!"
    echo "   Instale Node.js ou PostgreSQL client para executar o script"
    exit 1
fi

echo ""
echo "✅ Processamento concluído!"
echo "📅 Data/Hora final: $(date)"

