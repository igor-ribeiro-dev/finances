# Quickstart: Autenticação de Usuários e Grupos Familiares

**Branch**: `004-user-auth-family-groups` | **Date**: 2026-05-17

---

## Pré-requisitos

- Node.js 20 LTS
- PostgreSQL 15+ rodando localmente (ou via Docker)
- Variáveis de ambiente configuradas (veja abaixo)

---

## Variáveis de Ambiente

Copie `.env.example` para `.env` em `backend/`:

```bash
cp backend/.env.example backend/.env
```

Adicione/confirme as seguintes variáveis:

```env
# Banco de dados
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/finances_dev"

# Sessões
SESSION_COOKIE_DOMAIN=localhost

# E-mail (recuperação de senha)
SMTP_HOST=smtp.exemplo.com
SMTP_PORT=587
SMTP_USER=noreply@exemplo.com
SMTP_PASS=sua_senha_smtp

# URL do frontend (usada no link de convite e reset de senha)
FRONTEND_URL=http://localhost:5173
```

---

## Setup do Banco de Dados

```bash
# Instalar dependências
npm install

# Gerar client Prisma e aplicar migrações
npm run db:migrate -w backend

# (Opcional) Abrir Prisma Studio para inspecionar dados
npm run db:studio -w backend
```

---

## Rodar em Desenvolvimento

```bash
# Backend + Frontend juntos
npm run dev

# Apenas backend
npm run dev -w backend   # http://localhost:3000

# Apenas frontend
npm run dev -w frontend  # http://localhost:5173
```

---

## Rodar Testes

```bash
# Todos os testes
npm test

# Apenas backend (requer banco de dados disponível para testes de integração)
npm test -w backend

# Apenas frontend
npm test -w frontend
```

---

## Fluxo Principal (Verificação Manual)

1. Abra `http://localhost:5173`
2. Clique em **Criar conta** → preencha nome, e-mail e senha (mín. 8 chars, 1 número, 1 maiúscula)
3. Após cadastro, você é redirecionado para a tela de **Onboarding**
4. Clique em **Criar grupo** → informe um nome → um código de convite é exibido
5. Abra uma aba anônima → crie uma segunda conta → clique em **Entrar com código** → informe o código
6. A segunda conta deve ter acesso ao mesmo grupo

---

## Endpoints da API

Ver contrato completo em [`contracts/openapi.yaml`](contracts/openapi.yaml).

Resumo:

| Método | Endpoint                    | Descrição                        | Auth |
|--------|-----------------------------|----------------------------------|------|
| POST   | /api/v1/auth/register       | Criar conta                      | Não  |
| POST   | /api/v1/auth/login          | Fazer login                      | Não  |
| POST   | /api/v1/auth/logout         | Fazer logout                     | Sim  |
| GET    | /api/v1/auth/me             | Obter dados do usuário atual     | Sim  |
| POST   | /api/v1/auth/forgot-password| Solicitar reset de senha         | Não  |
| POST   | /api/v1/auth/reset-password | Redefinir senha com token        | Não  |
| POST   | /api/v1/groups              | Criar grupo familiar             | Sim  |
| POST   | /api/v1/groups/join         | Entrar via código de convite     | Sim  |
| POST   | /api/v1/groups/invite/regenerate | Regenerar convite do grupo  | Sim  |
| DELETE | /api/v1/groups/members/me   | Sair do grupo                    | Sim  |
