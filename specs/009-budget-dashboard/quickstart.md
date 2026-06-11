# Quickstart — Dashboard de Orçamentos e Despesas (009)

**Plan**: [plan.md](plan.md) | **Contract**: [contracts/openapi.yaml](contracts/openapi.yaml)

## Pré-requisitos

- Node.js 20 LTS, npm workspaces instalados na raiz (`npm install`).
- Postgres 15 rodando com o banco de dev migrado (**nenhuma migração nova nesta
  feature** — `npx prisma migrate dev` no `backend/` só precisa estar em dia
  até a 008).
- Dados de exemplo: um grupo com 2+ membros, categorias (007), despesas no mês
  corrente (006) e orçamentos definidos (008) — o fluxo manual abaixo assume isso.

## Rodando

```bash
# Backend (porta 3000)
npm run dev --workspace backend

# Frontend (Vite, porta 5173, proxy para /api)
npm run dev --workspace frontend
```

## Testes (TDD — escrever antes, ver falhar, implementar)

```bash
# Backend — unitários do agregador + contrato HTTP do GET /dashboard
npm test --workspace backend -- --testPathPattern dashboard

# Frontend — página, componentes e hook do dashboard
npm test --workspace frontend -- --testPathPattern -i dashboard
```

## Smoke test da API

```bash
# 1. Login (grava o cookie de sessão)
curl -c /tmp/sid.txt -H 'Content-Type: application/json' \
  -d '{"email":"igor@example.com","password":"secret123"}' \
  http://localhost:3000/api/v1/auth/login

# 2. Dashboard do mês corrente
curl -b /tmp/sid.txt 'http://localhost:3000/api/v1/dashboard?month=2026-06' | jq

# Esperado: { month, family: { spentCents, budget }, members[], categories[],
#             uncategorizedSpentCents } — tudo em centavos inteiros.

# 3. Mês sem dados → totais zerados, sem erro
curl -b /tmp/sid.txt 'http://localhost:3000/api/v1/dashboard?month=2020-01' | jq

# 4. Mês inválido → 400 dashboard.invalid_month
curl -b /tmp/sid.txt 'http://localhost:3000/api/v1/dashboard?month=2026-13' | jq
```

## Verificação manual (espelha as User Stories)

1. **US1** — Abra `http://localhost:5173/` logado: o dashboard abre no mês
   corrente com total gasto vs. orçamento da família (percentual + saldo).
   Zere o orçamento da família em `/orcamentos` e recarregue: aparece
   "orçamento não definido" com link para `/orcamentos`.
2. **US2** — Confira uma linha por membro com gasto/limite/%/saldo; um membro
   acima do limite aparece destacado (>100%). Orçamento percentual de membro
   aparece resolvido em R$.
3. **US3** — Seção de categorias ordenada por participação; expanda uma raiz
   com sub-categorias: percentuais relativos à raiz (somam ~100% dela);
   despesas sem categoria aparecem em "Sem categoria".
4. **US4** — Navegue para um mês passado (todas as seções mudam juntas); o
   botão de avançar trava no mês corrente; "voltar ao mês atual" retorna em
   um clique.

## Invariantes para conferir em qualquer tela

- Soma das linhas de membros = total da família (inclui linha "ex-membro").
- Soma das raízes + "Sem categoria" = total da família.
- Nenhum percentual exibido quando o limite não existe (nada de ∞/NaN).
