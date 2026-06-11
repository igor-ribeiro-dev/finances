# Data Model — Dashboard de Orçamentos e Despesas (009)

**Date**: 2026-06-10 | **Plan**: [plan.md](plan.md)

> **Nenhuma tabela, coluna, enum ou migração nova.** Esta feature define um
> **read-model derivado**, calculado sob demanda a partir das tabelas das
> features 004 (`User`/`FamilyGroup`), 006 (`Expense`), 007 (`Category`) e
> 008 (`Budget`). Este documento especifica a forma do envelope, as regras de
> derivação e os invariantes que os testes devem garantir.

## Fontes (tabelas existentes — sem alterações)

| Tabela | Uso no dashboard |
|--------|------------------|
| `Expense` | Fonte dos gastos. Filtro: `groupId` + `date ∈ [YYYY-MM-01, mês+1-01)` (data civil, FR-013/006). Somas de `amountCents` (Int) por `ownerMemberId` e por `categoryId`. `paymentMethod` é irrelevante para os totais (FR-003). |
| `Budget` | Limites do mês via `get-month-budget.use-case` (008) — já resolvidos (`resolvedCents`). |
| `Category` | Árvore raiz/sub (2 níveis) para agregação raiz = direta + subs e nomes. |
| `User` | Nomes dos membros; `familyGroupId === groupId` distingue membro ativo de ex-membro. |

## Read model (envelope do `GET /api/v1/dashboard?month=`)

### MonthDashboard

| Campo | Tipo | Derivação |
|-------|------|-----------|
| `month` | `string` `YYYY-MM` | Echo do parâmetro validado. |
| `family` | `FamilySummary` | Ver abaixo. |
| `members` | `MemberSpending[]` | Membros ativos (todos) + ex-membros com gasto > 0. |
| `categories` | `CategorySpending[]` | Todas as categorias do grupo (árvore achatada com `parentId`). |
| `uncategorizedSpentCents` | `int ≥ 0` | Soma de despesas com `categoryId = null` no mês. |

### FamilySummary

| Campo | Tipo | Derivação |
|-------|------|-----------|
| `spentCents` | `int ≥ 0` | `SUM(amountCents)` de todas as despesas do grupo no mês. |
| `budget` | `ResolvedLimit \| null` | Budget FAMILY do mês (008); `null` quando não definido. Família é sempre ABSOLUTE, logo `resolvedCents` nunca é "não resolvível" quando presente. |

### MemberSpending

| Campo | Tipo | Derivação |
|-------|------|-----------|
| `memberId` | `string` | `User.id`. |
| `name` | `string` | `User.name` (preservado para ex-membros — FR-018/006). |
| `isExMember` | `boolean` | `User.familyGroupId !== groupId`. |
| `spentCents` | `int ≥ 0` | `SUM(amountCents)` das despesas com `ownerMemberId = memberId` no mês; `0` para ativo sem despesas. |
| `budget` | `ResolvedLimit \| null` | Budget MEMBER resolvido (008). Sempre `null` para ex-membro (orçamentos deixam de existir — edge case 008). |

### CategorySpending

| Campo | Tipo | Derivação |
|-------|------|-----------|
| `categoryId` | `string` | `Category.id`. |
| `name` | `string` | `Category.name`. |
| `parentId` | `string \| null` | `null` = raiz. |
| `directSpentCents` | `int ≥ 0` | Soma das despesas lançadas exatamente nesta categoria. |
| `spentCents` | `int ≥ 0` | **Raiz**: `directSpentCents + Σ directSpentCents das subs` (Clarification Q1). **Sub**: `= directSpentCents`. |
| `budget` | `ResolvedLimit \| null` | Budget CATEGORY resolvido (008); percentual não resolvível → tratar como `null` na exibição (FR-007). |

### ResolvedLimit (reuso da feature 008 — sem mudanças)

`{ limitType: 'ABSOLUTE' | 'PERCENT', amountCents: int|null, percent: int|null, resolvedCents: int|null }`

## Valores derivados na exibição (frontend, `utils/percent.ts`)

| Valor | Fórmula (inteiros) | Regra |
|-------|--------------------|-------|
| Consumo vs. limite | `round(spentCents × 100 / resolvedCents)` | `resolvedCents` ausente/≤ 0 → sem percentual ("orçamento não definido"); > 100 permitido (estouro, FR-004). |
| Saldo / excesso | `resolvedCents − spentCents` | Negativo = excesso destacado. |
| Participação de raiz | `round(spentCents × 100 / totalMêsCents)` | `totalMêsCents = family.spentCents`; total 0 → estado vazio (FR-016). |
| Participação de sub | `round(spentCents × 100 / raiz.spentCents)` | Base = raiz pai (Clarification Q3). |

## Invariantes (alvos de teste)

1. **Conservação por membro** (Q2): `family.spentCents = Σ members[].spentCents` — inclui ex-membros.
2. **Conservação por categoria**: `family.spentCents = Σ raízes.spentCents + uncategorizedSpentCents`.
3. **Raiz guarda-chuva** (Q1): `raiz.spentCents = raiz.directSpentCents + Σ subs.directSpentCents`.
4. **Sem negativos**: todo `spentCents ≥ 0` (despesas têm `amountCents > 0` por FR-010/006).
5. **Mês vazio**: todos os totais = 0; arrays presentes; nenhum percentual calculado (sem divisão por zero).
6. **Isolamento**: nenhum dado de outro `groupId` pode aparecer (agregação parte do `groupId` da sessão).
7. **Aritmética inteira**: todos os campos monetários são `int` (centavos) de ponta a ponta.

## Estados e transições

Não há ciclo de vida próprio — o read-model é recalculado a cada `GET`. Mudanças
em despesas/orçamentos/categorias/membros são refletidas no próximo carregamento
(FR-017, SC-006); não há cache nem snapshot persistido.
