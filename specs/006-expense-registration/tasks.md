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

- [ ] T019 [P] [US1] Contract test `backend/tests/api/expense/create-expense.contract.test.ts` (Supertest): cobrir 201 sucesso sem `Idempotency-Key`, 201 com chave nova, 200 replay com mesma chave do mesmo usuário (mesma despesa retornada), 409 chave de outro usuário, 400 para cada campo inválido individual (`amountCents <= 0`, `date` no futuro, `date` formato inválido, `description` vazia/só whitespace, `description > 200`, `paymentMethod` inválido, `ownerMemberId` não-UUID), 400 com `field: 'ownerMemberId'` + `code: 'owner_not_in_group'` quando responsável é de outro grupo, 401 sem cookie de sessão, 403 sessão válida mas usuário sem grupo, resposta inclui `updatedById === createdById === userId-da-sessão`
- [ ] T020 [P] [US1] Use case test `backend/tests/application/expense/create-expense.use-case.test.ts` (Jest puro): testar validações de regra de negócio (owner pertence ao grupo), idempotency lookup (chave nova vs replay vs conflict), transação atômica `(insert Expense + insert IdempotencyKey)`, `createdById`/`updatedById` setados a partir do `userId` recebido (não do body)

#### Frontend tests

- [ ] T021 [P] [US1] Component test `frontend/tests/unit/components/expense/MoneyInput.test.tsx`: digitação `12345` resulta em valor exibido `R$ 123,45` e `onChange(12345)` (centavos); backspace remove último dígito (R$ 123,45 → R$ 12,34); ignora teclas `,` `.` `a` `-`; tecla `Esc` ou botão "limpar" zera; renderiza `R$ 0,00` quando valor é 0
- [ ] T022 [P] [US1] Component test `frontend/tests/unit/components/expense/OwnerMemberPicker.test.tsx`: monta com `members={[{id, name}]}` mockados (vindos do `group.service`); renderiza select/dropdown com nomes; `onChange(memberId)` dispara com id correto; default selecionado é o usuário atual quando provido
- [ ] T023 [P] [US1] Component test `frontend/tests/unit/components/expense/PaymentMethodPicker.test.tsx`: renderiza duas opções rotuladas "Dinheiro/Débito" e "Cartão de Crédito"; `onChange` retorna o constant correto (`CASH_OR_DEBIT`/`CREDIT_CARD`); valor controlado
- [ ] T024 [P] [US1] Component test `frontend/tests/unit/components/expense/ExpenseFormModal.test.tsx` (modo create): abre vazio; submit sem preencher dispara validações inline embaixo de cada input (mocking `useCreateExpense` para retornar `fieldErrors`); ESC fecha sem efeito; clique fora fecha sem efeito; submit válido chama `onSubmit({ amountCents, date, description, paymentMethod, ownerMemberId })`; valor > 100_000_000 abre sub-modal "Valor acima de R$ 1.000.000,00 — confirmar?" antes de chamar `onSubmit` (FR-011, lógica client-side conforme `research.md §9`)
- [ ] T025 [P] [US1] Hook test `frontend/tests/unit/hooks/useCreateExpense.test.ts`: gera `Idempotency-Key` (UUID v4) único por tentativa de submit (verifica via mock do `expenseService.createExpense`); reusa a mesma chave em retry interno do mesmo submit (não cria nova chave no rollback); aplica `onOptimistic` antes do fetch e `onSuccess` com dados do servidor; em erro `kind: 'validation'` chama `onRollback` + `onError(fieldErrors)`; em erro `kind: 'network'` chama `onRollback` + `onError`
- [ ] T026 [P] [US1] Page test `frontend/tests/unit/pages/ExpensesPage.create-flow.test.tsx`: na tela `/despesas` clicar "+ Nova despesa" abre `<ExpenseFormModal>`; preencher e submeter dispara `useCreateExpense`; em sucesso toast "Despesa registrada" aparece e modal fecha

### Implementation for User Story 1

#### Backend

