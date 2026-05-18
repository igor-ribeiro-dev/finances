# Research: Autenticação de Usuários e Grupos Familiares

**Branch**: `004-user-auth-family-groups` | **Date**: 2026-05-17

---

## Decision 1: Estratégia de Token de Autenticação

**Decision**: Tokens opacos (strings aleatórias) armazenados no banco de dados como sessões, enviados ao cliente via cookie `httpOnly`.

**Rationale**: O spec define sessões com validade de 30 dias e renovação automática a cada uso — ambas as operações requerem estado persistido no servidor. Tokens opacos em DB permitem revogação imediata no logout e renovação simples (atualizar `expiresAt`). Evita a gestão de segredo JWT e o problema de revogação de JWTs stateless.

**Alternatives considered**:
- JWT stateless: simples de emitir, mas revogação no logout requer lista de blocklist ou TTL curto incompatível com 30 dias.
- JWT + refresh token: mais complexo (dois tokens, rotação), sem benefício claro para escala de um app familiar.

---

## Decision 2: Hashing de Senha

**Decision**: bcrypt com fator de custo 12.

**Rationale**: bcrypt é o padrão estabelecido para hashing de senhas em Node.js (biblioteca `bcrypt`). Fator 12 equilibra segurança (resistência a força bruta) e performance (tempo de hash ~250ms em hardware moderno).

**Alternatives considered**:
- Argon2id: mais moderno, mas fator de confiança menor no ecossistema Node.js atual.
- SHA-256 direto: inaceitável — sem fator de custo, trivialmente quebrável.

---

## Decision 3: Entrega de E-mail (Recuperação de Senha)

**Decision**: Nodemailer com SMTP configurável via variáveis de ambiente. Token de redefinição: string aleatória de 64 hex chars, armazenada no banco com TTL de 1 hora, invalidada após uso.

**Rationale**: Nodemailer é a biblioteca de e-mail padrão no ecossistema Node.js, sem dependência de serviços externos pagos. Configuração via env vars permite usar qualquer provedor SMTP (Gmail, SendGrid, Mailgun) sem alterar código. TTL de 1 hora é pratica padrão de segurança.

**Alternatives considered**:
- Resend / SendGrid SDK: dependência de fornecedor específico; desnecessário para a versão inicial.
- E-mail sem TTL: risco de segurança — links de reset devem expirar.

---

## Decision 4: Formato do Código de Convite

**Decision**: Código alfanumérico de 8 caracteres maiúsculos (ex.: `XKCD4723`), gerado com `crypto.randomBytes`. URL de convite: `/join/{codigo}`.

**Rationale**: 8 caracteres em base-36 oferecem ~1,6 trilhão de combinações — suficiente para um app familiar sem colisões práticas. Legível e digitável manualmente pelo usuário (alternativa ao link).

**Alternatives considered**:
- UUID completo: muito longo para digitar manualmente.
- 4 caracteres: ~1,6M combinações, suscetível a enumeração em grupos públicos.

---

## Decision 5: ORM e Migrações

**Decision**: Prisma 7 (versão instalada) como ORM com Prisma Migrate. Configuração via `backend/prisma.config.ts` com `datasource.url` e adaptador `@prisma/adapter-pg`. A URL do banco NÃO fica no `schema.prisma` (removida no Prisma 7); é lida de `.env` via `dotenv` no arquivo de config.

**Rationale**: Prisma 7 mudou a arquitetura de datasource: a URL de conexão saiu do `schema.prisma` e foi para `prisma.config.ts`, com suporte obrigatório a adaptador de driver. O `@prisma/adapter-pg` com `pg` é o adaptador padrão para PostgreSQL. O PrismaClient também é instanciado com o adaptador em `src/infra/prisma.ts`.

**Implementation note**: A migração foi executada com `cd backend && npx prisma migrate dev --name init_auth_family_groups`. O prefixo `cd backend &&` é necessário porque o `prisma.config.ts` usa `__dirname` para resolver o `.env` correto.

**Alternatives considered**:
- Prisma 5 (planejado originalmente): a versão instalada foi 7, que tem API incompatível com a abordagem de `url = env("DATABASE_URL")` no schema.
- Knex.js: query builder sem type-safety out-of-the-box.
- TypeORM: maduro mas com DX inferior ao Prisma em projetos TypeScript.
- SQL puro: sem type-safety, maior surface de bugs.

---

## Decision 6: Roteamento Frontend e Proteção de Rotas

