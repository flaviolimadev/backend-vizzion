# 📋 API Admin Saques - Documentação

## 🎯 Endpoints Disponíveis

### 1. **GET `/admin/saques`** - Listar todos os saques
Lista todos os saques da plataforma com informações completas do usuário.

**Query Parameters:**
- `status` (opcional): Filtrar por status (0=PENDING, 1=PROCESSING, 2=COMPLETED, 3=CANCELLED)
- `limit` (opcional): Limitar número de resultados
- `offset` (opcional): Pular número de resultados

**Exemplo de uso:**
```bash
# Listar todos os saques
GET /admin/saques

# Listar apenas saques pendentes
GET /admin/saques?status=0

# Listar saques pagos com paginação
GET /admin/saques?status=2&limit=10&offset=0
```

**Resposta:**
```json
[
  {
    "id": "uuid-saque",
    "user_id": "uuid-user",
    "type": "balance",
    "amount": 100.00,
    "tax": 5.00,
    "final_amount": 95.00,
    "status": 0,
    "cpf": "123.456.789-00",
    "key_type": "cpf",
    "key_value": "123.456.789-00",
    "notes": null,
    "created_at": "2025-09-18T15:30:00Z",
    "updated_at": "2025-09-18T15:30:00Z",
    "user": {
      "id": "uuid-user",
      "nome": "João",
      "sobrenome": "Silva",
      "email": "joao@email.com",
      "contato": "11999999999",
      "balance": 500.00,
      "balance_invest": 1000.00,
      "plano": 3
    }
  }
]
```

---

### 2. **GET `/admin/saques/resumo`** - Resumo completo dos saques
Retorna estatísticas detalhadas dos saques por status.

**Exemplo de uso:**
```bash
GET /admin/saques/resumo
```

**Resposta:**
```json
{
  "resumo_por_status": {
    "pendentes": {
      "count": 15,
      "total_solicitado": 2500.00,
      "total_liquido": 2125.00,
      "total_taxa": 375.00,
      "status": "PENDING",
      "descricao": "Saques aguardando processamento"
    },
    "processando": {
      "count": 5,
      "total_solicitado": 800.00,
      "total_liquido": 720.00,
      "total_taxa": 80.00,
      "status": "PROCESSING",
      "descricao": "Saques em processamento"
    },
    "pagos": {
      "count": 120,
      "total_solicitado": 25000.00,
      "total_liquido": 21250.00,
      "total_taxa": 3750.00,
      "status": "COMPLETED",
      "descricao": "Saques concluídos/pagos"
    },
    "cancelados": {
      "count": 8,
      "total_solicitado": 1200.00,
      "total_liquido": 1020.00,
      "total_taxa": 180.00,
      "status": "CANCELLED",
      "descricao": "Saques cancelados"
    }
  },
  "totais_gerais": {
    "total_saques": 148,
    "total_valor_solicitado": 29500.00,
    "total_valor_liquido": 25115.00,
    "total_taxas_arrecadadas": 4205.00
  },
  "estatisticas": {
    "taxa_media": "14.25%",
    "valor_medio_saque": "199.32"
  }
}
```

---

### 3. **GET `/admin/saques/pendentes`** - Saques pendentes
Lista apenas os saques com status PENDING (0), ordenados do mais antigo para o mais novo.

**Exemplo de uso:**
```bash
GET /admin/saques/pendentes
```

---

### 4. **GET `/admin/saques/por-usuario/:userId`** - Saques por usuário
Lista todos os saques de um usuário específico com resumo.

**Exemplo de uso:**
```bash
GET /admin/saques/por-usuario/uuid-do-usuario
```

**Resposta:**
```json
{
  "usuario": {
    "id": "uuid-user",
    "nome": "João",
    "sobrenome": "Silva",
    "email": "joao@email.com",
    "contato": "11999999999",
    "balance": 500.00,
    "balance_invest": 1000.00,
    "plano": 3
  },
  "saques": [
    {
      "id": "uuid-saque",
      "amount": 100.00,
      "final_amount": 95.00,
      "status": 2,
      "created_at": "2025-09-18T15:30:00Z"
    }
  ],
  "resumo": {
    "total_saques": 3,
    "total_solicitado": 450.00,
    "total_liquido": 382.50,
    "total_taxas": 67.50
  }
}
```

---

### 5. **GET `/admin/saques/:id`** - Detalhes de um saque
Obtém detalhes completos de um saque específico.

**Exemplo de uso:**
```bash
GET /admin/saques/uuid-do-saque
```

---

### 6. **PATCH `/admin/saques/:id/status`** - Atualizar status
Atualiza o status de um saque específico.

**Body:**
```json
{
  "status": 2,
  "notes": "Pagamento realizado via PIX em 18/09/2025"
}
```

**Exemplo de uso:**
```bash
PATCH /admin/saques/uuid-do-saque/status
Content-Type: application/json

{
  "status": 2,
  "notes": "Saque processado com sucesso"
}
```

**Resposta:**
```json
{
  "success": true,
  "message": "Status do saque atualizado para CONCLUÍDO",
  "saque": {
    "id": "uuid-saque",
    "status": 2,
    "notes": "Saque processado com sucesso",
    "updated_at": "2025-09-18T16:00:00Z",
    "user": { ... }
  }
}
```

---

## 📊 Status dos Saques

| Status | Valor | Descrição |
|--------|-------|-----------|
| **PENDING** | 0 | Saques aguardando processamento |
| **PROCESSING** | 1 | Saques em processamento |
| **COMPLETED** | 2 | Saques concluídos/pagos |
| **CANCELLED** | 3 | Saques cancelados |

---

## 🔐 Autenticação

Todos os endpoints requerem:
- **JWT Token** no header `Authorization: Bearer <token>`
- **Role de Admin** - apenas usuários com `role: 'admin'` podem acessar

---

## 📝 Campos Importantes

### Informações do Saque:
- `amount`: Valor solicitado pelo usuário
- `tax`: Taxa cobrada (5% para balance, 25% para balance_invest)
- `final_amount`: Valor líquido que o usuário receberá
- `type`: Tipo do saque (`balance` ou `balance_invest`)
- `key_type` / `key_value`: Chave PIX do usuário

### Informações do Usuário:
- `nome`, `sobrenome`, `email`, `contato`: Dados pessoais
- `balance`: Saldo disponível para saque
- `balance_invest`: Saldo investido
- `plano`: Plano atual do usuário (0 = sem plano, 1-10 = planos pagos)

---

## 🚀 Como Usar

1. **Visualizar resumo geral:**
   ```bash
   GET /admin/saques/resumo
   ```

2. **Ver saques pendentes para processar:**
   ```bash
   GET /admin/saques/pendentes
   ```

3. **Aprovar um saque:**
   ```bash
   PATCH /admin/saques/{id}/status
   { "status": 2, "notes": "Pago via PIX" }
   ```

4. **Cancelar um saque:**
   ```bash
   PATCH /admin/saques/{id}/status
   { "status": 3, "notes": "Cancelado por solicitação do usuário" }
   ```