- [ ] T027 [US1] Implementar `backend/src/application/expense/create-expense.use-case.ts`: assinatura `createExpense({ userId, groupId, idempotencyKey?, body })`; (1) se `idempotencyKey` presente, consulta `idempotencyRepository.findByKey`; se encontrado e `userId` bate → retorna `{ status: 'replay', expense: <existente> }`; se encontrado e `userId` diverge → lança `AppError('idempotency_key_conflict', ...)`; (2) valida regra `ownerMemberId` pertence ao `groupId` (consulta `prisma.user.findUnique({ where: { id, familyGroupId: groupId } })`); se não → `AppError('owner_not_in_group', ...)` com `field: 'ownerMemberId'`; (3) abre `prisma.$transaction([create Expense com createdById=userId e updatedById=userId, save IdempotencyKey se chave presente])`; (4) retorna `{ status: 'created', expense }`
- [ ] T028 [US1] Implementar `create` e `findById` em `backend/src/domain/expense/expense.repository.ts`: `create(tx, data)` aceita transaction client opcional; retorna a Expense criada com `include: { ownerMember: { select: { id: true, name: true, familyGroupId: true } } }` (necessário para o handler derivar `isExMember` ao serializar — ver T030/T047/T068); `findById(id)` idem `include`
- [ ] T029 [US1] Implementar `findByKey(key)` e `save({ key, userId, expenseId }, tx?)` em `backend/src/domain/expense/idempotency.repository.ts`
- [ ] T030 [US1] Wire handler do `POST /api/v1/expenses` em `backend/src/api/expense/expense.router.ts`: extrair `Idempotency-Key` do header (validar `z.string().uuid().optional()`), validar `req.body` com `createExpenseBody.safeParse`; em falha de validação → `sendValidationError(res, zodErrorToFieldErrors(error))`; chamar use case com `{ userId: res.locals.userId, groupId: res.locals.groupId, idempotencyKey, body }`; serializar a Expense de retorno para a forma do contrato (`ownerMember: { id, name, isExMember: ownerMember.familyGroupId !== groupId }`, sem expor `familyGroupId`) — extrair em helper `mapExpenseToResponse(expense, groupId)` reutilizável por T047 e T068; mapear status: `replay` → 200, `created` → 201, `AppError('idempotency_key_conflict')` → 409, `AppError('owner_not_in_group')` → 400 com `fieldErrors`; depende de T027/T028/T029 e T006/T009

#### Frontend

