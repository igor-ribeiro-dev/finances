# Quickstart — Expense Consolidation (feature 011)

Pré-requisitos: monorepo das features 001/004–010 rodando localmente
(`npm install` na raiz; Postgres 15 acessível; backend e frontend em dev).

## 1. Aplicar a migração (IRREVERSÍVEL — faça backup antes)

A migração 011 converte despesas em contas Pagas e **dropa a tabela `Expense`**
(Clarification Q2). Em qualquer ambiente com dados reais, faça backup primeiro.

```bash
# Backup (exemplo)
pg_dump "$DATABASE_URL" > backup_pre_011_$(date +%Y%m%d%H%M%S).sql

# Migração
cd backend
npx prisma migrate deploy      # aplica 2026XXXX_011_expense_consolidation
```

Verifique no banco: `SELECT count(*) FROM "Bill" WHERE status='PAID';` deve ter
crescido pelo número de despesas avulsas; a tabela `"Expense"` não existe mais.

## 2. Registrar um gasto (FR-001)

1. Abra `/pagamentos` no app (o item de nav "Despesas" não existe mais).
2. Clique em **"Registrar gasto"** → preencha descrição, valor, data (default:
   hoje), método, responsável e (opcional) categoria → salvar.
3. O item aparece **imediatamente** no checklist como **Paga**, no mês da **data
   da compra** (se você retrodatar para outro mês, ele aparece naquele mês — Q1).

Equivalente via API:

```bash
curl -sS -X POST http://localhost:3000/api/v1/bills/log \
  -H 'Content-Type: application/json' --cookie "sid=$SID" \
  -d '{"description":"Mercado","amountCents":8990,"date":"2026-06-14",
       "paymentMethod":"CASH_OR_DEBIT","paidByMemberId":"<member-uuid>"}'
# → 201; Bill com status=PAID, payment.paidByMember preenchido, ownerMemberId=null
```

## 3. Conferir o dashboard (FR-003/FR-006/SC-002)

Abra `/` (dashboard) no mês `2026-06`: o gasto conta no **total da família**, no
**membro responsável** (pagador) e na **categoria** (se houver). Para meses
históricos, os totais são **idênticos** aos de antes da migração.

## 4. Conferir as remoções (FR-007)

```bash
# Rota antiga no navegador redireciona ao tracker:
#   abrir /despesas  → carrega /pagamentos

# API de despesa não existe mais:
curl -sS -o /dev/null -w '%{http_code}\n' \
  http://localhost:3000/api/v1/expenses --cookie "sid=$SID"   # → 404
```

## 5. Editar / reverter (FR-008/FR-009)

- Editar a conta Paga (valor, data, descrição, método, responsável, categoria) →
  os totais do dashboard atualizam ao recarregar.
- Reverter para Pendente → o gasto deixa de contar até ser pago de novo.
- Excluir (com confirmação) → o valor sai de todos os totais.

## 6. Testes

```bash
# Backend (inclui teste de conversão lossless da migração — SC-002/003)
cd backend && npm test

# Frontend (QuickLogModal, PaymentsPage, BillItem com paidByMember, redirect)
cd frontend && npm test
```
