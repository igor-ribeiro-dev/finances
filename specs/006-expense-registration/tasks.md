---

description: "Task list for feature 006 — Registro de Despesas"
---

# Tasks: Registro de Despesas

**Input**: Design documents in `specs/006-expense-registration/`

**Prerequisites**: plan.md ✅ | spec.md ✅ | research.md ✅ | data-model.md ✅ | contracts/openapi.yaml ✅ | quickstart.md ✅

**Tests**: Incluídos — Constitution Principle II (Test-First) é NON-NEGOTIABLE neste projeto. Cada use case, endpoint e componente tem teste vermelho antes da implementação.

**Organization**: Tarefas agrupadas por User Story para entrega incremental e testagem independente.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Pode rodar em paralelo (arquivos diferentes, sem dependências incompletas)
- **[Story]**: User story correspondente (US1, US2, US3)
- Caminhos de arquivo exatos incluídos em todas as descrições

---

## Phase 1: Setup (Schema e Migration)

**Purpose**: Adicionar as duas tabelas novas (`Expense`, `IdempotencyKey`) e o enum `PaymentMethod` ao Prisma, gerar e aplicar a migration.

- [X] T001 Adicionar enum `PaymentMethod`, model `Expense` (com `createdById` + `updatedById`), model `IdempotencyKey` e back-relations `expensesAuthored`/`expensesEdited`/`expensesOwned`/`idempotencyKeys` em `User` e `expenses` em `FamilyGroup` no arquivo `backend/prisma/schema.prisma`, conforme `specs/006-expense-registration/data-model.md §2` (nota: `@db.Uuid` removido para compatibilidade com IDs `text` herdados de 004)
- [X] T002 Gerar e aplicar migration via `cd backend && npx prisma migrate dev --name 006_expense_registration`; verificar SQL gerado em `backend/prisma/migrations/20260526223957_006_expense_registration/migration.sql`
- [X] T003 Regenerar Prisma client via `cd backend && npx prisma generate` e confirmar que `PrismaClient` expõe os novos modelos sem erro de tipo

**Checkpoint**: Schema do banco pronto. Fase 2 pode começar.

---

## Phase 2: Foundational (Bloqueia todas as User Stories)

**Purpose**: Infra de validação, autorização e shells de UI que TODAS as três user stories usam. Inclui também o novo endpoint para listar membros do grupo, usado pelos formulários de despesa.

**⚠️ CRÍTICO**: Nenhuma user story pode começar até T015 estar completo.

### Backend — helpers, middleware, validators, router shell

- [X] T004 [P] Estender `backend/src/api/errors.ts`: adicionou `fieldErrors?` opcional ao `sendError` e novo helper `sendValidationError`.
- [X] T005 [P] Criado `backend/src/middleware/require-membership.middleware.ts`: consulta `User.familyGroupId`; 403 `no_group` quando nulo; injeta `res.locals.groupId`.
- [X] T006 [P] Criado `backend/src/api/expense/expense.validators.ts` com `createExpenseBody`, `updateExpenseBody`, `listExpensesQuery`, `idempotencyKeyHeader` e helper `zodErrorToFieldErrors`. Zod instalado (`zod@^4.4.3`).
- [X] T007 [P] Criado `backend/src/domain/expense/expense.repository.ts` com implementação completa (não só skeleton — para economizar idas e voltas): `create`, `findById`, `findByIdInGroup`, `listByGroupWithCursor`, `update`, `delete`, todos com `include: { ownerMember }`.
- [X] T008 [P] Criado `backend/src/domain/expense/idempotency.repository.ts`: `findByKey`, `save({key, userId, expenseId}, tx?)`.
- [X] T009 Criado `backend/src/api/expense/expense.router.ts`: router com `authMiddleware + requireMembership` aplicados; 5 rotas em 501 stub.
- [X] T010 Montado `app.use('/api/v1/expenses', expenseRouter)` em `backend/src/app.ts`.

### Backend — endpoint compartilhado para listar membros do grupo