- [ ] T031 [US1] Implementar `frontend/src/components/expense/MoneyInput.tsx`: estado interno `cents: number`; `Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100)` para display; handlers `onKeyDown` conforme `research.md §7` (dígitos `0-9` empilham, backspace remove, esc limpa, ignora resto); props `{ value: number; onChange: (cents: number) => void; ariaLabel?: string }`
- [ ] T032 [US1] Implementar `frontend/src/components/expense/OwnerMemberPicker.tsx`: props `{ members: Array<{id, name}>; value: string; onChange: (id: string) => void; currentUserId?: string }`; renderiza `<select>` ou dropdown estilizado com Tailwind; ordena por nome (PT-BR collation)
- [ ] T033 [US1] Implementar `frontend/src/components/expense/PaymentMethodPicker.tsx`: props `{ value: PaymentMethod; onChange }`; renderiza dois `<button type="button">` ou radios (toggle) com labels "Dinheiro/Débito" e "Cartão de Crédito"; aplica estilo ativo do design system (cor primária teal-600 da feature 005)
- [ ] T034 [US1] Adicionar `createExpense(body, idempotencyKey: string): Promise<Expense>` em `frontend/src/services/expense.service.ts`: `request('/api/v1/expenses', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': idempotencyKey }, body: JSON.stringify(body) })`; converte 200 e 201 em sucesso; 4xx em `ServiceError` tipado
- [ ] T035 [US1] Implementar `frontend/src/hooks/useCreateExpense.ts`: hook custom que recebe callbacks `{ onOptimistic, onSuccess, onRollback, onError }`; retorna função `submit(body)` que: (1) gera `crypto.randomUUID()` para `Idempotency-Key` se não havia (armazena em ref durante o ciclo de submit), (2) `onOptimistic({ tempId, body })` adiciona row "fantasma" no estado da página, (3) chama `expenseService.createExpense`, (4) `onSuccess(real)` substitui tempId pelo real; em erro `onRollback() + onError(err)`
- [ ] T036 [US1] Implementar `frontend/src/components/expense/ExpenseFormModal.tsx`: props `{ open: boolean; onClose: () => void; onSubmit: (body) => Promise<void>; mode: 'create' | 'edit'; initial?: Expense; members: Member[]; currentUserId: string; isSaving: boolean; fieldErrors?: FieldError[] }`; layout overlay (fixed inset-0, glass do feature 005); usa `<MoneyInput>`, `<input type="date" max={today}>`, `<input type="text" maxLength=200>`, `<PaymentMethodPicker>`, `<OwnerMemberPicker>`; valida client-side antes de chamar `onSubmit`; sub-modal de confirmação para `cents > 100_000_000`; foco inicial no MoneyInput; ESC fecha; backdrop click fecha (somente se não `isSaving`)
- [ ] T037 [US1] Wire CTA "Nova despesa" e o modal em `frontend/src/pages/ExpensesPage.tsx`: estado `isCreateOpen`; chamar `group.service.listGroupMembers()` em mount via `useEffect` (cache em estado); chamar `useCreateExpense` com callbacks `onSuccess` exibindo toast "Despesa registrada" + fechando modal (US2 estenderá `onOptimistic` para inserir na lista); depende de T015/T017/T031/T032/T033/T034/T035/T036
- [ ] T038 [US1] Adicionar componente de Toast leve (se ainda não existe no design system da 005) em `frontend/src/components/Toast.tsx` ou usar implementação inline na page; renderizar mensagens de sucesso/erro com auto-dismiss em 4s

**Checkpoint US1**: Backend cria despesas com idempotência. Frontend tem form modal funcional. Tela `/despesas` permite registrar nova despesa e mostra confirmação. Todos os testes verdes.

---

## Phase 4: User Story 2 — Visualizar Despesas Registradas (Priority: P2)

**Goal**: Tela `/despesas` lista todas as despesas do grupo, ordenadas da mais recente para a mais antiga, com infinite scroll por cursor. Despesas criadas via US1 aparecem na lista imediatamente (optimistic insert).

**Independent Test**: Com pelo menos 1 despesa registrada (seed via API ou US1), acessar `/despesas` e verificar: estado vazio só aparece se zero despesas; cada linha mostra data, descrição, valor em R$, nome do responsável, método. Com >50 despesas, rolar até o fim dispara o carregamento da próxima página.

### Tests for User Story 2 (TDD) ⚠️

#### Backend tests

- [ ] T039 [P] [US2] Contract test `backend/tests/api/expense/list-expenses.contract.test.ts`: 200 lista vazia (`items: [], nextCursor: null`); 200 com 1 página completa (50 itens, `nextCursor` populado); 200 segunda página retorna os próximos 50 e `nextCursor: null` se acabou; cursor passado por query funciona; 400 `limit` inválido (`> 50`, `<= 0`, não-número); 400 cursor malformado; 401 sem cookie; 403 sem grupo; isolamento: usuário do grupo A não vê despesa do grupo B (criar despesas em dois grupos e verificar)
- [ ] T040 [P] [US2] Use case test `backend/tests/application/expense/list-expenses.use-case.test.ts`: encode/decode de cursor (`base64url({date, id})`); detecção de `nextCursor` via `LIMIT n+1`; ordenação `(date DESC, id DESC)` estável diante de mesma data; cursor sobrevive a insert no meio (não duplica nem perde item)

#### Frontend tests

