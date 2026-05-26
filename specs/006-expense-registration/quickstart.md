# Quickstart: Registro de Despesas

**Feature**: 006-expense-registration | **Para**: desenvolvedor que vai implementar ou validar a feature

Este documento traduz o `plan.md` num roteiro executável. Use-o como passo-a-passo de implementação na ordem TDD obrigatória pelo Constitution.

## Pré-requisitos

- [ ] Repositório clonado no branch `006-expense-registration`
- [ ] Postgres rodando (Docker do repo: `docker compose up -d` na raiz)
- [ ] `npm install` rodado na raiz (instala workspaces)
- [ ] Variáveis de ambiente em `backend/.env` e `frontend/.env` herdadas das features 001/004
- [ ] Migrations da feature 004 aplicadas (`cd backend && npx prisma migrate deploy`)
- [ ] App rodando local: `npm run dev --workspace=backend` + `npm run dev --workspace=frontend`
- [ ] Já existe pelo menos um grupo com 2+ membros no DB local (criado via fluxo da feature 004 ou seed manual)

## Roteiro de implementação (ordem TDD)

### Phase 1: Setup do schema e migration

1. **Adicionar `Expense`, `IdempotencyKey` e enum `PaymentMethod` ao `backend/prisma/schema.prisma`** conforme `data-model.md §2`.
2. **Gerar migration**: `cd backend && npx prisma migrate dev --name 006_expense_registration`
3. **Verificar SQL gerado** em `backend/prisma/migrations/<timestamp>_006_expense_registration/migration.sql`. Confirmar:
   - Enum `PaymentMethod` criado
   - Tabela `Expense` com FKs `RESTRICT` (não CASCADE)
   - Tabela `IdempotencyKey` com FK `CASCADE` para `User` e `Expense`
   - Índices `expense_group_date_id_idx`, `idempotency_user_idx`, `idempotency_created_at_idx`
4. **Regenerar Prisma Client**: `npx prisma generate`

### Phase 2: Backend — contracts → testes vermelhos → implementação

Ordem por endpoint, seguindo Constitution II (TDD). Para cada um:

1. Ler a seção correspondente em `contracts/openapi.yaml`.
2. Escrever teste em `backend/tests/api/expense/<endpoint>.contract.test.ts` (Jest + Supertest). Cobrir casos de sucesso, validação (cada campo com erro), autenticação ausente, cross-group (404), e os comportamentos específicos.
3. Rodar `npm test --workspace=backend` — todos novos testes DEVEM falhar.
4. Implementar:
   - `backend/src/api/expense/expense.validators.ts` (Zod) — se ainda não criado.
   - `backend/src/middleware/require-membership.middleware.ts` — se ainda não criado.
   - `backend/src/domain/expense/expense.repository.ts` — métodos Prisma.
   - `backend/src/application/expense/<use-case>.ts`.
   - `backend/src/api/expense/expense.router.ts` — registrar rota.
   - Atualizar `backend/src/app.ts` para montar o router em `/api/v1/expenses` (após `auth.middleware`).
5. Rodar `npm test --workspace=backend` — testes do endpoint passam.
6. Próximo endpoint.

**Ordem sugerida dos endpoints** (do mais isolado ao mais dependente):
1. `GET /api/v1/expenses/:id` (lê uma despesa — não tem efeitos colaterais)
2. `GET /api/v1/expenses` (lista — exige sementes, mas é só leitura)
3. `POST /api/v1/expenses` (cria — agrega a complexidade da idempotency)
4. `PATCH /api/v1/expenses/:id` (edita — depende do POST funcionar para criar fixtures)
5. `DELETE /api/v1/expenses/:id` (exclui)

**Cobertura mínima por endpoint**:

| Endpoint | Casos obrigatórios |
|----------|---------------------|
| `GET /:id` | 200 sucesso · 401 sem cookie · 404 não-existe · 404 cross-group (Despesa de outro grupo retorna 404 indistinguível) |
| `GET` (lista) | 200 vazia · 200 com 1 página completa · 200 com 2 páginas (verificar `nextCursor` estável) · 400 limit inválido · 401 |
| `POST` | 201 sucesso sem `Idempotency-Key` · 201 com chave nova · 200 replay com mesma chave do mesmo user · 409 chave alheia · 400 cada campo inválido (5 testes) · 400 `ownerMemberId` não-é-do-grupo · 401 · resposta inclui `updatedById === createdById === userId-da-sessão` |
| `PATCH` | 200 sucesso · 200 ignora `createdById`/`updatedById`/`id`/`groupId` enviados · 200 `updatedById` é sobrescrito com o `userId` da sessão atual (diferente de `createdById` quando outro membro edita) · 400 cada campo inválido · 400 `ownerMemberId` ex-membro · 404 cross-group · 404 não-existe |
| `DELETE` | 204 sucesso · 404 cross-group · 404 não-existe (frontend trata como sucesso) · 401 |

### Phase 3: Frontend — testes vermelhos → componentes/hooks

