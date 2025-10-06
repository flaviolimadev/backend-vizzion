# 🔧 Cron Repair Balances - Instalação Automática

Este documento explica como instalar e usar o sistema de correção automática de saldos.

## 🚀 Instalação Automática (Recomendado)

### No Servidor de Produção:

```bash
# 1. Fazer upload dos arquivos para o servidor
# 2. Entrar no diretório do backend
cd /path/to/backend-vizzion

# 3. Executar instalação automática
chmod +x install-cron.sh && ./install-cron.sh
```

**Pronto! O cron está funcionando automaticamente a cada 20 minutos.**

---

## 📋 O que o Script de Instalação Faz

✅ **Compila o projeto TypeScript**  
✅ **Cria diretório de logs** (`/var/log/vizzionbot/`)  
✅ **Configura permissões** dos scripts  
✅ **Testa a execução** do script  
✅ **Adiciona ao crontab** (a cada 20 minutos)  
✅ **Verifica o serviço cron** está ativo  
✅ **Mostra próximos horários** de execução  

---

## ⏰ Frequência de Execução

O script roda automaticamente nos seguintes horários:
```
00:00, 00:20, 00:40
01:00, 01:20, 01:40  
02:00, 02:20, 02:40
...
23:00, 23:20, 23:40
```

**Total: 72 execuções por dia**

---

## 📊 Monitoramento

### Ver Logs em Tempo Real:
```bash
tail -f /var/log/vizzionbot/repair-balances.log
```

### Ver Últimas Execuções:
```bash
tail -n 50 /var/log/vizzionbot/repair-balances.log
```

### Verificar Cron Jobs Ativos:
```bash
crontab -l
```

---

## 🔧 Comandos Úteis

### Testar Script Manualmente:
```bash
cd /path/to/backend-vizzion
./scripts/repair-balances-cron.sh
```

### Ver Status do Cron:
```bash
# Linux
sudo service cron status

# ou
sudo systemctl status cron
```

### Editar Cron Jobs:
```bash
crontab -e
```

---

## 🗑️ Desinstalação

Para remover o cron:
```bash
chmod +x uninstall-cron.sh && ./uninstall-cron.sh
```

Ou manualmente:
```bash
crontab -e
# Deletar a linha: */20 * * * * /path/to/repair-balances-cron.sh
```

---

## 📁 Estrutura de Arquivos

```
backend-vizzion/
├── install-cron.sh              # 🚀 Script de instalação automática
├── uninstall-cron.sh            # 🗑️ Script de desinstalação
├── scripts/
│   └── repair-balances-cron.sh  # 📜 Script shell otimizado
├── src/scripts/
│   ├── repair-balances.ts       # 📄 Script original completo
│   └── repair-balances-cron.ts  # ⚡ Script otimizado para cron
└── dist/scripts/
    ├── repair-balances.js       # 📦 Compilado original
    └── repair-balances-cron.js  # 📦 Compilado otimizado
```

---

## 🔍 Troubleshooting

### Problema: "Permission denied"
```bash
chmod +x install-cron.sh
chmod +x scripts/repair-balances-cron.sh
```

### Problema: "Command not found: node"
```bash
# Verificar se Node.js está instalado
which node
npm --version

# Se não estiver, instalar Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### Problema: "Cannot connect to database"
- Verificar se as variáveis de ambiente estão configuradas
- Verificar se o banco de dados está acessível
- Verificar arquivo `.env`

### Problema: Cron não executa
```bash
# Verificar se o serviço cron está rodando
sudo service cron start

# Verificar logs do sistema
tail -f /var/log/syslog | grep CRON
```

---

## 📈 Logs de Exemplo

### Execução Normal (sem extratos para reparar):
```
[2024-01-15T10:00:01.123Z] No extratos to repair
[2024-01-15T10:20:01.456Z] No extratos to repair
```

### Execução com Reparos:
```
[2024-01-15T10:40:01.789Z] 🔍 Found 3 extratos to repair
[2024-01-15T10:40:02.234Z] ✅ Repaired 3 extratos, credited R$ 75.50 in 445ms
```

### Erro de Conexão:
```
[2024-01-15T10:00:01.789Z] ❌ Repair script failed: Error: Database connection timeout
```

---

## ✅ Checklist de Instalação

- [ ] Arquivo `install-cron.sh` tem permissão de execução
- [ ] Executou `./install-cron.sh` no diretório correto
- [ ] Viu a mensagem "INSTALAÇÃO CONCLUÍDA COM SUCESSO!"
- [ ] Comando `crontab -l` mostra o job ativo
- [ ] Diretório `/var/log/vizzionbot/` foi criado
- [ ] Aguardou 20 minutos e verificou o primeiro log

---

## 🎯 Resumo

**Para instalar no servidor:**
```bash
cd /path/to/backend-vizzion
chmod +x install-cron.sh && ./install-cron.sh
```

**Para monitorar:**
```bash
tail -f /var/log/vizzionbot/repair-balances.log
```

**Para desinstalar:**
```bash
chmod +x uninstall-cron.sh && ./uninstall-cron.sh
```

**Tudo automatizado e pronto para produção!** 🚀✨