- [ ] T041 [P] [US2] Component test `frontend/tests/unit/components/expense/ExpenseListItem.test.tsx`: renderiza data formatada em PT-BR (`25/05/2026`); valor formatado `R$ 123,45`; nome do responsável (`ownerMember.name`); label do método; indicador "ex-membro" (badge "ex-membro" ou itálico) quando `ownerMember.isExMember === true` (mockar Expense com a flag derivada conforme schema `Expense.ownerMember` no OpenAPI)
- [ ] T042 [P] [US2] Component test `frontend/tests/unit/components/expense/ExpenseList.test.tsx`: empty state com CTA "Registrar primeira despesa"; renderiza array de itens; `IntersectionObserver` mock chama `onLoadMore` quando sentinela aproxima do fim; skeleton placeholder visível enquanto `isInitialLoading`
- [ ] T043 [P] [US2] Hook test `frontend/tests/unit/hooks/useExpensesList.test.ts`: primeira página carrega no mount (mock `expenseService.listExpenses`); `loadMore()` busca próxima página usando `nextCursor` retornado; `appendItem(expense)` (chamado pelo `onOptimistic` do useCreateExpense) prepende ao array local sem refetch; `replaceItem(id, expense)` (chamado por `onSuccess`) troca tempId pelo real; cobre `removeItem(id)` para uso futuro

### Implementation for User Story 2

#### Backend

- [ ] T044 [US2] Criar `backend/src/application/expense/cursor.ts`: exporta `encodeCursor({ date: string; id: string }): string` (base64url) e `decodeCursor(token: string): { date: string; id: string } | null` (retorna null se malformado, com validação de formato `date` e `uuid`)
- [ ] T045 [US2] Implementar `backend/src/application/expense/list-expenses.use-case.ts`: assinatura `listExpenses({ groupId, limit, cursor? })`; se `cursor`, decode; chama `expenseRepository.listByGroupWithCursor(groupId, limit + 1, decoded)`; se retornou `limit + 1` itens, descarta o último e usa `encodeCursor(items[limit-1])` como `nextCursor`; caso contrário `nextCursor: null`
- [ ] T046 [US2] Implementar `listByGroupWithCursor(groupId, limit, cursor?)` em `backend/src/domain/expense/expense.repository.ts`: query Prisma com `where: { groupId, OR: cursor ? [{ date: { lt: cursor.date } }, { date: cursor.date, id: { lt: cursor.id } }] : undefined }`, `orderBy: [{ date: 'desc' }, { id: 'desc' }]`, `take: limit`, `include: { ownerMember: { select: { id: true, name: true, familyGroupId: true } } }` (familyGroupId usado apenas internamente para derivar `isExMember` na camada de serialização)
- [ ] T047 [US2] Wire handler do `GET /api/v1/expenses` em `backend/src/api/expense/expense.router.ts`: validar query com `listExpensesQuery.safeParse(req.query)`; chamar use case com `{ groupId: res.locals.groupId, limit, cursor }`; mapear cada Expense para a forma do contrato `Expense` (FR `ownerMember: { id, name, isExMember: ownerMember.familyGroupId !== expense.groupId }` — NÃO expor `familyGroupId` no JSON de resposta); retornar `{ items, nextCursor }` com status 200

#### Frontend

