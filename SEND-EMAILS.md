# 📧 Script de Envio de Email: OP AO VIVO

## 📋 Descrição

Script para enviar email de anúncio da nova funcionalidade "OP AO VIVO" para todos os usuários ativos da plataforma.

## ✨ Características

- ✅ Envia para todos os usuários com email válido e status ativo
- ✅ Template HTML profissional com design moderno
- ✅ Delay configurável entre envios (padrão: 3 segundos)
- ✅ Logs detalhados de progresso
- ✅ Relatório final com estatísticas
- ✅ Tratamento de erros por usuário

## 🚀 Como Executar

```bash
cd backend-vizzion
npm run script:send-live-ops
```

## ⚙️ Configuração

### Delay entre envios

Edite o arquivo `src/scripts/send-live-ops-announcement.ts`:

```typescript
const DELAY_BETWEEN_EMAILS = 3; // 3 segundos entre cada email
```

### URL do Frontend

Certifique-se de ter a variável `FRONTEND_URL` no `.env`:

```env
FRONTEND_URL=https://app.vizzionbot.pro
```

## 📊 Saída Esperada

```
🚀 Inicializando envio de anúncio OP AO VIVO...

📧 Encontrados 150 usuários para envio

⚠️  ATENÇÃO: Este script enviará emails para TODOS os usuários ativos.
   Total de emails a enviar: 150
   Delay entre envios: 3 segundos
   Tempo estimado: 8 minutos

[1/150] Enviando para: user1@example.com (João Silva)
   ✅ Enviado com sucesso!
   ⏳ Aguardando 3 segundos...

[2/150] Enviando para: user2@example.com (Maria Santos)
   ✅ Enviado com sucesso!
   ⏳ Aguardando 3 segundos...

...

============================================================
📊 RESUMO DO ENVIO
============================================================
✅ Emails enviados com sucesso: 148
❌ Erros: 2
📧 Total processado: 150
============================================================

✅ Processo concluído!
```

## 📝 Template

O template usado é: `src/mail/templates/live-ops-announcement.html`

### Variáveis do Template:

- `{{app_name}}` - Nome da aplicação
- `{{user_name}}` - Nome do usuário
- `{{action_url}}` - URL para acessar a plataforma
- `{{year}}` - Ano atual

## ⚠️ Avisos

- **Execute apenas uma vez** para evitar spam aos usuários
- O script envia para **TODOS os usuários ativos**
- Não há confirmação adicional após iniciar
- Recomenda-se testar primeiro com um usuário específico

## 🧪 Teste com Usuário Específico

Para testar com apenas um usuário, modifique a query SQL no script:

```typescript
const users = await dataSource.query(`
  SELECT id, nome, sobrenome, email, contato 
  FROM users 
  WHERE email = 'seu-email@exemplo.com'
    AND status = 1
  LIMIT 1
`);
```

## 📧 Assunto do Email

```
🎉 Nova Funcionalidade: Acompanhe suas Operações ao Vivo!
```

## 🎨 Preview do Email

O email inclui:
- 📊 Ícone chamativo
- 🎯 Lista de benefícios da nova funcionalidade
- 🚀 Botão de call-to-action
- 💼 Design profissional e responsivo

## 🔧 Troubleshooting

### Erro: "Template não encontrado"

Certifique-se de que o arquivo existe:
```bash
ls -la src/mail/templates/live-ops-announcement.html
```

### Erro: "RESEND_API_KEY não encontrado"

Adicione no `.env`:
```env
RESEND_API_KEY=re_xxxxxxxxxxxxx
MAIL_FROM=Vizzion Bot <noreply@vizzionbot.pro>
```

### Erro de conexão com banco de dados

Verifique as credenciais no `.env`:
```env
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=sua_senha
DB_DATABASE=vizzionbot
```

## 📈 Métricas

O script rastreia:
- Número total de usuários
- Emails enviados com sucesso
- Emails com erro
- Tempo estimado de execução

## 🔒 Segurança

- Apenas usuários com `status = 1` (ativos) recebem email
- Validação de email não nulo/vazio
- Erros individuais não interrompem o processo
- Logs não expõem informações sensíveis

