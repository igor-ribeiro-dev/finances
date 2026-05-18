# Quickstart: Autenticação de Usuários e Grupos Familiares

**Branch**: `004-user-auth-family-groups` | **Date**: 2026-05-17 | **Updated**: 2026-05-18

---

## Pré-requisitos

- Node.js 20 LTS
- PostgreSQL 15+ rodando localmente — recomendado via Docker (veja abaixo)
- Variáveis de ambiente configuradas (veja abaixo)

---

## PostgreSQL via Docker (forma mais rápida)

```bash
docker run -d \
  --name finances-db \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=finances_dev \
  -p 5432:5432 \
  postgres:15
```

Para verificar se está pronto: `docker exec finances-db pg_isready -U postgres`

Para reiniciar após reboot: `docker start finances-db`

---

## Variáveis de Ambiente

Copie `.env.example` para `.env` em `backend/`:

```bash
cp backend/.env.example backend/.env
```

O valor padrão de `DATABASE_URL` já funciona para o Docker acima. Para PostgreSQL local sem senha (Homebrew), ajuste para `postgresql://localhost:5432/finances_dev`.

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/finances_dev"
SESSION_COOKIE_DOMAIN=localhost
SMTP_HOST=smtp.exemplo.com
SMTP_PORT=587
SMTP_USER=noreply@exemplo.com
SMTP_PASS=sua_senha_smtp
FRONTEND_URL=http://localhost:5173
```

---

## Setup do Banco de Dados

```bash
# Instalar dependências
npm install

# Aplicar migração inicial (Prisma 7 — rodar a partir da raiz)
cd backend && npx prisma migrate dev --name init_auth_family_groups && cd ..

# (Opcional) Abrir Prisma Studio para inspecionar dados
cd backend && npx prisma studio
```

> **Nota Prisma 7**: A URL do banco não fica no `schema.prisma`. Ela é lida de `backend/.env` pelo `backend/prisma.config.ts`. O `cd backend &&` é necessário para que o `__dirname` resolva o `.env` correto.

---

## Rodar em Desenvolvimento

```bash
# Backend + Frontend juntos (recomendado)
npm run dev

# Apenas backend (porta 3001)
npm run dev --workspace=@finances/backend

# Apenas frontend (porta 5173, com proxy /api → localhost:3001)
npm run dev --workspace=@finances/frontend
```

---

## Rodar Testes

```bash
# Todos os testes (backend: 31 testes, frontend: 9 testes)
npm test

# Apenas backend
npm test --workspace=@finances/backend

# Apenas frontend
npm test --workspace=@finances/frontend
```

> Os testes de integração do backend usam mocks do Prisma — não precisam de banco de dados rodando.

---

## Fluxo Principal (Verificação Manual)

1. Abra `http://localhost:5173` → redirecionado para `/login`
2. Clique em **Criar conta** → preencha nome, e-mail e senha (mín. 8 chars, 1 número, 1 maiúscula)
3. Após cadastro → tela de **Onboarding** (criar ou entrar em grupo)
4. Clique em **Criar grupo** → informe um nome → código de 8 chars é exibido
5. Abra aba anônima → crie segunda conta → clique **Entrar com código** → informe o código
6. Ambas as contas devem ver o mesmo grupo

---

## Endpoints da API

Ver contrato completo em [`contracts/openapi.yaml`](contracts/openapi.yaml).

| Método | Endpoint | Descrição | Auth |
|--------|----------|-----------|------|
| POST | /api/v1/auth/register | Criar conta | Não |
| POST | /api/v1/auth/login | Fazer login | Não |
| POST | /api/v1/auth/logout | Fazer logout | Sim |
| GET | /api/v1/auth/me | Dados do usuário atual | Sim |
| POST | /api/v1/auth/forgot-password | Solicitar reset de senha | Não |
| POST | /api/v1/auth/reset-password | Redefinir senha com token | Não |
| POST | /api/v1/groups | Criar grupo familiar | Sim |
| POST | /api/v1/groups/join | Entrar via código de convite | Sim |
| POST | /api/v1/groups/invite/regenerate | Regenerar convite do grupo | Sim |
| DELETE | /api/v1/groups/members/me | Sair do grupo | Sim |

---

## Notas de Implementação

- **`res.locals['userId']`**: O `userId` é passado via `res.locals` pelo auth middleware (não `req.userId`) — augmentation de tipo do Express conflitava com ts-node.
- **CORS**: Usa o pacote `cors` (não middleware manual) para evitar erros de tipo TypeScript strict.
- **Prisma 7**: Requer `prisma.config.ts` com `datasource.url` e adaptador `@prisma/adapter-pg`. O schema.prisma não tem URL no datasource.
- **dotenv no ts-node**: `src/index.ts` carrega explicitamente `backend/.env` via `dotenv.config()` com path absoluto, pois ts-node roda a partir da raiz do monorepo.
- **`@testing-library/jest-dom`**: Importado diretamente em cada arquivo de teste frontend (não via `setupFilesAfterFramework` — propriedade inválida na versão Jest instalada).
- **`TextEncoder` polyfill**: Necessário em testes de componentes React que usam `react-router-dom` — adicionar `import { TextEncoder, TextDecoder } from 'util'; Object.assign(global, { TextEncoder, TextDecoder })` no topo do arquivo de teste.