- [ ] T048 [US2] Adicionar `listExpenses({ limit?, cursor? }): Promise<ExpensePage>` em `frontend/src/services/expense.service.ts`
- [ ] T049 [US2] Implementar `frontend/src/hooks/useExpensesList.ts`: estado `{ items: Expense[]; nextCursor: string | null; isInitialLoading: bool; isLoadingMore: bool; error?: ServiceError }`; `useEffect` no mount carrega primeira página; `loadMore()`; exporta `appendItem`, `replaceItem`, `removeItem` para integração com hooks de mutação
- [ ] T050 [US2] Implementar `frontend/src/components/expense/ExpenseListItem.tsx`: props `{ expense: Expense; onEdit?: (e) => void; onDelete?: (e) => void }`; formatação de data via `new Intl.DateTimeFormat('pt-BR').format(new Date(date + 'T00:00:00'))`; valor via `Intl.NumberFormat`; indicador "ex-membro" quando `ownerMember.isExMember`
- [ ] T051 [US2] Implementar `frontend/src/components/expense/ExpenseList.tsx`: props `{ items; nextCursor; isInitialLoading; isLoadingMore; onLoadMore; onEdit?; onDelete? }`; empty state com CTA quando `items.length === 0 && !isInitialLoading`; `<SkeletonPlaceholder>` (componente da feature 005) durante carga inicial; `IntersectionObserver` numa sentinela `<div ref=...>` no fim para disparar `onLoadMore` quando entra em vista
- [ ] T052 [US2] Refatorar `frontend/src/pages/ExpensesPage.tsx`: substituir o estado vazio stub por `<ExpenseList ... />`; conectar `useExpensesList` (gerencia items); integrar callbacks: `useCreateExpense` ao confirmar `onSuccess` chama `appendItem` (ou `replaceItem` se tinha tempId); depende de T037/T049/T051

**Checkpoint US2**: Listagem completa funcional. Despesa nova de US1 aparece otimisticamente no topo da lista. Infinite scroll carrega mais conforme a página cresce.

---

## Phase 5: User Story 3 — Editar ou Excluir uma Despesa (Priority: P3)

**Goal**: Qualquer membro do grupo pode editar ou excluir qualquer despesa, com confirmação destrutiva para delete, atualização otimista da lista e tratamento explícito do 404 concorrente.

**Independent Test**: Com US1 + US2 prontas, abrir uma despesa existente (clique na linha) → modal pré-preenchido → alterar campo → salvar; linha atualiza in-place. Em outra: clicar lixeira → modal "Excluir?" → Confirmar; linha some. Simular concorrência: deletar via API enquanto modal de edição está aberto → ao salvar, modal exibe "Esta despesa foi excluída por outro membro".

### Tests for User Story 3 (TDD) ⚠️

#### Backend tests

- [ ] T053 [P] [US3] Contract test `backend/tests/api/expense/get-expense.contract.test.ts`: 200 sucesso (todos os campos do schema Expense, incluindo `updatedById`); 404 quando id não existe; 404 quando despesa pertence a outro grupo (indistinguível do anterior); 401 sem cookie; 403 sem grupo
- [ ] T054 [P] [US3] Contract test `backend/tests/api/expense/update-expense.contract.test.ts`: 200 sucesso atualiza todos os campos editáveis; `updatedById` na resposta = `userId` da sessão atual (diferente de `createdById` quando outro membro edita); 200 ignora silenciosamente `id`/`groupId`/`createdById`/`createdAt`/`updatedById`/`updatedAt` enviados no body; 400 para cada campo inválido; 400 `owner_not_in_group` quando ownerMemberId é ex-membro; 404 cross-group e não-existe; 401; 403
- [ ] T055 [P] [US3] Contract test `backend/tests/api/expense/delete-expense.contract.test.ts`: 204 sucesso; 404 cross-group; 404 não-existe (tratado como sucesso silencioso pelo frontend, mas backend retorna 404 honesto); 401; 403
- [ ] T056 [P] [US3] Use case test `backend/tests/application/expense/get-expense.use-case.test.ts`: `findByIdInGroup` retorna null para id de outro grupo → use case lança `AppError('not_found')`
- [ ] T057 [P] [US3] Use case test `backend/tests/application/expense/update-expense.use-case.test.ts`: full-body overwrite; `updatedById` setado de `res.locals.userId`; validação de `ownerMemberId` pertencer ao grupo no momento do update
- [ ] T058 [P] [US3] Use case test `backend/tests/application/expense/delete-expense.use-case.test.ts`: delete idempotente no banco (não erro se já deletado); cleanup cascata da `IdempotencyKey` referenciando

#### Frontend tests

