---

description: "Task list for feature 007 — Categorias de Despesas"
---

# Tasks: Categorias de Despesas

**Input**: Design documents in `specs/007-expense-categories/`

**Prerequisites**: plan.md ✅ | spec.md ✅ | research.md ✅ | data-model.md ✅ | contracts/openapi.yaml ✅ | quickstart.md ✅

**Tests**: Incluídos — Constitution Principle II (Test-First) é NON-NEGOTIABLE neste projeto. Cada use case, endpoint e componente tem teste vermelho antes da implementação. O plano de implementação (plan.md §Constitution Check, item II) reitera explicitamente: testes Jest+Supertest do contrato HTTP falhando → implementação até passar → testes RTL falhando → implementação.

**Organization**: Tarefas agrupadas por User Story para entrega incremental e testagem independente. US1 e US2 ambos P1 — entregues como um MVP de duas fatias (categorias só se tornam úteis quando aplicáveis às despesas). US3 é P2 (reorganização).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Pode rodar em paralelo (arquivos diferentes, sem dependências incompletas)
- **[Story]**: User story correspondente (US1, US2, US3)
- Caminhos de arquivo exatos incluídos em todas as descrições

---

## Phase 1: Setup (Schema + Migration)

**Purpose**: Adicionar o modelo `Category`, o campo `Expense.categoryId` e refatorar `IdempotencyKey` para o esquema polimórfico (`resourceType` + `resourceId`). Gerar a migration baseline via Prisma, editá-la manualmente para incluir o que Prisma não infere (collation ICU, coluna gerada `normalized_name`, dois índices únicos parciais), e aplicar.

- [ ] T001 Editar `backend/prisma/schema.prisma`: adicionar `enum ResourceType { EXPENSE, CATEGORY }`; adicionar `model Category` (id, groupId, name VarChar(60), parentId nullable, parent/children auto-rel `"CategoryHierarchy"`, expenses back-rel, createdAt/updatedAt, `@@index([groupId])`, `@@map("Category")`); adicionar campo `categoryId String? @map("category_id")` + relação `category Category? @relation(onDelete: Restrict)` em `model Expense` com `@@index([categoryId])`; refatorar `model IdempotencyKey`: renomear `expenseId String` → `resourceId String @map("resource_id")`, descartar `expense Expense @relation(…)`, adicionar `resourceType ResourceType @map("resource_type")`, adicionar `@@index([resourceType, resourceId])`. Conforme `data-model.md §Prisma schema delta`.

- [ ] T002 Gerar a migration baseline: `cd backend && npx prisma migrate dev --create-only --name 007_expense_categories`. Confirmar que cria `backend/prisma/migrations/<timestamp>_007_expense_categories/migration.sql` com o diff cru (CREATE TABLE Category sem generated col, indices padrão, ALTER TABLE Expense ADD column, ALTER TABLE IdempotencyKey rename + drop FK + ADD column resource_type).

- [ ] T003 Editar à mão `backend/prisma/migrations/<timestamp>_007_expense_categories/migration.sql` para incluir as DDLs declarativas que Prisma não infere, na ordem listada em `data-model.md §Migration script structure`: (1) `CREATE COLLATION "pt_BR_ci_as" (provider=icu, locale='pt-BR-u-ks-level2', deterministic=false)` envolvida em `DO $$ … END $$;` idempotente; (2) substituir a coluna `name` na CREATE TABLE Category por `name VARCHAR(60) NOT NULL` mais a linha `normalized_name text GENERATED ALWAYS AS (lower(regexp_replace(btrim(name), '\s+', ' ', 'g'))) STORED COLLATE "pt_BR_ci_as"`; (3) substituir qualquer `CREATE UNIQUE INDEX … ON "Category"` gerada pelo Prisma pelos dois índices parciais `category_root_unique (group_id, normalized_name) WHERE parent_id IS NULL` e `category_subcategory_unique (group_id, parent_id, normalized_name) WHERE parent_id IS NOT NULL`; (4) manter `category_group_idx` e adicionar `CREATE INDEX category_parent_idx ON "Category"(parent_id) WHERE parent_id IS NOT NULL`; (5) garantir que a FK `Expense_categoryId_fkey` usa `ON DELETE RESTRICT ON UPDATE CASCADE`; (6) garantir que a FK `Category_parentId_fkey` usa `ON DELETE RESTRICT`; (7) na refatoração de IdempotencyKey: `DROP CONSTRAINT IdempotencyKey_expenseId_fkey` (se a baseline não fez), `RENAME COLUMN expense_id TO resource_id`, `ADD COLUMN resource_type "ResourceType" NOT NULL DEFAULT 'EXPENSE'`, `ALTER COLUMN resource_type DROP DEFAULT`, recriar índices `idempotency_user_idx`, `idempotency_created_at_idx`, `idempotency_resource_idx`.

- [ ] T004 Aplicar a migration via `cd backend && npx prisma migrate dev` (sem flag — apenas executa pending). Verificar que o `psql` mostra: tabela `Category` com a coluna gerada (`\d "Category"` lista `normalized_name … generated always as … stored`), os dois índices parciais (`\d category_root_unique`, `\d category_subcategory_unique`), tabela `Expense` com nova coluna `category_id` e FK RESTRICT, tabela `IdempotencyKey` com `resource_id` e `resource_type`.

- [ ] T005 Regenerar Prisma client: `cd backend && npx prisma generate`. Confirmar que `PrismaClient` expõe `category` (model), `resourceType` em `IdempotencyKey`, e que TypeScript compila sem erros nos sites de uso atuais (`expense.use-case.ts` que usa `IdempotencyKey` — pode quebrar temporariamente; consertos em T009 da Phase 2).

**Checkpoint Phase 1**: Schema do banco e Prisma client prontos. Os tipos do Prisma podem ter quebrado o build do backend até T009 — esperado.

---

## Phase 2: Foundational (Bloqueia todas as User Stories)

**Purpose**: Infra de validação, autorização, repositórios, router shells e ajustes ao código existente afetado pelo refactor polimórfico da `IdempotencyKey`. Frontend ganha types, service shell, navegação ativa e página/rota shells.

**⚠️ CRÍTICO**: Nenhuma user story pode começar até T016 estar completo.

### Backend — helpers, validators, repositórios, router shell, idempotency refactor

- [ ] T006 [P] Estender `backend/src/api/errors.ts` para enumerar os novos códigos da feature: `category.duplicate_name`, `category.role_immutable`, `category.parent_invalid`, `category.parent_not_root`, `category.not_found`, `category.has_dependencies`. Exportar um helper `sendCategoryBlockerError(res, blockers)` que produz o envelope 409 com `{ code, message: <PT-BR>, blockers: { subCategoriesCount, affectedExpensesCount } }` conforme `contracts/openapi.yaml §ErrorEnvelope`.

- [ ] T007 [P] Criar `backend/src/api/category/category.validators.ts`: Zod schemas `createCategoryBody` (`name` 1–60 chars trim-non-empty, `parentId` UUID OR null), `updateCategoryBody` (mesmo shape — full-body PATCH), `idempotencyKeyHeader` (reutilizar do expense ou re-exportar), `categoryIdParam` (UUID v4). Exportar helper `zodErrorToFieldErrors` se ainda não existir em util compartilhado.