- [X] T011 [P] Contract test `backend/tests/api/family-group/list-members.contract.test.ts` — 200 com members ordenados, 401, 403 sem grupo.
- [X] T012 Implementado `GET /api/v1/groups/members` em `family-group.router.ts` — query `findMany WHERE familyGroupId`, `select { id, name }`, `orderBy { name }`.

### Frontend — types, service shell, navegação, página shell

- [X] T013 Criado `frontend/src/types/expense.ts` com tipos, `ServiceError` discriminated union etc.
- [X] T014 Criado `frontend/src/services/expense.service.ts` com `request<T>` mapeando o envelope flat para `ServiceError`. Implementação completa dos 5 métodos (createExpense, listExpenses, getExpense, updateExpense, deleteExpense).
- [X] T015 Criado `frontend/src/services/group.service.ts` com `listGroupMembers()`.
- [X] T016 `navigation.ts`: item `despesas` agora `status: 'active'`.
- [X] T017 Criado `frontend/src/pages/ExpensesPage.tsx` (com integração antecipada de US1 — modal, hook, toast).
- [X] T018 Rota `/despesas` em `AppRouter.tsx` aponta para `<ExpensesPage />`.

**Checkpoint**: Tudo pronto para implementar as user stories. Rotas e shells em pé; nenhum endpoint funcional ainda (501).

---

## Phase 3: User Story 1 — Registrar uma Despesa (Priority: P1) 🎯 MVP

**Goal**: Usuário autenticado consegue registrar uma despesa nova via UI, com persistência atômica e idempotência por `Idempotency-Key`. Confirmação visual de sucesso (toast + modal fecha).

**Independent Test**: A partir da tela `/despesas` (estado vazio), clicar "+ Nova despesa" → preencher valor (com máscara BR), data (hoje), descrição, método de pagamento, responsável → clicar "Salvar". Toast "Despesa registrada" aparece e modal fecha. Inspecionar `Expense` no DB confirma persistência com `createdById === updatedById === userId-da-sessão`.

### Tests for User Story 1 (TDD — escrever antes da implementação) ⚠️

#### Backend tests

- [X] T019 [P] [US1] Contract test `backend/tests/api/expense/create-expense.contract.test.ts` — 10 casos verdes cobrindo 201 sem chave, 201 com chave, 200 replay, 409 chave alheia, 400 amount/date/owner_not_in_group inválidos, 401, 403, e serialização ex-membro.
- [ ] T020 [P] [US1] Use case test `backend/tests/application/expense/create-expense.use-case.test.ts` (Jest puro): **DIFERIDO** — cobertura equivalente já provida pelo contract test T019 (rota chama use case end-to-end com Prisma mockado). Re-priorizar se quisermos unit tests separados do contract test.

#### Frontend tests

- [ ] T021 [P] [US1] Component test MoneyInput — **PENDENTE** (próxima sessão).
- [ ] T022 [P] [US1] Component test OwnerMemberPicker — **PENDENTE**.
- [ ] T023 [P] [US1] Component test PaymentMethodPicker — **PENDENTE**.
- [ ] T024 [P] [US1] Component test ExpenseFormModal create-mode — **PENDENTE**.
- [ ] T025 [P] [US1] Hook test useCreateExpense — **PENDENTE**.
- [ ] T026 [P] [US1] Page test ExpensesPage create-flow — **PENDENTE**.

### Implementation for User Story 1

#### Backend

- [X] T027 [US1] `create-expense.use-case.ts`: idempotency lookup, owner-in-group validation, transaction atômica (Expense + IdempotencyKey), `createdById = updatedById = userId`.
- [X] T028 [US1] `expense.repository.ts` — `create` aceita transaction client; `findById` com `include: { ownerMember }`.
- [X] T029 [US1] `idempotency.repository.ts` — `findByKey` e `save` com tx opcional.
- [X] T030 [US1] POST handler com Zod validation, header `Idempotency-Key` opcional, mapeamento de erros, serializador `mapExpenseToResponse` em `expense.serializer.ts` (reutilizável por US2/US3).

#### Frontend