- [ ] T059 [P] [US3] Component test `frontend/tests/unit/components/expense/DeleteExpenseModal.test.tsx`: abre com título "Excluir esta despesa?" e corpo "Esta ação não pode ser desfeita."; foco padrão em "Cancelar"; ESC fecha sem efeito; clique fora fecha; click em "Excluir" chama `onConfirm` e fecha
- [ ] T060 [P] [US3] Hook test `frontend/tests/unit/hooks/useUpdateExpense.test.ts`: aplica `onOptimistic` (substitui item no estado), em sucesso `onSuccess(serverExpense)` reconcilia; em erro de validação `onRollback(snapshot) + onError(fieldErrors)`; em 404 chama `on404Concurrent(id)` em vez de rollback (sem restaurar estado)
- [ ] T061 [P] [US3] Hook test `frontend/tests/unit/hooks/useDeleteExpense.test.ts`: aplica `onOptimistic` (remove item), 404 → trata como sucesso silencioso (sem toast, sem rollback); outros erros → rollback + toast
- [ ] T062 [P] [US3] Component test `frontend/tests/unit/components/expense/ExpenseFormModal.editFlow.test.tsx` (modo edit): props com `mode='edit'` e `initial=<Expense>` pré-preenche todos os inputs; submit chama `onSubmit` com novos valores; ao receber `kind: 'not_found'` (simulando 404) modal exibe "Esta despesa foi excluída por outro membro do grupo enquanto você editava. Não é possível salvar." com único botão "OK" que chama `onClose`

### Implementation for User Story 3

#### Backend

- [ ] T063 [US3] Implementar `findByIdInGroup(id, groupId)` em `backend/src/domain/expense/expense.repository.ts`: query `findFirst({ where: { id, groupId }, include: { ownerMember: { select: { id: true, name: true, familyGroupId: true } } } })` (mesma forma de T028/T046 para reuso do helper `mapExpenseToResponse`)
- [ ] T064 [US3] Implementar `update(id, data)` (sem `createdById`) e `delete(id)` em `expense.repository.ts`
- [ ] T065 [US3] Implementar `backend/src/application/expense/get-expense.use-case.ts`: chama `findByIdInGroup`; se null → lança `AppError('not_found', 'Despesa não encontrada.')`
- [ ] T066 [US3] Implementar `backend/src/application/expense/update-expense.use-case.ts`: assinatura `updateExpense({ userId, groupId, id, body })`; (1) `findByIdInGroup` (se null → AppError('not_found')); (2) valida `ownerMemberId ∈ grupo` como em create; (3) `expenseRepository.update(id, { ...body, updatedById: userId })` (NÃO modifica `createdById`); (4) retorna Expense atualizada
- [ ] T067 [US3] Implementar `backend/src/application/expense/delete-expense.use-case.ts`: `findByIdInGroup` para verificar existência e grupo; se null → AppError('not_found'); senão `expenseRepository.delete(id)`
- [ ] T068 [US3] Wire handlers `GET /:id`, `PATCH /:id`, `DELETE /:id` em `backend/src/api/expense/expense.router.ts`: validação Zod onde aplicável (PATCH body); GET/:id e PATCH retornam a Expense serializada via `mapExpenseToResponse(expense, groupId)` definido em T030 (com `ownerMember.isExMember` derivado); mapear `AppError('not_found')` → 404 envelope, `AppError('owner_not_in_group')` → 400 com fieldErrors; PATCH 200; DELETE 204 sem body

#### Frontend