1. **Atualizar `frontend/src/config/navigation.ts`**: trocar `status: 'coming-soon'` por `status: 'active'` no item Despesas; setar `path: '/despesas'`.
2. **Adicionar rota** `/despesas` em `frontend/src/router/AppRouter.tsx` apontando para `<ExpensesPage />`.
3. Para cada componente/hook (ordem):
   - **`MoneyInput`** → `frontend/tests/unit/components/expense/MoneyInput.test.tsx` cobrindo: máscara estilo Nubank (digitar `12345` mostra `R$ 123,45`), backspace remove último dígito, valor exposto em centavos via `onChange`, ignora vírgula/ponto/letras, suporta `Esc` ou botão "limpar".
   - **`DeleteExpenseModal`** → testes: abre com título/corpo corretos, foco padrão em Cancelar, ESC fecha sem efeito, clique fora fecha, Confirmar dispara callback.
   - **`ExpenseFormModal`** → testes: validação inline por campo (mensagem embaixo do input quando backend retorna `fieldErrors`), envio com `Idempotency-Key` (mock do `expenseService` checa header), submit duplicado durante request pendente é bloqueado.
   - **`ExpenseListItem`** → testes: renderiza data formatada (`25/05/2026`), valor `R$ 123,45`, nome do responsável, indicador "ex-membro" quando aplicável.
   - **`ExpenseList`** → testes: estado vazio com CTA, infinite scroll dispara fetch da próxima página ao chegar perto do fim, skeleton no carregamento inicial.
   - **`useCreateExpense`** → testes: optimistic insert, rollback em 400 com `fieldErrors`, rollback em network error, gera `Idempotency-Key` único por submit, não regenera no retry da mesma submit.
   - **`useUpdateExpense`** → testes: optimistic update, rollback genérico em erro, callback `on404Concurrent` em 404 (sem rollback).
   - **`useDeleteExpense`** → testes: optimistic remove, 404 tratado como sucesso silencioso, rollback em outros erros.
4. Cada item: teste vermelho → implementação → teste verde → próximo.

### Phase 4: Integração end-to-end manual

Após backend e frontend completos:

1. Login com membro A → cria 2 despesas (uma pagamento dinheiro, outra crédito).
2. Login com membro B (mesmo grupo) → confirma que vê as duas; edita uma delas; exclui outra.
3. Login com membro A → confirma que viu a edição e a remoção.
4. Tentar acessar via URL `/api/v1/expenses/<id-de-outro-grupo>` (devtools) → 404.
5. Abrir modal de criar → preencher → submeter com rede offline (DevTools "Offline") → confirmar rollback otimista + toast de erro.
6. Em rede normal: dar duplo-clique no botão "Salvar" → confirmar que só uma despesa foi criada (Idempotency-Key dedupe).
7. Validações: tentar amount `0`, data futura, descrição vazia → inline errors aparecem.
8. Em valor `> R$ 1.000.000`: confirmar que aparece modal de confirmação extra (FR-011 client-side).

### Phase 5: Cleanup job

1. Criar `backend/scripts/cleanup-idempotency-keys.ts` que executa o `DELETE WHERE createdAt < NOW() - INTERVAL '24 hours'`.
2. Adicionar npm script `"cleanup:idempotency": "tsx scripts/cleanup-idempotency-keys.ts"` no `backend/package.json`.
3. Documentar agendamento sugerido (cron diário 03h) no `backend/README.md`.

## Definition of Done

- [ ] Todas as migrations aplicadas em dev sem erro
- [ ] `npm test --workspace=backend` 100% verde
- [ ] `npm test --workspace=frontend` 100% verde
- [ ] OpenAPI em `contracts/openapi.yaml` reflete a implementação
- [ ] Testes manuais do Phase 4 todos OK
- [ ] Tela `/despesas` acessível pelo menu lateral (item ativo, sem "em breve")
- [ ] PR contém entrada em CHANGELOG / commit messages seguem Conventional Commits

## Common pitfalls

- **Esquecer o `require-membership` middleware**: o `auth.middleware` só valida sessão, não grupo. Sem isso, um usuário sem grupo acessa endpoints e recebe 500.
- **PATCH parcial acidental**: se o frontend enviar `{ description: "novo" }` sem os outros campos, Zod rejeita com 400. Está correto — o frontend SEMPRE deve enviar full-body.
- **Cursor inconsistente após edit**: se uma despesa for editada e a `date` mudar, o cursor antigo ainda funciona (composto por `(date, id)`); o item editado pode pular para outra página, mas nenhum item desaparece nem duplica entre páginas.
- **`Idempotency-Key` reusada**: se o frontend reusar a chave após sucesso, a próxima criação verdadeira vai retornar 200 com a despesa antiga (e nada novo é criado). Garantir que o hook gere nova UUID a cada submit.
- **Money em float**: `parseFloat(formData.amount)` causaria erro de centavos. O `MoneyInput` deve expor `valueInCents: number` diretamente, sem string intermediária.