- [ ] T008 [P] Criar `backend/src/domain/category/category.repository.ts` com assinaturas: `create({ groupId, name, parentId }, tx?)`, `findByIdInGroup(id, groupId)`, `listByGroup(groupId)` (ORDER BY name collate `pt_BR_ci_as` ASC), `updateByIdInGroup(id, groupId, { name, parentId })`, `deleteByIdInGroup(id, groupId)`, `previewDelete(id, groupId)` → `{ subCategoriesCount, affectedExpensesCount }`, `isRootInGroup(id, groupId)` (validação de FR-011 parentId aponta para raiz). Implementação completa (não só skeleton) para reduzir vai-e-vem.

- [ ] T009 Refatorar `backend/src/domain/expense/idempotency.repository.ts` para o esquema polimórfico — assinatura nova: `findByKey(key, resourceType?: ResourceType)`, `save({ key, userId, resourceType, resourceId }, tx?)`. Atualizar TODOS os call-sites em `backend/src/application/expense/create-expense.use-case.ts` para passar `resourceType: 'EXPENSE'` no save e checar `resourceType === 'EXPENSE'` no findByKey. Códigos de erro 409 emitidos (conforme FR-016 do spec): `idempotency.conflict` quando a chave foi gravada por outro `userId`; `idempotency.cross_resource_conflict` quando o mesmo `userId` já usou essa chave para um `resourceType` diferente (ex.: chave EXPENSE reaproveitada em um POST de CATEGORY). Re-rodar `npm run build` para confirmar que o backend volta a compilar.

- [ ] T010 [P] Criar `backend/src/api/category/category.router.ts`: instanciar `express.Router()`; aplicar `authMiddleware` + `requireMembership` (este último injeta `res.locals.groupId` conforme já estabelecido pela feature 006); declarar 5 rotas (`POST /`, `GET /`, `GET /:id`, `PATCH /:id`, `DELETE /:id`, `GET /:id/delete-preview`) como handlers 501 stub que serão preenchidos nas user stories. Estrutura idêntica a `backend/src/api/expense/expense.router.ts`.

- [ ] T011 Montar `app.use('/api/v1/categories', categoryRouter)` em `backend/src/app.ts` logo após o `expenseRouter`. Adicionar um smoke test `backend/tests/api/category/router-mount.test.ts` que faz GET unauthenticated → espera 401, confirmando que o middleware está ativo.

### Frontend — types, service shell, navegação, página shell, rota

- [ ] T012 [P] Criar `frontend/src/types/category.ts` com `Category` (id, groupId, name, parentId, createdAt, updatedAt), `CategoryFormPayload` (name, parentId), `DeletePreview` (subCategoriesCount, affectedExpensesCount), `BlockerInfo` (mesmo shape), e a `ServiceError` discriminated union (`'validation' | 'duplicate_name' | 'role_immutable' | 'parent_not_root' | 'parent_invalid' | 'has_dependencies' | 'not_found' | 'idempotency_conflict' | 'idempotency_cross_resource_conflict' | 'unauthorized' | 'forbidden' | 'network'`) com `fieldErrors` em validation e `blockers` em has_dependencies. Os dois discriminantes de idempotência mapeiam exatamente para os códigos do backend definidos em FR-016 do spec.

- [ ] T013 [P] Criar `frontend/src/services/category.service.ts` com helper `request<T>` mapeando o envelope flat → `ServiceError` (analogo a `expense.service.ts`). Exportar funções stub: `createCategory(body, idempotencyKey)`, `listCategories()`, `getCategory(id)`, `updateCategory(id, body)`, `deleteCategory(id)`, `previewDeleteCategory(id)`. Implementação completa — chamarão os endpoints que ainda retornam 501 até as user stories preencherem.

- [ ] T014 [P] Atualizar `frontend/src/config/navigation.ts`: trocar `status: 'coming-soon'` por `status: 'active'` no item `categorias` (id `'categorias'`, path `'/categorias'`).

- [ ] T015 Criar `frontend/src/pages/CategoriesPage.tsx` (page shell que renderiza um placeholder "Carregando categorias…" e o esqueleto do botão "+ Nova categoria" — será integrado a hooks/componentes em US1).

- [ ] T016 Adicionar rota `/categorias` em `frontend/src/router/AppRouter.tsx` envolvida por `<ProtectedRoute>` apontando para `<CategoriesPage />`. Layout: dentro do `<AppShell>` (já existente da feature 005), idêntico ao padrão de `/despesas`.

**Checkpoint Phase 2**: Tudo pronto para implementar as user stories. Backend compila, todos os endpoints stub retornam 501. Frontend tem types/service/navegação/rota. Nenhum teste de produto verde ainda.

---

## Phase 3: User Story 1 — Criar a Árvore de Categorias da Família (Priority: P1) 🎯 MVP

**Goal**: Membros autenticados conseguem cadastrar categorias raiz e sub-categorias da família através da tela `/categorias`, com persistência atômica, idempotência por `Idempotency-Key` (FR-015) e refletindo a árvore em tempo real. Outros membros do grupo veem a mesma árvore.

**Independent Test**: Acessar `/categorias` (estado vazio) → ver CTA "criar primeira categoria" → clicar "+ Nova categoria" → preencher `Alimentação`, pai vazio (raiz) → salvar → linha aparece. Repetir com `Mercado` selecionando `Alimentação` como pai → aninhada. Recarregar a página → árvore intacta. Logar como outro membro do mesmo grupo → mesma árvore visível.

### Tests for User Story 1 (TDD — escrever antes da implementação) ⚠️

#### Backend tests

- [ ] T017 [P] [US1] Contract test `backend/tests/api/category/create-category.contract.test.ts` — casos: 201 criando raiz (parentId null), 201 criando sub (parentId válido), 200 replay com mesma Idempotency-Key + mesmo user + mesmo `resourceType=CATEGORY`, 409 `idempotency.conflict` (mesma key + outro user), 409 `idempotency.cross_resource_conflict` (mesma key + mesmo user + `resourceType=EXPENSE` previamente gravado), 422 `category.duplicate_name` em raiz duplicada, 422 mesmo nome em sub do mesmo pai, 422 `category.parent_not_root` (parentId é sub-categoria), 422 `category.parent_invalid` (parentId UUID inexistente), 422 `name` vazio/só-espaços/> 60 chars, 401 sem cookie, 403 sem grupo, 201 cross-group isolation (parentId de outro grupo → 422 parent_invalid pois não existe no escopo). Os códigos exatos dos dois 409 batem com FR-016 do spec.

- [ ] T018 [P] [US1] Use case test `backend/tests/application/category/create-category.use-case.test.ts` — casos: happy path raiz; happy path sub; chama `repository.isRootInGroup` antes de criar sub; rejeita com `parent_not_root` quando pai é sub-categoria; rejeita com `parent_invalid` quando pai não existe no grupo; idempotency replay retorna a categoria original sem novo `prisma.create`; catch de P2002 (Prisma unique violation, target inclui `normalized_name`) → joga `AppError('category.duplicate_name', 422)` com `fieldErrors[name]`; persiste IdempotencyKey com `resourceType: 'CATEGORY'`.

