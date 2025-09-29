#!/bin/bash

# 🗑️ Script de Desinstalação do Cron para Repair Balances
# Executa: chmod +x uninstall-cron.sh && ./uninstall-cron.sh

echo "🗑️ Removendo cron repair-balances..."

# Remover do crontab
if crontab -l 2>/dev/null | grep -q "repair-balances-cron.sh"; then
    echo "⏰ Removendo do crontab..."
    crontab -l 2>/dev/null | grep -v "repair-balances-cron.sh" | crontab -
    echo "✅ Removido do crontab"
else
    echo "ℹ️  Cron job não encontrado no crontab"
fi

# Verificar se foi removido
if crontab -l 2>/dev/null | grep -q "repair-balances-cron.sh"; then
    echo "❌ ERRO: Não foi possível remover do crontab"
    exit 1
else
    echo "✅ Cron job removido com sucesso"
fi

echo ""
echo "🎉 DESINSTALAÇÃO CONCLUÍDA!"
echo ""
echo "📋 O que foi removido:"
echo "   • Cron job do repair-balances"
echo ""
echo "📋 O que permanece (caso queira remover manualmente):"
echo "   • Scripts: $(pwd)/scripts/"
echo "   • Logs: /var/log/vizzionbot/"
echo "   • Código compilado: $(pwd)/dist/scripts/"
echo ""