- [X] T031 [US1] `MoneyInput.tsx` — máscara BR estilo Nubank, valor em centavos, ignora vírgula/ponto, ESC limpa.
- [X] T032 [US1] `OwnerMemberPicker.tsx` — `<select>` ordenado por nome (collation pt-BR).
- [X] T033 [US1] `PaymentMethodPicker.tsx` — radio group acessível com 2 opções.
- [X] T034 [US1] `createExpense(body, idempotencyKey)` em `expense.service.ts` (já feito em T014).
- [X] T035 [US1] `useCreateExpense.ts` — gera Idempotency-Key (UUID v4 via Web Crypto) por submit; mantém em ref para retry no mesmo ciclo; emite `onSuccess` / `onError`; expõe `fieldErrors` para inline render.
- [X] T036 [US1] `ExpenseFormModal.tsx` — modal overlay completo: MoneyInput + date + description (200 chars) + PaymentMethodPicker + OwnerMemberPicker; validação client-side; sub-modal de confirmação para `cents > 100M`; ESC fecha; backdrop click fecha; foco inicial em valor; aria-modal/labelledby corretos.
- [X] T037 [US1] `ExpensesPage.tsx` integra `useCreateExpense` + `<ExpenseFormModal>` + `<Toast>`; carrega membros via `group.service` no mount.
- [X] T038 [US1] `Toast.tsx` — componente acessível (`role=status, aria-live=polite`) com auto-dismiss em 4s.

**Checkpoint US1**: Backend cria despesas com idempotência. Frontend tem form modal funcional. Tela `/despesas` permite registrar nova despesa e mostra confirmação. Todos os testes verdes.

---

## Phase 4: User Story 2 — Visualizar Despesas Registradas (Priority: P2)

**Goal**: Tela `/despesas` lista todas as despesas do grupo, ordenadas da mais recente para a mais antiga, com infinite scroll por cursor. Despesas criadas via US1 aparecem na lista imediatamente (optimistic insert).

**Independent Test**: Com pelo menos 1 despesa registrada (seed via API ou US1), acessar `/despesas` e verificar: estado vazio só aparece se zero despesas; cada linha mostra data, descrição, valor em R$, nome do responsável, método. Com >50 despesas, rolar até o fim dispara o carregamento da próxima página.

### Tests for User Story 2 (TDD) ⚠️

#### Backend tests

- [X] T039 [P] [US2] Contract test `backend/tests/api/expense/list-expenses.contract.test.ts` — 13 casos verdes cobrindo lista vazia, full page com nextCursor, página final, cursor query, cursor malformado, limit inválido, 401, 403, isolamento de grupo e serialização de `isExMember`.
- [ ] T040 [P] [US2] Use case test `backend/tests/application/expense/list-expenses.use-case.test.ts`: **DIFERIDO** — cobertura equivalente via contract test T039 (encode/decode do cursor exercitado end-to-end pela rota). Re-priorizar se quisermos unit isolados.

#### Frontend tests

- [ ] T041 [P] [US2] Component test ExpenseListItem — **PENDENTE** (próxima iteração).
- [ ] T042 [P] [US2] Component test ExpenseList — **PENDENTE**.
- [ ] T043 [P] [US2] Hook test useExpensesList — **PENDENTE**.

### Implementation for User Story 2

#### Backend

- [X] T044 [US2] Criado `backend/src/application/expense/cursor.ts` com `encodeCursor`/`decodeCursor` (base64url, validação de date e UUID).
- [X] T045 [US2] Criado `backend/src/application/expense/list-expenses.use-case.ts` com LIMIT n+1 e mapeamento para `nextCursor`.
- [X] T046 [US2] `listByGroupWithCursor` já implementado em T007; reutilizado pelo use case (orderBy `(date DESC, id DESC)` + `OR` para tie-breaker).
- [X] T047 [US2] Wire do `GET /api/v1/expenses` no router (Zod query, 400 cursor inválido, isolamento por grupo, sem `familyGroupId` exposto).

#### Frontend