- [ ] T019 [P] [US1] Contract test `backend/tests/api/category/list-categories.contract.test.ts` — casos: 200 lista vazia (grupo sem categorias) `[]`; 200 com mix de raízes e subs, ordenada alfabeticamente pt-BR via collation (`Águas` vem antes de `Alimentação`, ambos antes de `Alvenaria`); 200 isolamento de grupo (categorias de outro grupo invisíveis); 401 sem cookie; 403 sem grupo.

- [ ] T020 [P] [US1] Use case test `backend/tests/application/category/list-categories.use-case.test.ts` — casos: `findMany` filtrado por `groupId`; ordering pt-BR aplicada via `orderBy: { name: 'asc' }` com collation; resposta inclui exatamente os campos `id, groupId, name, parentId, createdAt, updatedAt` (sem `normalizedName` vazado).

- [ ] T021 [P] [US1] Contract test `backend/tests/api/category/get-category.contract.test.ts` — casos: 200 com shape correto; 404 `category.not_found` para id inexistente; 404 (indistinguível) para id que pertence a outro grupo; 401; 403.

#### Frontend tests

- [ ] T022 [P] [US1] Component test `frontend/tests/unit/components/category/CategoriesPage.test.tsx` — casos: render skeleton enquanto carrega; empty state com CTA "Cadastre sua primeira categoria"; após dados carregados, renderiza `CategoryTree`; click no botão "+ Nova categoria" abre modal vazio com foco no input de nome; props passadas corretamente para `<CategoryFormModal>`.

- [ ] T023 [P] [US1] Component test `frontend/tests/unit/components/category/CategoryFormModal.test.tsx` (create mode) — casos: titulo "Nova categoria"; input de `name` autofocus; parent picker lista raízes existentes + opção "Criar como raiz" (sentinel `null`); validação inline para `name` vazio/> 60 chars (sem submit); submit chama `onSubmit({ name, parentId })`; ESC chama `onCancel`; backdrop click chama `onCancel`; durante `isSaving` botões desabilitam e ESC é ignorado; renderiza `fieldErrors` vindos da prop (para 422 duplicate_name inline embaixo do input).

- [ ] T024 [P] [US1] Component test `frontend/tests/unit/components/category/CategoryTree.test.tsx` — casos: renderiza raízes em ordem alfabética pt-BR; sub-categorias aninhadas sob a raiz correta em ordem alfabética; empty state com CTA quando array vazio; ignora itens com `parentId` órfão (defensivo — não deveria acontecer); cliques nos ícones de editar/excluir disparam handlers (handlers serão noop nesta fase, conectados em US3).

- [ ] T025 [P] [US1] Hook test `frontend/tests/unit/hooks/useCategoriesList.test.ts` — casos: load no mount via `category.service.listCategories`; expõe `categories`, `isLoading`, `error`; `insertOptimistic(c)` adiciona localmente; `removeOptimistic(id)` remove localmente; `replaceOptimistic(id, patch)` mescla; `refresh()` força refetch; ordering pt-BR aplicada localmente como backup; gera `Map<id, Category>` para lookup O(1) usado pelos pickers de US2.

- [ ] T026 [P] [US1] Hook test `frontend/tests/unit/hooks/useCreateCategory.test.ts` — casos: gera novo UUID v4 como `Idempotency-Key` por tentativa de submit (não reusar entre submits); mantém a key no retry da mesma submissão (ex.: ao receber 422 e reenviar); chama `category.service.createCategory(body, key)`; em sucesso chama `onSuccess(category)`; em 422 expõe `fieldErrors` para inline; em 409 idempotency-conflict joga toast `idempotency.conflict`; em erro de rede expõe `onError`.

### Implementation for User Story 1

#### Backend

- [ ] T027 [US1] Implementar `backend/src/application/category/create-category.use-case.ts`: assinatura `(input, deps) → Promise<Category>`; deps = `{ repo, idempotencyRepo, logger }`. Lógica: (1) se `idempotencyKey` presente, consulta `idempotencyRepo.findByKey(key, 'CATEGORY')` → replay (200) ou conflito (409 cross-resource ou other user); (2) se `parentId !== null`, valida `await repo.isRootInGroup(parentId, groupId)` — false → throw `AppError('category.parent_not_root', 422, fieldErrors[parentId])`; (3) abre transaction Prisma; (4) `repo.create({ groupId, name, parentId }, tx)` envolvido em try/catch — `error.code === 'P2002'` → throw `AppError('category.duplicate_name', 422, fieldErrors[name])`; (5) se idempotencyKey, `idempotencyRepo.save({ key, userId, resourceType: 'CATEGORY', resourceId: category.id }, tx)`; (6) commit; (7) log estruturado `{ action: 'category.create', userId, groupId, categoryId, parentId, outcome }`.

- [ ] T028 [US1] Implementar `backend/src/application/category/list-categories.use-case.ts`: chamada simples a `repo.listByGroup(groupId)`; nenhum mapping extra. Serializador pode ficar no router.

- [ ] T029 [US1] Implementar `backend/src/application/category/get-category.use-case.ts`: chama `repo.findByIdInGroup(id, groupId)` → null = throw `AppError('category.not_found', 404)`.

- [ ] T030 [US1] Wire dos handlers POST/GET/GET:id em `backend/src/api/category/category.router.ts`: usar `category.validators` para Zod parse; passar `res.locals.userId` e `res.locals.groupId` para o use case; mapear AppError → `sendError`; logar `action: 'category.<verb>'`. Criar `backend/src/api/category/category.serializer.ts` com `mapCategoryToResponse(category) → { id, groupId, name, parentId, createdAt: ISO, updatedAt: ISO }` reutilizável por US3.

#### Frontend

- [ ] T031 [US1] Implementar `frontend/src/components/category/CategoryRow.tsx`: renderiza nome + ícones placeholder de editar/excluir (Lucide `Pencil` / `Trash2`); handlers recebidos via props (noop em US1, integrados em US3); estilo Tailwind alinhado aos tokens da feature 005.

- [ ] T032 [US1] Implementar `frontend/src/components/category/CategoryTree.tsx`: recebe `categories: Category[]`; reconstrói árvore em `O(n)` via `Map<id, Category>` + agrupamento por `parentId`; renderiza grupo "Roots" em ordem alfabética (`Intl.Collator('pt-BR', { sensitivity: 'accent' })`); abaixo de cada raiz, sub-categorias indentadas e ordenadas; props `onEdit(category)`, `onDelete(category)` propagadas para `CategoryRow`; empty state com CTA "Cadastre sua primeira categoria" exibido quando array vazio.

