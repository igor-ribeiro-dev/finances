# Phase 0 — Research: Gestão de Orçamentos

**Feature**: 008-budget-management | **Date**: 2026-06-09

A Technical Context não tem `NEEDS CLARIFICATION` (stack 100% herdada das features 004/006/007 e 8 clarifications já integradas na spec). Este documento registra as **decisões de design** não triviais e as alternativas descartadas.

---

## D1 — Modelo polimórfico único vs. três tabelas

**Decision**: Uma única tabela `Budget` com `targetType` ∈ {FAMILY, MEMBER, CATEGORY} e referências nuláveis `targetMemberId` / `targetCategoryId`.

**Rationale**: As três dimensões compartilham exatamente os mesmos atributos (mês, tipo de limite, valor/percentual, timestamps, scoping por grupo) e são sempre lidas juntas no retrato do mês. Uma tabela = uma query, um conjunto de use cases, um serializer. Princípio IV (Simplicidade): duplicação preferida a abstração prematura, mas aqui não há duplicação — é a mesma entidade com alvos diferentes.

**Alternatives considered**:
- *Três tabelas (`FamilyBudget`, `MemberBudget`, `CategoryBudget`)*: triplica migrations, repositórios e queries; a leitura do mês viraria 3 queries + merge. Rejeitado por complexidade sem ganho.
- *Coluna `targetId` genérica sem distinção de tipo*: impede FKs reais (membro vs. categoria) e os índices únicos parciais. Rejeitado — perde integridade referencial (Princípio III).

---

## D2 — Unicidade "um orçamento por (grupo, mês, alvo)"

**Decision**: Três **índices únicos parciais** em Postgres, um por `targetType`:
- `UNIQUE (groupId, month) WHERE targetType = 'FAMILY'`
- `UNIQUE (groupId, month, targetMemberId) WHERE targetType = 'MEMBER'`
- `UNIQUE (groupId, month, targetCategoryId) WHERE targetType = 'CATEGORY'`

**Rationale**: Um `@@unique` simples incluindo as colunas nuláveis não funciona — Postgres trata `NULL` como distinto, permitindo múltiplas linhas FAMILY (ambos os FKs nulos) para o mesmo mês. Índices parciais são exatamente o padrão já validado na feature 007 (unicidade case-insensitive de categoria por `parentId IS NULL`/`IS NOT NULL`). Enforça no banco → TOCTOU-safe sob POSTs concorrentes (Princípio III).

**Alternatives considered**:
- *Coluna sentinela (`COALESCE(targetMemberId, '∅')`)*: hack frágil, exige valores mágicos. Rejeitado.
- *Unicidade só na aplicação*: viola Princípio III (race conditions). Rejeitado.

---

## D3 — Representação do mês

**Decision**: Coluna `month DATE` normalizada para o **primeiro dia do mês** (`YYYY-MM-01`). Na API, o mês trafega como string `YYYY-MM`. Validação Zod com regex `^\d{4}-(0[1-9]|1[0-2])$`.

**Rationale**: `DATE` no dia 1 é type-consistente com `Expense.date` (`@db.Date`), permite "mês anterior" via aritmética de data (`month - interval '1 month'`) e ordena naturalmente. A fronteira HTTP usa `YYYY-MM` (sem dia) para refletir que a unidade é o mês, eliminando ambiguidade de fuso. A conversão `YYYY-MM` ↔ `YYYY-MM-01` é feita em UTC na borda, reusando o mesmo cuidado de `isValidCalendarDate` já presente em `expense.validators.ts`.

**Alternatives considered**:
- *`year Int` + `month Int`*: explícito mas exige índice composto extra e cálculo manual de "mês anterior" (tratar virada de ano). Rejeitado por ergonomia.
- *`CHAR(7)` "YYYY-MM"*: legível, mas perde aritmética de data nativa para a cópia do mês anterior. Rejeitado.

---