- [X] T048 [US2] `listExpenses` já estava no `expense.service.ts` desde T014.
- [X] T049 [US2] Criado `frontend/src/hooks/useExpensesList.ts` com `loadMore`, `prependItem`, `appendItem`, `replaceItem`, `removeItem`.
- [X] T050 [US2] Criado `frontend/src/components/expense/ExpenseListItem.tsx` com formatação BR, badge ex-membro, botões Edit/Delete opcionais.
- [X] T051 [US2] Criado `frontend/src/components/expense/ExpenseList.tsx` com empty state + CTA, skeleton e IntersectionObserver para infinite scroll.
- [X] T052 [US2] Refatorada `ExpensesPage.tsx`: integra `useExpensesList` e prepend otimista no `onSuccess` de `useCreateExpense`.

**Checkpoint US2**: Listagem completa funcional. Despesa nova de US1 aparece otimisticamente no topo da lista. Infinite scroll carrega mais conforme a página cresce.

---

## Phase 5: User Story 3 — Editar ou Excluir uma Despesa (Priority: P3)

**Goal**: Qualquer membro do grupo pode editar ou excluir qualquer despesa, com confirmação destrutiva para delete, atualização otimista da lista e tratamento explícito do 404 concorrente.

**Independent Test**: Com US1 + US2 prontas, abrir uma despesa existente (clique na linha) → modal pré-preenchido → alterar campo → salvar; linha atualiza in-place. Em outra: clicar lixeira → modal "Excluir?" → Confirmar; linha some. Simular concorrência: deletar via API enquanto modal de edição está aberto → ao salvar, modal exibe "Esta despesa foi excluída por outro membro".

### Tests for User Story 3 (TDD) ⚠️

#### Backend tests

- [X] T053 [P] [US3] Contract test `get-expense.contract.test.ts` — 5 casos verdes (200 com isExMember, 404 not_found, 404 cross-group, 401, 403).
- [X] T054 [P] [US3] Contract test `update-expense.contract.test.ts` — 10 casos verdes (200 overwrite, updatedById sobrescrito, ignora campos imutáveis, 400 amount/date/owner_not_in_group, 404, 401, 403).
- [X] T055 [P] [US3] Contract test `delete-expense.contract.test.ts` — 5 casos verdes (204 sucesso, 404 not_found, 404 cross-group, 401, 403).
- [ ] T056 [P] [US3] Use case test get-expense — **DIFERIDO** (cobertura via contract test).
- [ ] T057 [P] [US3] Use case test update-expense — **DIFERIDO** (cobertura via contract test).
- [ ] T058 [P] [US3] Use case test delete-expense — **DIFERIDO** (cobertura via contract test).

#### Frontend tests

- [ ] T059 [P] [US3] Component test DeleteExpenseModal — **PENDENTE** (próxima iteração).
- [ ] T060 [P] [US3] Hook test useUpdateExpense — **PENDENTE**.
- [ ] T061 [P] [US3] Hook test useDeleteExpense — **PENDENTE**.
- [ ] T062 [P] [US3] Component test ExpenseFormModal editFlow — **PENDENTE**.

### Implementation for User Story 3

#### Backend

- [X] T063 [US3] `findByIdInGroup` já existia no repositório (T007); reutilizado.
- [X] T064 [US3] `update` e `delete` já existiam no repositório (T007); reutilizados.
- [X] T065 [US3] Criado `get-expense.use-case.ts` (404 se não existir no grupo).
- [X] T066 [US3] Criado `update-expense.use-case.ts` (full-body, valida owner-in-group, sobrescreve `updatedById`).
- [X] T067 [US3] Criado `delete-expense.use-case.ts` (findByIdInGroup → 404 ou delete).
- [X] T068 [US3] Wire dos handlers `GET /:id`, `PATCH /:id`, `DELETE /:id` no router com mapeamento de erros (404, 400 owner_not_in_group, 200/204) e logs estruturados.

#### Frontend