- [ ] T033 [US1] Implementar `frontend/src/components/category/CategoryFormModal.tsx` (suporta create e edit; em US1 só create é exercitado): modal overlay seguindo padrão da feature 006 (`role="dialog" aria-modal="true" aria-labelledby="…"`); campos `name` (input texto, autoFocus, maxLength=60) + `parentId` (select com opções "Criar como raiz" + raízes do grupo); botões `Cancelar` (default focus em ESC + após submit) e `Salvar`; props: `mode: 'create' | 'edit'`, `initial: { name, parentId } | undefined`, `roots: Category[]`, `onSubmit({ name, parentId })`, `onCancel`, `isSaving`, `fieldErrors`. Renderiza `fieldErrors[name]` inline sob o input.

- [ ] T034 [US1] Implementar `frontend/src/hooks/useCategoriesList.ts`: estado interno `{ categories: Category[], isLoading: boolean, error: ServiceError | null }`; effect no mount chama `listCategories()`; helpers `insertOptimistic`, `removeOptimistic`, `replaceOptimistic`, `refresh`; expõe um `rootsById: Map<string, Category[]>` derivado (sub-categorias por raiz) e `byId: Map<string, Category>` para US2 (pickers do formulário de despesa) e US3 (delete preview e edit modal).

- [ ] T035 [US1] Implementar `frontend/src/hooks/useCreateCategory.ts`: gera UUID v4 (`crypto.randomUUID()`) por submit; mantém em ref para retry no mesmo ciclo (rotaciona em sucesso ou erro de rede); chama `category.service.createCategory(body, key)`; expõe `submit`, `isSaving`, `fieldErrors`, `onSuccess` (callback), `onError` (callback). Em 422 popula `fieldErrors`. Em 409 idempotency-conflict propaga ao `onError`.

- [ ] T036 [US1] Implementar `createCategory(body, idempotencyKey)`, `listCategories()`, `getCategory(id)` em `frontend/src/services/category.service.ts` (preencher os stubs de T013) — `fetch` com `credentials: 'include'`, `Content-Type: application/json`, header `Idempotency-Key` opcional; mapear envelope flat → `ServiceError`.

- [ ] T037 [US1] Refatorar `frontend/src/pages/CategoriesPage.tsx`: integra `useCategoriesList` + `<CategoryTree>` + estado local `{ isFormOpen, formMode, formInitial, fieldErrors }`; botão "+ Nova categoria" abre modal em create mode; `<CategoryFormModal>` recebe `roots` derivada do hook; ao salvar com sucesso chama `insertOptimistic(category)` + `Toast` sucesso + fecha modal. Em erro 422 popula `fieldErrors` e mantém modal aberto.

**Checkpoint US1**: Backend cria/lista/detalha categorias com idempotência polimórfica. Frontend renderiza árvore, abre modal, cria com optimistic UI. Todos os testes (T017–T026) verdes. Outros membros do mesmo grupo veem a mesma árvore após F5.

---

## Phase 4: User Story 2 — Classificar uma Despesa por Categoria (Priority: P1) 🎯 MVP

**Goal**: O formulário de despesa (modal da feature 006) ganha dois seletores opcionais (raiz + sub-categoria) que mapeiam para o único campo `categoryId` no payload (FR-008 single-column design). A listagem de despesa renderiza etiqueta `<raiz>` ou `<raiz> · <sub>`. Grupos sem categoria cadastrada veem hint discreto linkando para `/categorias` (FR-025).

**Independent Test**: Com pelo menos `Alimentação` + sub `Mercado` cadastrados em US1, abrir `/despesas` → "+ Nova despesa" → preencher campos + escolher `Alimentação` (sub vazio) → salvar. Linha mostra `Alimentação`. Editar essa despesa → escolher sub `Mercado` → salvar. Linha agora mostra `Alimentação · Mercado`. Resetar grupo (sem categorias) → modal mostra hint "Cadastre categorias em → Categorias" e submit funciona sem categoria.

### Tests for User Story 2 (TDD) ⚠️

#### Backend tests

- [ ] T038 [P] [US2] Atualizar `backend/tests/api/expense/create-expense.contract.test.ts`: adicionar casos — 201 com `categoryId: rootId` no body → resposta inclui `category: { id, name }` e `subCategory: null`; 201 com `categoryId: subId` → resposta inclui `category: <root>` e `subCategory: <sub>`; 201 com `categoryId: null` → ambos null; 422 com `categoryId: <UUID malformado>` (Zod); 201 com `categoryId` pertencente a outro grupo NÃO retorna 422 prévio mas dispara FR-018 path (P2003 retry) → 201 com `categoryId: null` final + `warnings: ["category.removed_concurrently"]` (cross-group fingerprint indistinguível de removido).

- [ ] T039 [P] [US2] Atualizar `backend/tests/api/expense/update-expense.contract.test.ts`: adicionar casos análogos — 200 mudando categoryId de null → root, root → sub, sub → null; resposta sempre denormalizada conforme FR-026 (Casos A/B/C); 200 ignorando categoryId apontando para deleted-during-edit → categoryId final null + warnings.

- [ ] T040 [P] [US2] Atualizar `backend/tests/api/expense/list-expenses.contract.test.ts`: criar seed com 3 despesas mistas (uma com category=root, uma com category=sub, uma sem); verificar que cada item da página retorna `category`/`subCategory` corretos (Casos A/B/C); ordering por (date DESC, id DESC) preservada; nextCursor estável.

- [ ] T041 [P] [US2] Atualizar `backend/tests/api/expense/get-expense.contract.test.ts`: adicionar caso 200 com categoryId apontando para sub → `category` = root resolvido, `subCategory` = sub referenciada.

- [ ] T042 [P] [US2] Criar `backend/tests/api/expense/concurrent-category-removal.contract.test.ts`: integration test — cria root; cria expense referenciando o root; deleta o root (passa porque expense ainda não foi commitada? ou seed sem expense); abre racing scenario simulado: cria expense passando categoryId que acabou de virar inválido (via prisma low-level deleting + immediate POST) → resposta 201 com `category: null` + `warnings: ["category.removed_concurrently"]`. Garantia: backend faz retry com `categoryId: null` automaticamente.

- [ ] T043 [P] [US2] Atualizar `backend/tests/application/expense/create-expense.use-case.test.ts`: adicionar casos — categoryId aceito no input; em sucesso passa para prisma.create; catch de P2003 (FK violation em `Expense_categoryId_fkey`) → retry com categoryId=null + adiciona `warnings: ['category.removed_concurrently']` no retorno; loga `outcome: 'category_removed_concurrently'`.

- [ ] T044 [P] [US2] Atualizar `backend/tests/application/expense/update-expense.use-case.test.ts`: análogo a T043.

- [ ] T045 [P] [US2] Atualizar `backend/tests/application/expense/list-expenses.use-case.test.ts`: testes do mapper (3 casos de FR-026): expense.category === null → ambos null; expense.category.parentId === null → category = expense.category, subCategory = null; expense.category.parentId !== null → subCategory = expense.category, category = expense.category.parent.

#### Frontend tests

