# Data Model: Autenticação de Usuários e Grupos Familiares

**Branch**: `004-user-auth-family-groups` | **Date**: 2026-05-17

---

## Entidades

### User

Representa um usuário cadastrado no sistema.

| Campo         | Tipo          | Constraints                          | Notas                                      |
|---------------|---------------|--------------------------------------|--------------------------------------------|
| id            | UUID          | PK, generated                        |                                            |
| name          | VARCHAR(100)  | NOT NULL                             | Nome de exibição                           |
| email         | VARCHAR(255)  | NOT NULL, UNIQUE                     | Usado para login e recuperação de senha    |
| passwordHash  | VARCHAR(255)  | NOT NULL                             | bcrypt, custo 12                           |
| familyGroupId | UUID          | FK → FamilyGroup.id, NULL            | NULL = não pertence a nenhum grupo ainda   |
| createdAt     | TIMESTAMPTZ   | NOT NULL, default now()              |                                            |
| updatedAt     | TIMESTAMPTZ   | NOT NULL, default now()              |                                            |

**Regras**:
- `email` é normalizado para lowercase antes de salvar e comparar.
- `familyGroupId` pode ser NULL; quando definido, o usuário está em exatamente um grupo.
- Ao sair do grupo (`DELETE /groups/members/me`), `familyGroupId` é setado para NULL.

---

### FamilyGroup

Representa um grupo familiar (domicílio).

| Campo     | Tipo         | Constraints             | Notas                              |
|-----------|--------------|-------------------------|------------------------------------|
| id        | UUID         | PK, generated           |                                    |
| name      | VARCHAR(100) | NOT NULL                | Nome escolhido pelo criador        |
| createdAt | TIMESTAMPTZ  | NOT NULL, default now() |                                    |
| updatedAt | TIMESTAMPTZ  | NOT NULL, default now() |                                    |

**Regras**:
- Um grupo persiste mesmo que todos os membros saiam (dados históricos preservados).
- Não há campo "owner" — todos os membros têm permissões iguais.

---

### Invite

Representa o convite ativo de um grupo familiar.

| Campo         | Tipo        | Constraints                    | Notas                                              |
|---------------|-------------|--------------------------------|----------------------------------------------------|
| id            | UUID        | PK, generated                  |                                                    |
| familyGroupId | UUID        | NOT NULL, FK → FamilyGroup.id  | Um grupo tem no máximo 1 convite ativo             |
| code          | VARCHAR(8)  | NOT NULL, UNIQUE               | 8 chars alfanuméricos maiúsculos, ex: `XKCD4723`   |
| expiresAt     | TIMESTAMPTZ | NOT NULL                       | `createdAt + 7 days`                               |
| createdAt     | TIMESTAMPTZ | NOT NULL, default now()        |                                                    |

**Regras**:
- Ao regenerar um convite, o registro anterior é deletado e um novo é inserido.
- Um convite expirado (`expiresAt < now()`) é tratado como inválido, independente de existir no banco.
- Constraint UNIQUE em `familyGroupId` garantida via índice único: `idx_invite_family_group_id`.

---

### Session

Representa uma sessão de autenticação ativa.

| Campo     | Tipo        | Constraints                  | Notas                                            |
|-----------|-------------|------------------------------|--------------------------------------------------|
| id        | UUID        | PK, generated                | Também é o token enviado ao cliente via cookie   |
| userId    | UUID        | NOT NULL, FK → User.id       |                                                  |
| expiresAt | TIMESTAMPTZ | NOT NULL                     | Renovada a cada request autenticado              |
| createdAt | TIMESTAMPTZ | NOT NULL, default now()      |                                                  |

**Regras**:
- A cada request autenticado bem-sucedido, `expiresAt` é atualizado para `now() + 30 days`.
- No logout, a sessão é deletada imediatamente.
- Sessões simultâneas são permitidas (múltiplos dispositivos).

---

### PasswordResetToken

Representa um token temporário de redefinição de senha.

| Campo     | Tipo        | Constraints                  | Notas                                    |
|-----------|-------------|------------------------------|------------------------------------------|
| id        | UUID        | PK, generated                |                                          |
| userId    | UUID        | NOT NULL, FK → User.id       |                                          |
| token     | VARCHAR(128)| NOT NULL, UNIQUE             | 64 bytes hex (128 chars)                 |
| expiresAt | TIMESTAMPTZ | NOT NULL                     | `createdAt + 1 hour`                     |
| usedAt    | TIMESTAMPTZ | NULL                         | Preenchido quando o token é consumido    |
| createdAt | TIMESTAMPTZ | NOT NULL, default now()      |                                          |

**Regras**:
- Um token é válido apenas se `expiresAt > now()` AND `usedAt IS NULL`.
- Após uso, `usedAt` é preenchido (token invalidado, não deletado — auditoria).
- Um usuário pode ter múltiplos tokens pendentes (cada "esqueci a senha" gera um novo), mas apenas o mais recente válido é aceito.

---

## Relacionamentos

```
User ────────── FamilyGroup   (N:1 — um usuário pertence a 0 ou 1 grupo)
FamilyGroup ─── Invite        (1:0..1 — no máximo 1 convite ativo por grupo)
User ────────── Session       (1:N — múltiplas sessões ativas simultâneas)
User ────────── PasswordResetToken (1:N — múltiplos tokens pendentes possíveis)
```

---

## Schema Prisma (referência)

```prisma
model User {
  id             String               @id @default(uuid())
  name           String               @db.VarChar(100)
  email          String               @unique @db.VarChar(255)
  passwordHash   String               @db.VarChar(255)
  familyGroupId  String?
  familyGroup    FamilyGroup?         @relation(fields: [familyGroupId], references: [id])
  sessions       Session[]
  resetTokens    PasswordResetToken[]
  createdAt      DateTime             @default(now())
  updatedAt      DateTime             @updatedAt
}

model FamilyGroup {
  id        String   @id @default(uuid())
  name      String   @db.VarChar(100)
  members   User[]
  invite    Invite?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Invite {
  id             String      @id @default(uuid())
  familyGroupId  String      @unique
  familyGroup    FamilyGroup @relation(fields: [familyGroupId], references: [id])
  code           String      @unique @db.VarChar(8)
  expiresAt      DateTime
  createdAt      DateTime    @default(now())
}

model Session {
  id        String   @id @default(uuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  expiresAt DateTime
  createdAt DateTime @default(now())
}

model PasswordResetToken {
  id        String    @id @default(uuid())
  userId    String
  user      User      @relation(fields: [userId], references: [id])
  token     String    @unique @db.VarChar(128)
  expiresAt DateTime
  usedAt    DateTime?
  createdAt DateTime  @default(now())
}
```
