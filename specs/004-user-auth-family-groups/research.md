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

**Decision**: Prisma como ORM com Prisma Migrate para gerenciamento de schema.

**Rationale**: Prisma oferece type-safety nativo com TypeScript, CLI de migrações, e client gerado automaticamente a partir do schema — alinhado com a stack TypeScript do projeto. Prisma Migrate registra cada mudança de schema em arquivos versionados.

**Alternatives considered**:
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