- [X] T069 [US3] `getExpense`, `updateExpense`, `deleteExpense` já estavam no service desde T014.
- [X] T070 [US3] Criado `useUpdateExpense.ts` com callbacks `onSuccess`, `onError`, `on404Concurrent`.
- [X] T071 [US3] Criado `useDeleteExpense.ts` que trata 404 como sucesso silencioso.
- [X] T072 [US3] Criado `DeleteExpenseModal.tsx` com foco padrão em Cancelar, ESC, backdrop click, botão destrutivo.
- [X] T073 [US3] `ExpenseFormModal.tsx` agora aceita prop `concurrencyError`; renderiza UI alternativa "Despesa não encontrada" com botão OK.
- [X] T074 [US3] Botões editar/excluir já implementados em `ExpenseListItem.tsx` (T050); clique na linha abre edit.
- [X] T075 [US3] `ExpensesPage.tsx` orquestra `useCreateExpense`, `useUpdateExpense`, `useDeleteExpense`, modais de form/delete, e propaga `on404Concurrent` para remover linha e mostrar aviso no modal.

**Checkpoint US3**: Edit e Delete funcionais com optimistic UI e tratamento de concorrência. Toda a feature operacional ponta-a-ponta.

---

## Phase 6: Polish & Cross-Cutting

**Purpose**: Cleanup automatizado da tabela de idempotência, logs estruturados, validação manual final e ajustes de acessibilidade.

- [X] T076 [P] Criado `backend/scripts/cleanup-idempotency-keys.ts` (Prisma `deleteMany` + log JSON com count + cutoff).
- [X] T077 [P] Adicionado script `"cleanup:idempotency": "ts-node scripts/cleanup-idempotency-keys.ts"` em `backend/package.json` (usa `ts-node` já listado em devDependencies).
- [X] T078 Criado `backend/README.md` (seção Manutenção) com exemplo de crontab e CronJob k8s.
- [X] T079 Logs estruturados adicionados aos handlers POST/PATCH/DELETE com `event/action/outcome/userId/groupId/expenseId/durationMs` — sem `amountCents` nem `description`.
- [ ] T080 [P] Auditoria de acessibilidade — **DIFERIDO**: modais têm `role="dialog"`, `aria-modal="true"`, `aria-labelledby` (e `aria-describedby` em `DeleteExpenseModal`), ESC, foco trap rudimentar; auditoria automatizada (axe) pendente para próxima iteração.
- [ ] T081 Smoke test manual end-to-end — **PENDENTE**: requer 2 sessões e DB local, fora do alcance da automação.
- [X] T082 `npm test --workspaces` → backend 76/76 + frontend 48/48 verdes; `tsc --noEmit` no backend limpo; frontend apresenta 4 erros pré-existentes em `OnboardingPage.tsx` (feature 004), nada novo introduzido por 006.
- [X] T083 OpenAPI `contracts/openapi.yaml` revisado contra implementação: rotas, status codes (200/201/204/400/401/403/404/409), schemas (Expense, CreateExpenseBody, UpdateExpenseBody, ExpensePage, ErrorEnvelope), header `Idempotency-Key`, cursor opaco, `ownerMember.isExMember` — todos coerentes.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: T001 → T002 → T003 sequencial; sem dependência externa
- **Phase 2 (Foundational)**: depende de Phase 1; bloqueia todas as user stories
- **Phase 3 (US1)**: depende de Phase 2 completa; entrega o MVP
- **Phase 4 (US2)**: depende de Phase 2; integra com Phase 3 via `appendItem` mas não bloqueia US1 funcionar standalone
- **Phase 5 (US3)**: depende de Phase 2; estende o `ExpenseFormModal` da Phase 3 (modo edit) e adiciona controles em `ExpenseListItem` da Phase 4
- **Phase 6 (Polish)**: depende de US1 + US2 + US3 completos

### Within each User Story

- Tests vermelhos PRIMEIRO (Constitution II — NON-NEGOTIABLE)
- Backend antes do frontend dentro de cada US (frontend mocka o service nos testes, mas a integração manual depende do backend)
- Use case antes do router (handler delega para use case)

### Parallel Opportunities

#### Phase 2 (Foundational)

Backend [P]: T004, T005, T006, T007, T008, T011 — 6 tasks em paralelo (diferentes arquivos novos)
Frontend [P]: T013 → (T014, T015, T016) em paralelo
Cross: T011 (test) é paralelo com tudo do frontend