**Decision**: React Router v6 com componente `ProtectedRoute` que verifica estado de autenticação e pertencimento a grupo. Usuários sem grupo são redirecionados para `/onboarding`; usuários não autenticados para `/login`.

**Rationale**: React Router v6 é o padrão atual para React SPAs. O padrão `ProtectedRoute` como wrapper é simples e testável independentemente. Dois níveis de proteção (`autenticado?` e `tem grupo?`) mapeiam diretamente para os requisitos FR-013 e FR-003.

**Alternatives considered**:
- Next.js com middleware de autenticação: overhead de SSR desnecessário para este app.
- Checagem manual em cada página: duplicação e risco de esquecimento.

---

## Decision 7: Gestão de Estado de Autenticação no Frontend

**Decision**: React Context (`AuthContext`) com estado derivado do endpoint `GET /auth/me`, chamado uma vez na inicialização do app.

**Rationale**: Contexto é suficiente para o escopo — não há compartilhamento de estado auth entre múltiplas árvores de componentes desconexas. Evita dependência de biblioteca de estado global (Zustand, Redux) para apenas um domínio.

**Alternatives considered**:
- Zustand: mais adequado quando o estado auth é consultado em muitos lugares isolados; overkill para este escopo.
- Props drilling: inviável — auth precisa estar disponível em toda a árvore.

---

## Decision 8: Passagem de userId entre Middleware e Handlers (Ajuste de Implementação)

**Decision**: `userId` é passado via `res.locals['userId']` (não via `req.userId` com augmentation de tipo do Express).

**Rationale**: A abordagem de augmentation de tipo (`declare module 'express-serve-static-core'`) interfere com os tipos do Express quando carregada como módulo ambíguo via ts-node, zerando métodos como `res.cookie()`, `res.status()` e `req.body`. Usar `res.locals` é type-safe sem precisar de declaração extra e é o padrão recomendado pelo Express para dados injetados por middleware.

**Alternatives considered**:
- `req.userId` com `declare global { namespace Express { ... } }`: bloqueado pelo ESLint (`@typescript-eslint/no-namespace`).
- `declare module 'express-serve-static-core'` sem import: shadow do módulo inteiro, removendo todos os tipos nativos.
- `(req as any).userId`: funcional mas perde type-safety.

---

## Decision 9: CORS (Ajuste de Implementação)

**Decision**: Pacote `cors` com `{ origin: FRONTEND_URL, credentials: true }` em vez de middleware CORS manual.

**Rationale**: O middleware manual com `res.setHeader()` gerou erros de tipo com o TypeScript strict quando os parâmetros do middleware foram explicitamente tipados como `Request`, `Response`, `NextFunction`. O pacote `cors` encapsula isso com tipos corretos e suporte a `credentials`.

**Alternatives considered**:
- Middleware manual: mais controle, mas conflito de tipos com Express strict no ts-jest.

---

## Decision 10: Carregamento de .env em Runtime (Ajuste de Implementação)

**Decision**: `dotenv` carregado explicitamente em `src/index.ts` com `config({ path: join(__dirname, '../.env') })` e em `prisma.config.ts` com path absoluto.

**Rationale**: O ts-node roda a partir da raiz do monorepo, não do diretório `backend/`. O carregamento padrão de `.env` procura no CWD, que é a raiz. O path absoluto baseado em `__dirname` garante que o `.env` correto do backend seja encontrado independente de onde o processo é iniciado.

**Alternatives considered**:
- Depender do dotenvx (que injeta vars automaticamente): funciona na CLI do prisma, mas não no ts-node sem configuração adicional.
- Passar `DATABASE_URL` diretamente na linha de comando: frágil e não reprodutível.

---

## Decision 11: Setup do Jest no Frontend (Ajuste de Implementação)

**Decision**: `@testing-library/jest-dom` importado diretamente em cada arquivo de teste (e.g., `import '@testing-library/jest-dom'`), em vez de via `setupFilesAfterFramework` no `jest.config.ts`.

**Rationale**: O nome correto da propriedade Jest para setup pós-framework não é reconhecido pelo tipo `Config` do Jest na versão instalada, causando erro de compilação. A importação direta no arquivo de teste é equivalente e funciona sem configuração especial. Também é necessário polyfill de `TextEncoder` para componentes que usam `react-router-dom` em ambiente jsdom.

**Alternatives considered**:
- `setupFilesAfterFramework`: propriedade inválida no tipo `Config` da versão Jest instalada.
- Arquivo de setup global via `globalSetup`: escopo diferente, não injeta matchers no contexto de teste.