- [ ] T046 [P] [US2] Atualizar `frontend/tests/unit/components/expense/ExpenseFormModal.test.tsx`: adicionar casos — renderiza `RootCategoryPicker` e `SubCategoryPicker` lado a lado; SubCategoryPicker disabled quando RootCategoryPicker é `(sem categoria)`; mudar root atualiza opções do sub picker (e reset de subValue); payload mapping: nada selecionado → `categoryId: null`, só root → `categoryId: root.id`, root+sub → `categoryId: sub.id` (NÃO subCategoryId); estado vazio FR-025 (`roots: []`) → ambos selects mostram só `(sem categoria)`, sub picker disabled, hint discreto "Cadastre categorias em → Categorias" linkando para `/categorias` aparece abaixo dos campos; **FR-023 (negative-space)**: dentro do modal aberto, asserir que NENHUM trigger de criação de categoria está presente (`expect(screen.queryByRole('button', { name: /nova categoria/i })).not.toBeInTheDocument()`, `expect(screen.queryByRole('link', { name: /^\\+ ?nova categoria$/i })).not.toBeInTheDocument()` — distinto do link "Categorias" do hint, que é navegação, não criação inline).

- [ ] T047 [P] [US2] Atualizar `frontend/tests/unit/components/expense/ExpenseListItem.test.tsx`: 3 casos novos — `category=null, subCategory=null` → não renderiza etiqueta; `category={name: 'Alimentação'}, subCategory=null` → etiqueta "Alimentação"; `category={name: 'Alimentação'}, subCategory={name: 'Mercado'}` → etiqueta "Alimentação · Mercado" (separador U+00B7 ou alternativa visual). Etiqueta NÃO desloca os 5 campos essenciais existentes.

- [ ] T048 [P] [US2] Atualizar `frontend/tests/unit/hooks/useCreateExpense.test.ts`: body POST agora inclui `categoryId` (null, root.id, sub.id conforme estado da UI); resposta inclui `category`/`subCategory` denormalizados; se resposta carrega `warnings: ['category.removed_concurrently']` o hook expõe `concurrentRemoval: true` para a página renderizar toast.

### Implementation for User Story 2

#### Backend

- [ ] T049 [US2] Atualizar `backend/src/api/expense/expense.validators.ts`: adicionar `categoryId: z.string().uuid().nullable()` em `createExpenseBody` e `updateExpenseBody` (campo obrigatório no body — UI sempre envia, null ou UUID).

- [ ] T050 [US2] Atualizar `backend/src/domain/expense/expense.repository.ts`: em `findById`, `findByIdInGroup` e `listByGroupWithCursor` adicionar `include: { ownerMember: true, category: { select: { id: true, name: true, parentId: true, parent: { select: { id: true, name: true } } } } }`. Garante uma única query SQL com LEFT JOIN duplo.

- [ ] T051 [US2] Criar `backend/src/api/expense/expense.serializer.ts` (ou estender o existente se já criado em 006): exportar `mapExpenseToResponse(expense, warnings?)` que produz o shape do contrato — para `category` resolve os 3 casos de FR-026: se `expense.category === null` → ambos null; se `expense.category.parentId === null` → category = `{ id, name }` do próprio; se `expense.category.parentId !== null` → subCategory = `{ id, name }` da própria, category = `{ id, name }` do `expense.category.parent`. Adicionar `warnings?: string[]` opcional no return quando presente.

- [ ] T052 [US2] Atualizar `backend/src/application/expense/create-expense.use-case.ts`: aceitar `categoryId` no input; passar para `repo.create`; envolver em try/catch — `error.code === 'P2003' && error.meta?.field_name === 'Expense_categoryId_fkey'` → re-executar `repo.create` com `categoryId: null` + acumular `warnings: ['category.removed_concurrently']`. Retornar expense + warnings.

- [ ] T053 [US2] Atualizar `backend/src/application/expense/update-expense.use-case.ts`: idêntico — categoryId no input, P2003 catch + retry com null + warnings. Continua respeitando FR-023 full-body.

- [ ] T054 [US2] Atualizar `backend/src/application/expense/list-expenses.use-case.ts` e `get-expense.use-case.ts`: nenhum mudança lógica direta — usam o repository atualizado em T050; passar resultado pelo serializer T051.

- [ ] T055 [US2] Atualizar handlers POST/PATCH/GET/GET:id em `backend/src/api/expense/expense.router.ts` para propagar `warnings` no response body quando aplicável; documentar no JSDoc do handler que `warnings` é opcional.

#### Frontend

- [ ] T056 [US2] Criar `frontend/src/components/expense/RootCategoryPicker.tsx`: select acessível (`<select>` semântico com label PT-BR "Categoria"); opções: `(sem categoria)` sentinel + raízes em ordem alfabética pt-BR; props `value: string | null`, `roots: Category[]`, `onChange(value: string | null)`, `disabled`.

- [ ] T057 [US2] Criar `frontend/src/components/expense/SubCategoryPicker.tsx`: select análogo; props `rootId: string | null`, `subs: Category[]` (sub-cats da raiz selecionada — derivado pelo pai), `value: string | null`, `onChange(value: string | null)`; quando `rootId === null` o select fica disabled e exibe só `(sem categoria)`.

- [ ] T058 [US2] Atualizar `frontend/src/components/expense/ExpenseFormModal.tsx`: importar `useCategoriesList` (do hook de US1) para puxar `byId` e `rootsById`; renderizar os dois pickers logo após o `OwnerMemberPicker`; estado interno mantém `selectedRootId: string | null` e `selectedSubId: string | null`; computar `categoryId` no submit: `selectedSubId ?? selectedRootId ?? null`; quando `roots.length === 0` exibir hint "Cadastre categorias em [Categorias]" com `<Link to="/categorias">` (FR-025); ao abrir em edit-mode, derivar `selectedRootId` e `selectedSubId` a partir de `expense.category` e `expense.subCategory` denormalizados.

- [ ] T059 [US2] Atualizar `frontend/src/hooks/useCreateExpense.ts` e `frontend/src/hooks/useUpdateExpense.ts`: tipos do body agora incluem `categoryId: string | null`; após sucesso, se resposta carrega `warnings.includes('category.removed_concurrently')` o hook chama um novo callback `onConcurrentCategoryRemoval()` (a página renderiza toast PT-BR).

- [ ] T060 [US2] Atualizar `frontend/src/components/expense/ExpenseListItem.tsx`: renderizar `<CategoryBadge category={item.category} subCategory={item.subCategory} />` ao lado dos 5 campos essenciais; criar `CategoryBadge.tsx` pequeno: renderiza nada quando ambos null, "Raiz" quando só category, "Raiz · Sub" quando ambos (separador U+00B7 + classe Tailwind discreta tipo `text-xs text-muted-foreground`).

- [ ] T061 [US2] Atualizar `frontend/src/services/expense.service.ts` types: `ExpenseResponse` agora inclui `category: { id, name } | null`, `subCategory: { id, name } | null`, `warnings?: string[]`; body de POST/PATCH agora inclui `categoryId: string | null`.

- [ ] T062 [US2] Atualizar `frontend/src/pages/ExpensesPage.tsx`: instanciar `useCategoriesList` no nível da página e propagar via prop para `ExpenseFormModal`; passar `onConcurrentCategoryRemoval={() => toast.info('A categoria selecionada foi removida; a despesa foi salva sem categoria.')}` para os hooks de mutation.