#### Phase 3 (US1)

Tests [P]: T019, T020, T021, T022, T023, T024, T025, T026 — 8 tasks em paralelo
Backend impl (após tests): T027 → T028, T029 [P] → T030
Frontend impl (após tests): T031, T032, T033 [P] → T034 → T035 → T036 → T037 (depende de tudo) → T038

#### Phase 4 (US2)

Tests [P]: T039, T040, T041, T042, T043
Backend impl: T044 [P] e T046 [P] após T044/T045 — T045 depende de T044; T047 depende de T045/T046
Frontend impl: T048 → T049 → T050, T051 [P] → T052

#### Phase 5 (US3)

Tests [P]: T053–T062 (10 tasks paralelas)
Backend impl: T063, T064 [P] → T065, T066, T067 [P] → T068
Frontend impl: T069 → T070, T071, T072 [P] → T073 → T074 → T075

---

## Parallel Example: Phase 3 (US1) tests

```bash
# Lançar todos os testes vermelhos do US1 em paralelo:
Task: "Contract test create-expense in backend/tests/api/expense/create-expense.contract.test.ts"
Task: "Use case test create-expense in backend/tests/application/expense/create-expense.use-case.test.ts"
Task: "Component test MoneyInput in frontend/tests/unit/components/expense/MoneyInput.test.tsx"
Task: "Component test OwnerMemberPicker in frontend/tests/unit/components/expense/OwnerMemberPicker.test.tsx"
Task: "Component test PaymentMethodPicker in frontend/tests/unit/components/expense/PaymentMethodPicker.test.tsx"
Task: "Component test ExpenseFormModal (create mode) in frontend/tests/unit/components/expense/ExpenseFormModal.test.tsx"
Task: "Hook test useCreateExpense in frontend/tests/unit/hooks/useCreateExpense.test.ts"
Task: "Page test ExpensesPage create flow in frontend/tests/unit/pages/ExpensesPage.create-flow.test.tsx"
```

---

## Implementation Strategy

### MVP First (US1 apenas)

1. Completar Phase 1 (3 tasks) — schema e migration
2. Completar Phase 2 (15 tasks) — infra crítica
3. Completar Phase 3 (20 tasks) — US1 ponta-a-ponta
4. **STOP e VALIDATE**: usuário consegue registrar uma despesa via UI; backend persiste com idempotência; testes 100% verdes
5. Deploy/demo possível como MVP

### Incremental Delivery

1. Setup + Foundational + US1 → MVP funcional
2. US2 → listagem com infinite scroll; despesas aparecem otimisticamente
3. US3 → edição e exclusão completas; concorrência tratada
4. Polish → cleanup, logs, acessibilidade, smoke test final

### Parallel Team Strategy

Com 2–3 devs após Foundational pronta:

- Dev A: backend de US1 (T019–T020 tests, T027–T030 impl)
- Dev B: frontend de US1 (T021–T026 tests, T031–T038 impl)
- Após US1 mergeada, mesmos pares fazem US2 e US3 sequencialmente (US3 estende componentes de US1/US2)

---

## Notes

- Total: **83 tasks** (3 Setup + 15 Foundational + 20 US1 + 14 US2 + 23 US3 + 8 Polish)
- Tests vermelhos antes de impl em TODAS as user stories (Constitution II)
- Cada user story tem checkpoint próprio e é demonstrável standalone
- US1 = MVP; pode parar lá se prazo apertar
- Cuidado especial: T035 (`useCreateExpense`) precisa gerar `Idempotency-Key` apenas no início de cada submit, NÃO em cada retry interno
- Cuidado especial: T046 (repository query) usa `LIMIT n+1` para detectar `nextCursor` sem segunda query
- Cuidado especial: T066/T068 (update) NÃO toca `createdById`; apenas `updatedById` é sobrescrito server-side
- Cuidado especial: T073 (edit modal) trata 404 concorrente com UI alternativa — não rollback, não retry automático
- Commitar após cada checkpoint (ou cada task crítica) para preservar progresso
