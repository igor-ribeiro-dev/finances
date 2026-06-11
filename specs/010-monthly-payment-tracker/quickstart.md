# Quickstart: Monthly Payment Tracker (010)

## Pré-requisitos

- Node.js 20 LTS, npm 10+, Docker (Postgres 15).
- Setup do monorepo já feito (features 001/004–009): `npm install` na raiz.

## Subir o ambiente

```bash
# Postgres local (se ainda não estiver rodando)
docker compose up -d postgres

# Aplicar a migração nova
npm run -w backend prisma:migrate   # aplica 2026XXXX_010_monthly_payment_tracker

# Backend (porta 3000) e frontend (porta 5173)
npm run -w backend dev
npm run -w frontend dev
```

## Rodar os testes (TDD — devem existir e FALHAR antes da implementação)

```bash
# Unitários puros (recurrence-engine, bill-summary, filtros do copy)
npm run -w backend test -- application/bill application/recurring-bill

# Contrato HTTP (bills + recurring-bills + guarda em expenses)
npm run -w backend test -- api/bills api/recurring-bills

# Frontend (PaymentsPage, modais, contas fixas, despesas travadas)
npm run -w frontend test -- bills
```

## Exercitar a feature manualmente

1. Logue com um usuário de um grupo familiar (feature 004) e abra
   **Pagamentos** no menu (`/pagamentos`).
2. **Conta avulsa**: "Nova conta" → descrição "Aluguel", valor `2000,00`,
   vencimento dia 10 do mês atual → aparece como **Pendente** no checklist;
   o resumo mostra o valor em "previsto" e "pendente".
3. **Pagar**: na conta, "Marcar como paga" → formulário pré-preenchido
   (valor esperado + hoje) → altere o valor real para `1987,50` → confirme.
   A conta exibe esperado E pago; em `/despesas` existe a despesa
   correspondente **sem botões de editar/excluir** e com aviso apontando
   para o tracker; o dashboard `/` reflete o gasto no mês do pagamento.
4. **Corrigir/reverter**: "Editar pagamento" altera valor/data e a despesa
   acompanha; "Reverter pagamento" volta a Pendente e a despesa some.
5. **Cancelar**: em uma Pendente, "Cancelar" → permanece visível riscada e
   fora dos totais; "Reativar" desfaz.
6. **Conta fixa**: em "Contas fixas" → nova: "Conta de energia", `300,00`,
   dia 10, mensal, início mês atual (se o dia 10 já passou, o app pergunta
   "incluir mês atual?"). O mês atual e o seguinte ganham a instância
   **Pendente** (badge "Conta fixa") na hora; navegue para meses além do
   seguinte → a conta aparece como **"Prevista"** (projeção somente
   leitura, sem ações, com total próprio no resumo). Edite o valor de UMA
   instância Pendente → outros meses não mudam. Pause → some das previsões
   e o mês seguinte não gera; retome. Encerre/exclua → Pendentes de meses
   futuros viram Canceladas e as previsões somem; meses passados intactos.
7. **Copiar mês anterior**: em um mês vazio, "Copiar contas do mês
   anterior" → confirmação mostra a contagem (só avulsas não-canceladas;
   instâncias de contas fixas ficam de fora) → confirme e confira o checklist.

## Validações de aceitação rápidas

| Critério | Verificação |
|----------|-------------|
| SC-001 | Criar conta avulsa em < 1 min (3 campos + defaults) |
| SC-002 | Resumo esperado/pago/pendente visível no topo ao abrir o mês |
| SC-003 | Toda conta paga gera despesa visível em /despesas e no dashboard |
| SC-004 | Conta paga com valor ≠ esperado exibe os dois valores |
| SC-005 | Cancelada riscada, visível, fora dos 3 totais |
| SC-006 | Reverter remove a despesa de /despesas e do dashboard |
| SC-007 | Conta fixa: Pendente no mês atual/seguinte e "Prevista" nos demais, sem redigitação |