**Checkpoint US2 (= MVP completo)**: Backend retorna despesas denormalizadas com category/subCategory. Frontend mostra pickers no formulário, mapeia 2-seletor → 1-id no payload, exibe etiqueta na listagem, hint FR-025 quando grupo sem categorias, toast de removal concorrente. Todos os testes (T038–T048) verdes. **MVP entregável**: criar categoria → classificar despesa → ver etiqueta — fluxo completo.

---

## Phase 5: User Story 3 — Reorganizar Categorias Existentes (Priority: P2)

**Goal**: Membros do grupo podem renomear, mover (sub-categoria entre raízes) e excluir categorias. Renomear reflete imediatamente em todas as despesas que a referenciam (FR-019, via JOIN denormalizado da US2). Excluir respeita bloqueio simétrico FR-013: categoria sem dependências → modal destrutivo padrão → 204; com dependências → modal bloqueante com contadores + botão único OK → 409 do backend não chega a ser disparado (delete-preview consultado primeiro).

**Independent Test**: Com US1 e US2 prontas, abrir `/categorias` → clicar editar em uma categoria → renomear → linha atualiza + qualquer despesa que referencia atualiza etiqueta no próximo carregamento de `/despesas`. Mover sub entre raízes → linha aparece sob nova raiz. Tentar deletar categoria vazia → modal destrutivo padrão → 204 → linha some. Tentar deletar categoria com sub ou despesa → modal bloqueante (botão único OK) com contadores → nenhum DELETE disparado.

### Tests for User Story 3 (TDD) ⚠️

#### Backend tests

- [ ] T063 [P] [US3] Contract test `backend/tests/api/category/update-category.contract.test.ts`: 200 rename simples; 200 mover sub entre raízes (parentId muda para outra raiz válida); 200 ignora `id`/`groupId`/`createdAt` se enviados no body; 422 `category.role_immutable` ao tentar virar raiz em sub (parentId null em uma sub-cat); 422 `category.role_immutable` ao tentar virar sub em raiz (parentId não-null em uma raiz); 422 `category.parent_not_root` ao mover sub para um pai que é sub-categoria; 422 `category.parent_invalid` para parentId inexistente ou de outro grupo; 422 `category.duplicate_name` quando rename gera colisão no escopo; 404 cross-group; 401; 403.

- [ ] T064 [P] [US3] Use case test `backend/tests/application/category/update-category.use-case.test.ts`: cobre as 6 ramificações de validação (role check raiz↔sub, parent root same group, P2002 catch → duplicate_name); confirma que `repo.updateByIdInGroup` é chamado dentro de transação; log estruturado `{ action: 'category.update', userId, groupId, categoryId, fields_changed }`; **FR-024 LWW (negative-space)**: caso adicional — duas chamadas sequenciais ao mesmo `update-category.use-case` para o mesmo `categoryId` com `name` diferentes ambos completam sem erro; nenhuma checagem de versão / `If-Match` / `version` é feita; estado final é o do último write; o use case NUNCA joga `AppError` com código 409 para conflito de PATCH (asserir via `await expect(secondUpdate).resolves.toMatchObject({ name: 'segundoNome' })` e `await expect(secondUpdate).resolves.not.toThrow()`).

- [ ] T065 [P] [US3] Contract test `backend/tests/api/category/delete-category.contract.test.ts`: 204 deletando categoria sem subs nem despesas; 409 `category.has_dependencies` para raiz com sub-categorias → `blockers: { subCategoriesCount: N, affectedExpensesCount: 0 }`; 409 para sub-categoria com despesas → `blockers: { subCategoriesCount: 0, affectedExpensesCount: N }`; 409 para raiz com sub-categorias E despesas em sub → contagem soma despesas em qualquer nível da árvore; 404 cross-group; 404 não existente; 401; 403.

- [ ] T066 [P] [US3] Use case test `backend/tests/application/category/delete-category.use-case.test.ts`: happy path 204 (FK não viola); P2003 catch (FK RESTRICT) → re-executa as duas COUNT queries e retorna `AppError('category.has_dependencies', 409, blockers)`; verifica que NENHUMA DELETE atinge o banco no caso 409 (transação rollback).

- [ ] T067 [P] [US3] Contract test `backend/tests/api/category/preview-delete.contract.test.ts`: 200 para sub-categoria com 5 despesas → `{ subCategoriesCount: 0, affectedExpensesCount: 5 }`; 200 para raiz com 3 sub-cats e 12 despesas distribuídas → `{ subCategoriesCount: 3, affectedExpensesCount: 12 }`; 200 zero counts para categoria nova vazia; 404 cross-group; 404 não existente; 401; 403.

#### Frontend tests

- [ ] T068 [P] [US3] Component test `frontend/tests/unit/components/category/CategoryFormModal.test.tsx` (edit mode) — pré-preenche `name` e `parentId` a partir de `initial`; quando categoria é raiz, parent picker exibe `Criar como raiz` desabilitado (com texto auxiliar "Categorias raiz não podem virar sub-categorias"); quando categoria é sub, parent picker lista OUTRAS raízes do grupo (excluindo a própria raiz atual ainda como opção válida = mover não é obrigatório); submit chama `onSubmit({ name, parentId })`; titulo "Editar categoria".

- [ ] T069 [P] [US3] Component test `frontend/tests/unit/components/category/DeleteCategoryModal.test.tsx` (destructive variant) — quando `mode='destructive'`, título "Excluir esta categoria?", corpo "Esta ação não pode ser desfeita.", botões `Cancelar` (foco default) e `Excluir` (destacado vermelho); ESC fecha; backdrop click fecha; click "Excluir" chama `onConfirm`; durante `isDeleting` botões desabilitam.

- [ ] T070 [P] [US3] Component test `frontend/tests/unit/components/category/DeleteCategoryModal.test.tsx` (blocking variant) — quando `mode='blocking'`, título "Não é possível excluir esta categoria", corpo lista contagens — formato PT-BR: "Esta categoria ainda possui **3 sub-categorias** e **12 despesas vinculadas**. Reorganize esses registros antes de excluí-la."; botão único `OK` com foco default; sem botão Excluir; ESC e backdrop fecham; nenhum `onConfirm` é chamado.

- [ ] T071 [P] [US3] Hook test `frontend/tests/unit/hooks/useUpdateCategory.test.ts`: submit chama `category.service.updateCategory`; 200 dispara `onSuccess(updatedCategory)`; 422 expõe `fieldErrors`; em 422 `role_immutable` propaga código específico no `error`; optimistic update + rollback no caller via callbacks.

- [ ] T072 [P] [US3] Hook test `frontend/tests/unit/hooks/useDeleteCategory.test.ts`: 204 dispara `onSuccess(id)`; 409 expõe `blockers` no error e retorna sem chamar `onSuccess`; em network error chama `onError`.

- [ ] T073 [P] [US3] Hook test `frontend/tests/unit/hooks/useDeletePreview.test.ts`: chama `category.service.previewDeleteCategory(id)`; expõe `preview: DeletePreview | null`, `isLoading`, `error`; cache opcional em memória por categoryId (mesma chamada repetida não dispara novo GET dentro de 1s).