- [ ] T069 [US3] Adicionar `getExpense(id): Promise<Expense>`, `updateExpense(id, body): Promise<Expense>`, `deleteExpense(id): Promise<void>` em `frontend/src/services/expense.service.ts`
- [ ] T070 [US3] Implementar `frontend/src/hooks/useUpdateExpense.ts`: callbacks `{ onOptimistic, onSuccess, onRollback, onError, on404Concurrent }`; em `ServiceError.kind === 'not_found'` chama `on404Concurrent(id)` em vez de `onRollback`
- [ ] T071 [US3] Implementar `frontend/src/hooks/useDeleteExpense.ts`: em `ServiceError.kind === 'not_found'` trata como sucesso silencioso (chama `onSuccess` direto, sem toast)
- [ ] T072 [US3] Implementar `frontend/src/components/expense/DeleteExpenseModal.tsx`: props `{ open: boolean; expense: Expense | null; onCancel: () => void; onConfirm: (id: string) => void; isDeleting: boolean }`; foco inicial em "Cancelar"; botão "Excluir" estilizado destrutivo (vermelho, contraste WCAG AA — herdar do design system de 005)
- [ ] T073 [US3] Estender `ExpenseFormModal.tsx`: suportar `mode='edit'` com pré-preenchimento de `initial`; adicionar estado interno `concurrencyError: boolean`; quando `on404Concurrent` é chamado pelo hook, exibir UI alternativa dentro do modal (texto + único botão OK que fecha)
- [ ] T074 [US3] Adicionar botões "Editar" (ícone Pencil) e "Excluir" (ícone Trash) em `ExpenseListItem.tsx`; props `onEdit` e `onDelete` propagam para a página; clique na linha (fora dos botões) também abre edit (atalho)
- [ ] T075 [US3] Integrar US3 em `ExpensesPage.tsx`: estados `editingExpense` e `deletingExpense`; ao clicar editar, abrir `<ExpenseFormModal mode='edit' initial={editingExpense}>`; ao clicar excluir, abrir `<DeleteExpenseModal expense={deletingExpense}>`; conectar `useUpdateExpense` e `useDeleteExpense` aos callbacks de `useExpensesList` (`replaceItem`, `removeItem`); em 404 de edit chama `removeItem(id)` após o usuário clicar OK no modal de concorrência

**Checkpoint US3**: Edit e Delete funcionais com optimistic UI e tratamento de concorrência. Toda a feature operacional ponta-a-ponta.

---

## Phase 6: Polish & Cross-Cutting

**Purpose**: Cleanup automatizado da tabela de idempotência, logs estruturados, validação manual final e ajustes de acessibilidade.

- [ ] T076 [P] Criar `backend/scripts/cleanup-idempotency-keys.ts`: script standalone que executa `DELETE FROM "IdempotencyKey" WHERE "createdAt" < NOW() - INTERVAL '24 hours'` via Prisma e loga a contagem de linhas removidas
- [ ] T077 [P] Adicionar script `"cleanup:idempotency": "tsx scripts/cleanup-idempotency-keys.ts"` em `backend/package.json`
- [ ] T078 Documentar agendamento sugerido (cron diário às 03:00) e variáveis de ambiente em `backend/README.md` (seção "Manutenção")
- [ ] T079 Adicionar logs estruturados nos handlers de `POST/PATCH/DELETE /api/v1/expenses`: campos `{ event, userId, groupId, expenseId, action, outcome, durationMs }` — sem `amountCents` nem `description` em texto claro (Constitution V)
- [ ] T080 [P] Auditoria de acessibilidade dos modais (`ExpenseFormModal`, `DeleteExpenseModal`, sub-modal de valor alto): foco trap, ESC, `aria-modal="true"`, `aria-labelledby`, `aria-describedby`, contraste do botão destrutivo ≥ 4.5:1; corrigir lacunas
- [ ] T081 Executar manualmente o roteiro de Phase 4 do `quickstart.md` (smoke test end-to-end com 2 membros do mesmo grupo): create, list, edit por outro membro, delete, 404 concorrente, valor alto, duplo-clique no salvar
- [ ] T082 Rodar `npm run test --workspaces` na raiz e garantir 100% verde; rodar `npm run typecheck` ou `tsc --noEmit` nos dois workspaces; rodar `npm run lint` se configurado
- [ ] T083 Confirmar `specs/006-expense-registration/contracts/openapi.yaml` reflete fielmente os endpoints implementados (revisão manual ou ferramenta `openapi-diff` se disponível); ajustar discrepâncias

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