## D4 — Resolução de percentuais: runtime vs. coluna persistida

**Decision**: `resolvedCents` é **calculado em runtime** no `get-month-budget.use-case` (via `budget-resolver.ts` puro), nunca persistido. Persistimos apenas o dado bruto: `limitType` + (`amountCents` **ou** `percent`).

Regras de resolução:
- FAMILY → `amountCents` (sempre ABSOLUTE).
- MEMBER/raiz ABSOLUTE → `amountCents`.
- MEMBER/raiz PERCENT → `round(percent × familyAmountCents / 100)`; `null` ("não resolvível") se a família não estiver definida.
- Sub-categoria ABSOLUTE → `amountCents`.
- Sub-categoria PERCENT → `round(percent × resolvedRootCents / 100)`; `null` se a raiz pai não tiver valor resolvível.

**Rationale**: Alterar o orçamento da família (FR-024) re-resolve **automaticamente** todos os dependentes sem migração de dados nem invalidação de cache — basta reler. Evita uma classe inteira de bugs de consistência (valor derivado defasado). Princípio IV.

**Alternatives considered**:
- *Coluna `resolvedCents` materializada + trigger*: rápida para leitura, mas qualquer mudança na base exigiria recalcular em cascata via trigger PL/pgSQL (complexidade, Princípio IV) e arrisca defasagem. Rejeitado.

---

## D5 — Arredondamento half-up em aritmética inteira

**Decision**: `resolvedCents = Math.round((percent * baseCents) / 100)`.

**Rationale**: `percent` e `baseCents` são inteiros; o produto é inteiro; dividir por 100 e `Math.round` dá half-up para valores não negativos (FR-021), que é o domínio (percentuais e centavos são sempre ≥ 0). Sem float intermediário com erro relevante: `percent * baseCents` cabe folgadamente em `Number` (≤ ~2e11 para os limites do domínio, bem abaixo de `Number.MAX_SAFE_INTEGER`). Atende o Princípio III (sem distorção de float em magnitudes do domínio).

**Alternatives considered**:
- *`decimal.js`*: desnecessário nesta magnitude; adiciona dependência. Rejeitado (Princípio IV).
- *Truncar (`Math.floor`)*: contradiz a clarification (half-up). Rejeitado.

---

## D6 — Comportamento de FK ao excluir categoria/membro (FR-015)

**Decision**: `Budget.targetCategoryId` e `Budget.targetMemberId` usam **`ON DELETE CASCADE`**; `Budget.groupId` também CASCADE.

**Rationale**: FR-015 exige que excluir uma categoria **remova** seus orçamentos sem bloquear. Isso é o oposto de `Expense.categoryId` (que usa `RESTRICT` e bloqueia a exclusão). Como o delete de categoria da feature 007 só é barrado por despesas (não por orçamentos), o CASCADE no `Budget` faz o banco limpar as linhas automaticamente — sem tocar no `preview-delete-category.use-case` nem no `delete-category.use-case`. Membros: hoje "sair do grupo" = `User.familyGroupId = null` (o `User` não é deletado), então o CASCADE não dispara nesse caso; o `get-month-budget` filtra membros pela associação atual ao grupo, de modo que orçamentos de ex-membros simplesmente não aparecem (e podem ser limpos preguiçosamente). O CASCADE cobre o hard-delete eventual de `User`.

**Edge interaction verificada**: a feature 007 conta dependências de categoria apenas via `Expense` (índice `expense_category_idx`); orçamentos **não** entram como bloqueadores — alinhado à FR-015. Nenhuma mudança necessária no contrato/serializer de categoria.

**Alternatives considered**:
- *`RESTRICT` + limpeza manual no use-case de delete de categoria*: acoplaria a feature 008 ao código da 007 e arriscaria divergência. Rejeitado — a semântica declarativa da FK é mais simples e segura.

---

## D7 — Forma da API: lote vs. granular

