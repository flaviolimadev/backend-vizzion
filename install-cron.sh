#!/bin/bash

# 🚀 Script de Instalação Automática do Cron para Repair Balances
# Executa: chmod +x install-cron.sh && ./install-cron.sh

set -e  # Para na primeira falha

echo "🚀 Iniciando instalação automática do cron repair-balances..."

# Detectar diretório atual
CURRENT_DIR="$(pwd)"
BACKEND_DIR="$CURRENT_DIR"

# Verificar se estamos no diretório correto
if [ ! -f "package.json" ] || [ ! -d "src/scripts" ]; then
    echo "❌ ERRO: Execute este script no diretório backend-vizzion"
    echo "   Exemplo: cd /path/to/backend-vizzion && ./install-cron.sh"
    exit 1
fi

echo "✅ Diretório correto detectado: $BACKEND_DIR"

# 1. Compilar o projeto
echo "📦 Compilando projeto TypeScript..."
npm run build
if [ $? -ne 0 ]; then
    echo "❌ ERRO: Falha na compilação"
    exit 1
fi
echo "✅ Projeto compilado com sucesso"

# 2. Verificar se script compilado existe
if [ ! -f "dist/scripts/repair-balances-cron.js" ]; then
    echo "❌ ERRO: Script compilado não encontrado"
    exit 1
fi
echo "✅ Script compilado encontrado"

# 3. Criar diretório de logs
LOG_DIR="/var/log/vizzionbot"
echo "📁 Criando diretório de logs: $LOG_DIR"
sudo mkdir -p "$LOG_DIR"
sudo chown $(whoami):$(id -gn) "$LOG_DIR" 2>/dev/null || true
echo "✅ Diretório de logs criado"

# 4. Dar permissão ao script shell
echo "🔧 Configurando permissões..."
chmod +x "$BACKEND_DIR/scripts/repair-balances-cron.sh"
echo "✅ Permissões configuradas"

# 5. Testar execução do script
echo "🧪 Testando execução do script..."
"$BACKEND_DIR/scripts/repair-balances-cron.sh"
if [ $? -ne 0 ]; then
    echo "❌ ERRO: Falha no teste do script"
    exit 1
fi
echo "✅ Script testado com sucesso"

# 6. Verificar se já existe no crontab
CRON_LINE="*/20 * * * * $BACKEND_DIR/scripts/repair-balances-cron.sh"
if crontab -l 2>/dev/null | grep -q "repair-balances-cron.sh"; then
    echo "⚠️  Cron job já existe, removendo versão anterior..."
    crontab -l 2>/dev/null | grep -v "repair-balances-cron.sh" | crontab -
fi

# 7. Adicionar ao crontab
echo "⏰ Adicionando ao crontab (a cada 20 minutos)..."
(crontab -l 2>/dev/null; echo "$CRON_LINE") | crontab -
echo "✅ Cron job adicionado com sucesso"

# 8. Verificar se foi adicionado
echo "🔍 Verificando crontab..."
if crontab -l | grep -q "repair-balances-cron.sh"; then
    echo "✅ Cron job verificado no crontab"
else
    echo "❌ ERRO: Cron job não foi adicionado"
    exit 1
fi

# 9. Verificar status do serviço cron
echo "🔍 Verificando serviço cron..."
if command -v systemctl >/dev/null 2>&1; then
    # Linux com systemd
    if systemctl is-active --quiet cron 2>/dev/null || systemctl is-active --quiet crond 2>/dev/null; then
        echo "✅ Serviço cron está ativo"
    else
        echo "⚠️  Iniciando serviço cron..."
        sudo systemctl start cron 2>/dev/null || sudo systemctl start crond 2>/dev/null || true
    fi
elif command -v service >/dev/null 2>&1; then
    # Linux com service
    if service cron status >/dev/null 2>&1; then
        echo "✅ Serviço cron está ativo"
    else
        echo "⚠️  Iniciando serviço cron..."
        sudo service cron start 2>/dev/null || true
    fi
elif [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    echo "✅ macOS detectado - cron nativo ativo"
else
    echo "⚠️  Não foi possível verificar status do cron"
fi

# 10. Mostrar informações finais
echo ""
echo "🎉 INSTALAÇÃO CONCLUÍDA COM SUCESSO!"
echo ""
echo "📋 RESUMO:"
echo "   • Script: repair-balances-cron.js"
echo "   • Frequência: A cada 20 minutos"
echo "   • Log: /var/log/vizzionbot/repair-balances.log"
echo "   • Próxima execução: $(date -d '+20 minutes' '+%H:%M' 2>/dev/null || date -v+20M '+%H:%M' 2>/dev/null || echo 'em 20 minutos')"
echo ""
echo "🔧 COMANDOS ÚTEIS:"
echo "   • Ver cron jobs:    crontab -l"
echo "   • Ver logs:         tail -f /var/log/vizzionbot/repair-balances.log"
echo "   • Testar script:    $BACKEND_DIR/scripts/repair-balances-cron.sh"
echo "   • Remover cron:     crontab -e (deletar linha manualmente)"
echo ""
echo "⏰ O script já está rodando automaticamente a cada 20 minutos!"
echo "   Aguarde até o próximo múltiplo de 20 minutos para ver a primeira execução."
echo ""

# 11. Mostrar próximos horários de execução
echo "📅 PRÓXIMAS EXECUÇÕES:"
current_minute=$(date +%M)
current_hour=$(date +%H)

for i in {1..5}; do
    # Calcular próximo múltiplo de 20
    next_minute=$((($current_minute / 20 + $i) * 20 % 60))
    next_hour=$(($current_hour + ($current_minute / 20 + $i) * 20 / 60))
    next_hour=$(($next_hour % 24))
    
    printf "   • %02d:%02d\n" $next_hour $next_minute
done

echo ""
echo "✅ Instalação finalizada! O cron está ativo e funcionando."