### Implementation for User Story 3

#### Backend

- [ ] T074 [US3] Implementar `backend/src/application/category/update-category.use-case.ts`: full-body PATCH; lookup com `repo.findByIdInGroup(id, groupId)` → 404 se null; validar role-invariance: se `categoryAtual.parentId === null && body.parentId !== null` → throw `role_immutable`; se `categoryAtual.parentId !== null && body.parentId === null` → throw `role_immutable`; se `body.parentId !== null`, validar `repo.isRootInGroup(body.parentId, groupId)` → false → `parent_not_root`; chamar `repo.updateByIdInGroup` envolto em try/catch para P2002 → `duplicate_name`. Log estruturado.

- [ ] T075 [US3] Implementar `backend/src/application/category/delete-category.use-case.ts`: lookup → 404; chama `repo.deleteByIdInGroup(id, groupId)` em try/catch — `error.code === 'P2003'` → chama `repo.previewDelete(id, groupId)` para obter contadores → throw `AppError('category.has_dependencies', 409, { blockers })`. Sucesso retorna 204. Log estruturado.

- [ ] T076 [US3] Implementar `backend/src/application/category/preview-delete-category.use-case.ts`: chama `repo.findByIdInGroup` → 404; chama `repo.previewDelete(id, groupId)` (já implementado em T008) → retorna `{ subCategoriesCount, affectedExpensesCount }`.

- [ ] T077 [US3] Wire dos handlers PATCH/DELETE/GET:id/delete-preview em `backend/src/api/category/category.router.ts`: usar `category.validators.updateCategoryBody`, mapping de AppError → `sendError` (409 has_dependencies usa o `sendCategoryBlockerError` helper de T006).

#### Frontend

- [ ] T078 [US3] Estender `frontend/src/components/category/CategoryFormModal.tsx` para suportar edit mode integralmente: prop `mode: 'create' | 'edit'`, prop `initial: { id, name, parentId } | undefined`; em edit, parent picker se comporta conforme T068 (root → disabled; sub → mostra outras raízes válidas). Botão "Salvar" chama `onSubmit({ name, parentId })`.

- [ ] T079 [US3] Implementar `frontend/src/components/category/DeleteCategoryModal.tsx`: dois modos via prop `mode: 'destructive' | 'blocking'`; em destructive renderiza modal padrão de FR-026 da feature 006 (Cancelar foco + Excluir vermelho); em blocking renderiza variante de FR-014 (botão único OK). Props compartilhadas: `categoryName`, `onClose`. Em blocking, props adicionais: `blockers: { subCategoriesCount, affectedExpensesCount }`.

- [ ] T080 [US3] Implementar `frontend/src/hooks/useUpdateCategory.ts`: análogo a `useUpdateExpense.ts` da feature 006; expõe `submit`, `isSaving`, `fieldErrors`, `onSuccess`, `onError`. Sem Idempotency-Key (PATCH é naturalmente idempotente; FR-024 LWW).

- [ ] T081 [US3] Implementar `frontend/src/hooks/useDeleteCategory.ts`: chama `category.service.deleteCategory(id)`; 204 dispara `onSuccess(id)`; 409 expõe `blockers` no callback `onBlocked(blockers)`; network error → `onError`.

- [ ] T082 [US3] Implementar `frontend/src/hooks/useDeletePreview.ts`: estado `{ preview, isLoading, error }`; `fetch(id)` faz GET; cache em memória por `id` com TTL 1s para evitar duplo-fetch quando o modal abre depois de hover.

- [ ] T083 [US3] Implementar `updateCategory(id, body)`, `deleteCategory(id)`, `previewDeleteCategory(id)` em `frontend/src/services/category.service.ts` (preencher stubs de T013).

- [ ] T084 [US3] Atualizar `frontend/src/pages/CategoriesPage.tsx` para orquestrar US3: `CategoryRow` agora recebe `onEdit` e `onDelete` funcionais; click em editar abre `CategoryFormModal` em edit mode pré-preenchida; click em excluir chama `useDeletePreview.fetch(id)` → quando preview chega, abre `DeleteCategoryModal` com `mode = (preview.subCategoriesCount > 0 || preview.affectedExpensesCount > 0) ? 'blocking' : 'destructive'`; confirm em destructive chama `useDeleteCategory.submit(id)` com optimistic remove + rollback em erro; 409 inesperado (race entre preview e delete) re-abre modal bloqueante atualizado.

- [ ] T085 [US3] Atualizar `frontend/src/components/expense/ExpenseListItem.tsx` — nenhuma mudança requerida; FR-019 garante que rename reflete via JOIN denormalizado no próximo carregamento da listagem. Test smoke: renomear `Alimentação` → `Comida` em `/categorias`, voltar a `/despesas`, recarregar → linhas mostram `Comida`.

**Checkpoint US3**: CRUD completo de categorias funcional. Rename reflete na listagem de despesas. Modal de exclusão escolhe variante destrutiva vs bloqueante baseado em delete-preview. FK RESTRICT no banco é a verdade última (testada em T065).

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Garantir lint, build, suíte completa de testes e validação manual end-to-end conforme `quickstart.md`.

- [ ] T086 [P] Lint backend: `cd backend && npm run lint`. Sem warnings (`--max-warnings 0`).

- [ ] T087 [P] Lint frontend: `cd frontend && npm run lint`. Sem warnings.

- [ ] T088 [P] Type-check backend: `cd backend && npm run build`. Sem erros.

- [ ] T089 [P] Type-check frontend: `cd frontend && npm run build`. Sem erros.

- [ ] T090 Suíte completa backend: `cd backend && npm test`. Todos os testes (incluindo testes pré-existentes da feature 006) verdes — confirma que o refactor da `IdempotencyKey` em T009 não quebrou nada da feature 006.

- [ ] T091 Suíte completa frontend: `cd frontend && npm test`. Todos os testes verdes.

- [ ] T092 Verificar cleanup script: `cd backend && npm run cleanup:idempotency` em ambiente dev com mix de `EXPENSE` e `CATEGORY` keys → confirma que purga ambos os tipos (TTL de 24h é agnóstico ao resourceType).

- [ ] T093 Smoke test manual em dev seguindo `specs/007-expense-categories/quickstart.md` §3 (passos 3.1 a 3.10). Tira screenshots dos 4 estados-chave: empty state de categorias, modal de criação com parent picker, modal bloqueante de delete, etiqueta de categoria na listagem de despesas. Anexar ao PR.

- [ ] T094 Verificar acessibilidade dos novos modais: rodar axe-core (ou inspeção manual via React DevTools + DevTools accessibility tree) em `CategoryFormModal` e `DeleteCategoryModal` (ambas variantes) — focus trap correto, ESC funcional, aria-modal/aria-labelledby presentes.

- [ ] T095 Atualizar PR description com checklist de FRs cobertas (espelhar tabela em `specs/007-expense-categories/quickstart.md §5`) e referência ao plano + clarification sessions.