**Decision**: `GET /api/v1/budgets?month` (retrato agregado) + `PUT /api/v1/budgets?month` (**upsert em lote** transacional dos alvos presentes no corpo; `null` ou zero remove o alvo) + `POST /api/v1/budgets/copy`.

**Rationale**: A tela edita o mês inteiro; salvar em lote numa transação garante consistência e permite calcular os `warnings` autoritativos sobre o estado final. Um único GET agregado atende SC-003 (≤ 1 s) sem N requisições. O `PUT` faz upsert **apenas dos alvos enviados** (não apaga o que não veio), e remove explicitamente quando o valor é zero/`null` (FR-008) — o que também preserva edições concorrentes de alvos não tocados.

**Alternatives considered**:
- *PATCH por alvo (um endpoint por família/membro/categoria)*: multiplica endpoints e idas ao servidor; o cálculo de saldo/warnings precisaria de um GET extra a cada salvamento. Rejeitado (Princípio IV).
- *PUT que substitui o mês inteiro (replace)*: destrutivo, conflita com a cópia não-destrutiva e com edição concorrente. Rejeitado.

---

## D8 — FR-025 (perguntar ao criar despesa em mês sem orçamento): onde mora

**Decision**: **Orquestração de frontend**, sem mudança no backend de despesa. Após salvar uma despesa, o frontend verifica (via `GET /budgets?month` do mês da despesa) se o mês está sem orçamento; se estiver e o mês anterior tiver, abre `CopyPreviousMonthDialog`; ao confirmar, chama `POST /budgets/copy`.

**Rationale**: Mantém o contrato de despesa (feature 006) intocado (Princípio I — sem breaking change) e o acoplamento entre features fora do servidor. A pergunta é opt-in e nunca bloqueia o registro da despesa (FR-025). Reusa endpoints já definidos.

**Alternatives considered**:
- *Backend dispara/sinaliza a cópia na resposta de criação de despesa*: alteraria o contrato de despesa e misturaria responsabilidades de duas features. Rejeitado.

---

## D9 — Warnings consultivos (FR-009): cálculo e transporte

**Decision**: Calculados no servidor (no GET e no PUT) pelo `budget-resolver`, retornados no campo `warnings: [{ code, ... }]` da resposta — **nunca** como erro HTTP. Códigos:
- `category.allocation_exceeds_family`: soma das alocações resolvidas das raízes > orçamento da família, ou soma dos percentuais de raiz > 100.
- `subcategory.exceeds_root` (por raiz): soma das sub resolvidas > valor resolvido da raiz.

Membros **não** geram warning (FR-007: independência total; sem validação cruzada família × membros).

**Rationale**: Espelha o padrão `warnings` já introduzido na feature 007 (ex.: `category.removed_concurrently`). Aviso consultivo = dado na resposta + UI não-bloqueante; salvar sempre conclui (Princípio: alinhado à clarification Q3).

---

## D10 — Frontend: estado e padrões

**Decision**: Sem state global. `BudgetsPage` mantém o rascunho do mês em `useState`; cálculo de saldo/alocado é client-side em tempo real (espelhando a fórmula do `budget-resolver` para feedback imediato), com o servidor recalculando os warnings autoritativos no `PUT`. Hooks de mutação otimista por ação (`useSaveMonthBudget`, `useCopyPreviousMonth`), padrão idêntico aos hooks da feature 006/007.

**Rationale**: Consistência com o restante do app (Princípio IV); a rota `/orcamentos` e o item de menu já existem (feature 005) — só trocamos o placeholder.

**Alternatives considered**:
- *Introduzir Redux/Zustand*: nenhum precedente no projeto; over-engineering. Rejeitado.

---

## Resumo

Nenhum item pendente. Stack inalterada, zero novas dependências, uma migração aditiva, três endpoints novos, um módulo vertical por camada. Constitution Check permanece **PASS** após o design (Phase 1).