- [ ] T096 [P] Benchmark automatizado SC-006 em `backend/tests/performance/list-categories.perf.test.ts`: seedar uma família com 50 categorias (10 raízes + 40 sub-categorias distribuídas, nomes PT-BR variados) via fixture Prisma direto na transação de setup; executar o `list-categories.use-case` 20 vezes consecutivas medindo `performance.now()` por chamada; asserir que (a) a média < 200 ms e (b) o p95 < 350 ms em ambiente de CI — proxy automatizado para o alvo end-to-end de 1 s de SC-006 (que inclui também o render React no client, coberto manualmente em T093). Pular o teste em ambiente sem `DATABASE_URL` para não quebrar dev local sem Postgres rodando (`describe.skip` condicional ou `it.skipIf`).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: Sem dependências; pode começar imediatamente.
- **Phase 2 (Foundational)**: Depende de Phase 1. Bloqueia US1/US2/US3.
- **Phase 3 (US1)**: Depende de Phase 2.
- **Phase 4 (US2)**: Depende de US1 (frontend reusa `useCategoriesList`; backend US2 modifica use-cases de expense que dependem da `IdempotencyKey` refatorada em T009).
- **Phase 5 (US3)**: Depende de US1 (reusa `CategoryFormModal` em edit mode e os repositórios). Pode rodar em paralelo com US2 se houver duas pessoas — não há acoplamento de arquivos entre US2 (expense) e US3 (category PATCH/DELETE).
- **Phase 6 (Polish)**: Depende de todas as user stories desejadas.

### User Story Dependencies

- **US1**: Independente; entrega árvore management standalone (criar/listar categorias).
- **US2**: Depende de US1 frontend (hook `useCategoriesList`); independente no backend (modifica só use-cases de expense).
- **US3**: Depende de US1 frontend (extensão do `CategoryFormModal` para edit mode). Independente de US2.

### Within Each User Story

- Testes [P] dentro de cada story podem rodar em paralelo (arquivos diferentes).
- Backend implementação antes de frontend implementação **dentro** da mesma story.
- Use-cases antes de routers; repositórios antes de use-cases.
- Componentes filhos antes de pais (pickers antes do modal; modal antes da página).

### Parallel Opportunities

- **Phase 1**: T001 (single file edit) → T002 → T003 → T004 → T005 — sequenciais por natureza.
- **Phase 2**: T006, T007, T008, T010 marcados [P] (arquivos diferentes); T009 sequencial (toca expense use-case existente); T011 depende de T010; T012, T013, T014 [P]; T015 depende de T013; T016 depende de T015.
- **US1 tests**: T017–T026 todos [P] entre si (arquivos diferentes).
- **US1 impl backend**: T027/T028/T029 [P] entre si; T030 depende dos três.
- **US1 impl frontend**: T031 [P] T032 [P] T033 [P] T036 [P]; T034/T035 dependem de T033; T037 depende de tudo.
- **US2 tests**: T038–T048 todos [P].
- **US2 impl**: T049/T050/T051 [P] backend; T052/T053 dependem de T051; T054/T055 dependem de T050+T051. Frontend: T056/T057 [P] (pickers diferentes); T058 depende dos dois pickers; T059/T060/T061 [P]; T062 depende de tudo.
- **US3 tests**: T063–T073 todos [P].
- **US3 impl backend**: T074/T076 [P]; T075 depende de T074 + repository de US1; T077 depende dos três.
- **US3 impl frontend**: T078 estende T033 (mesmo arquivo, sequencial); T079/T080/T081/T082/T083 [P] entre si; T084 depende de todos os anteriores.
- **Phase 6**: T086/T087/T088/T089/T090/T091/T096 [P]; T092/T093/T094/T095 podem ser sequenciais (executados pela mesma pessoa).

---

## Parallel Example: User Story 1 (Testes em paralelo)

```bash
# Lançar todos os testes vermelhos de US1 simultaneamente:
Task: "Contract test create-category em backend/tests/api/category/create-category.contract.test.ts"
Task: "Use case test create-category em backend/tests/application/category/create-category.use-case.test.ts"
Task: "Contract test list-categories em backend/tests/api/category/list-categories.contract.test.ts"
Task: "Use case test list-categories em backend/tests/application/category/list-categories.use-case.test.ts"
Task: "Contract test get-category em backend/tests/api/category/get-category.contract.test.ts"
Task: "Component test CategoriesPage em frontend/tests/unit/components/category/CategoriesPage.test.tsx"
Task: "Component test CategoryFormModal em frontend/tests/unit/components/category/CategoryFormModal.test.tsx"
Task: "Component test CategoryTree em frontend/tests/unit/components/category/CategoryTree.test.tsx"
Task: "Hook test useCategoriesList em frontend/tests/unit/hooks/useCategoriesList.test.ts"
Task: "Hook test useCreateCategory em frontend/tests/unit/hooks/useCreateCategory.test.ts"
```

---

## Implementation Strategy

### MVP First (US1 + US2)

US1 e US2 são ambos P1 e juntos formam o MVP funcional desta feature (criar a árvore e classificar despesas). Recomendação:

1. **Phase 1 + 2**: completar setup e foundational (T001–T016).
2. **Phase 3 US1**: completar criar/listar/get com testes verdes.
3. **STOP & VALIDATE**: rodar quickstart §3.1–3.2.
4. **Phase 4 US2**: estender expense form + listing + denormalização.
5. **STOP & VALIDATE**: rodar quickstart §3.3–3.5 + 3.9 + 3.10.
6. **Demo MVP**: usuário pode criar categorias e classificar despesas; renomear e excluir ainda não disponível.

### Incremental Delivery

1. Setup + Foundational → infra pronta (não deployável sozinho).
2. + US1 → categorias podem ser cadastradas (deployável; demo válida).
3. + US2 → categorias aplicáveis a despesas (MVP completo; deploy para usuários).
4. + US3 → reorganização (deploy de polish; reduz atrito a longo prazo).
5. + Polish → release candidate.

### Parallel Team Strategy

Com 2–3 devs após Foundational (T016):

- **Dev A**: Phase 3 US1 (front + back).
- **Dev B**: aguarda US1 backend → começa Phase 4 US2 backend (modifica expense use-cases) em paralelo com US1 frontend de A.
- **Dev C**: após US1 frontend de A → Phase 5 US3 (reaproveita modal).
- **Dev A** retoma Phase 4 US2 frontend assim que US1 frontend termina.
- Phase 6 polish: todos juntos, dividido por suíte de testes.

---

## Notes

- [P] = arquivos diferentes, sem dependência incompleta.
- [Story] = traceability para US1/US2/US3.
- Cada user story é independentemente testável conforme spec §User Scenarios.
- TDD obrigatório (Constitution II): testes vermelhos antes de implementação correspondente.
- Commit após cada task ou grupo lógico (configuração do extension hook `after_implement` cuidará disso quando rodarmos `/speckit-implement`).
- Stop em qualquer Checkpoint para validar a story independentemente (smoke test rápido via quickstart §3.x correspondente).
- Avoid: cross-story file conflicts. As únicas modificações em arquivo compartilhado entre stories são em `frontend/src/components/category/CategoryFormModal.tsx` (US1 cria; US3 estende edit mode) — gerenciar via rebase incremental, não conflito real.
