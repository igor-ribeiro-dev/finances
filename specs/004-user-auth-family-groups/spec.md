# Feature Specification: Autenticação de Usuários e Grupos Familiares

**Feature Branch**: `004-user-auth-family-groups`

**Created**: 2026-05-17

**Status**: Draft

**Input**: Próxima fase do roadmap (spec 003): "Register, log in, and manage credentials. Create a family group or join one via a shareable invite link or short code. All members of the family group are equal — any member can view and edit all expenses and budgets belonging to the group."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Cadastro e Login (Priority: P1)

Uma pessoa que quer controlar as finanças da família acessa o app pela primeira vez, cria uma conta com e-mail e senha e faz login. Se ainda não pertence a nenhum grupo familiar, é redirecionada para uma tela de onboarding obrigatória onde deve criar ou entrar em um grupo antes de acessar qualquer outra área do app.

**Why this priority**: Sem cadastro e login, nenhuma outra funcionalidade do app é acessível. É o pré-requisito absoluto de todos os demais fluxos.

**Independent Test**: Pode ser testado de forma isolada acessando a tela de cadastro, criando uma conta e confirmando que o login redireciona para a tela de onboarding quando o usuário não tem grupo, ou para o dashboard quando já tem.

**Acceptance Scenarios**:

1. **Given** o usuário não possui conta, **When** ele preenche e-mail e senha válidos e confirma o cadastro, **Then** a conta é criada e o usuário é redirecionado para a tela de onboarding (criar ou entrar em grupo).
2. **Given** o usuário possui conta e já pertence a um grupo, **When** ele informa e-mail e senha corretos na tela de login, **Then** o acesso é concedido e o sistema exibe o dashboard do grupo.
3. **Given** o usuário possui conta mas não pertence a nenhum grupo, **When** ele faz login, **Then** o sistema redireciona diretamente para a tela de onboarding — nenhuma outra tela do app é acessível até que o grupo seja criado ou ingresso.
4. **Given** o usuário informa uma senha incorreta, **When** ele tenta fazer login, **Then** o sistema exibe uma mensagem de erro sem revelar qual campo está incorreto.
5. **Given** o usuário tenta se cadastrar com um e-mail já existente, **When** ele confirma o formulário, **Then** o sistema informa que o e-mail já está em uso.

---

### User Story 2 - Criar Grupo Familiar (Priority: P2)

Um usuário já autenticado, que ainda não pertence a nenhum grupo familiar, cria um novo grupo informando um nome. O sistema gera automaticamente um link ou código de convite que pode ser compartilhado com outros membros da família.

**Why this priority**: Sem um grupo familiar, o usuário não pode registrar despesas nem configurar orçamentos. Criar o grupo é o segundo passo obrigatório após o cadastro.

**Independent Test**: Pode ser testado criando um grupo e verificando que o link/código de convite é gerado e exibido ao criador.

**Acceptance Scenarios**:

1. **Given** o usuário autenticado não pertence a nenhum grupo, **When** ele cria um grupo informando um nome, **Then** o grupo é criado e um link/código de convite é gerado e exibido.
2. **Given** o link/código foi gerado, **When** o usuário copia e compartilha com outro membro, **Then** o outro membro consegue usá-lo para entrar no grupo.
3. **Given** o usuário já pertence a um grupo, **When** ele tenta criar um novo grupo, **Then** o sistema informa que ele já está em um grupo e impede a criação.

---

### User Story 3 - Entrar em um Grupo Familiar (Priority: P3)

Um usuário que recebeu um link ou código de convite de um familiar entra no grupo existente. Após entrar, passa a ter acesso igual ao de todos os outros membros — pode visualizar e editar todas as despesas e orçamentos do grupo.

**Why this priority**: Sem essa funcionalidade, apenas o criador do grupo pode usar o app; toda a proposta de rastreamento familiar compartilhado fica bloqueada. É necessária logo após a criação do grupo.

**Independent Test**: Pode ser testado criando uma segunda conta, usando o link/código gerado na US2 e verificando que o segundo usuário entra no grupo com acesso completo.

**Acceptance Scenarios**:

1. **Given** o usuário possui um link ou código de convite válido, **When** ele o utiliza, **Then** ele entra no grupo familiar e passa a ter acesso completo às despesas e orçamentos do grupo.
2. **Given** o usuário já pertence a um grupo, **When** ele tenta usar um convite de outro grupo, **Then** o sistema informa que ele já está em um grupo e impede a entrada.
3. **Given** o usuário usa um código de convite inválido ou expirado, **When** ele tenta entrar no grupo, **Then** o sistema exibe uma mensagem de erro clara.

---

### User Story 4 - Recuperação de Senha (Priority: P4)

Um usuário que esqueceu sua senha solicita a redefinição informando o e-mail cadastrado. O sistema envia um e-mail com um link temporário que permite criar uma nova senha.

**Why this priority**: Sem recuperação de senha, usuários bloqueados ficam sem acesso permanentemente. É um requisito de segurança básico, mas não bloqueia o fluxo principal de usuários que lembram suas credenciais.

**Independent Test**: Pode ser testado solicitando redefinição de senha e verificando que o e-mail é recebido e o link de redefinição funciona corretamente.

**Acceptance Scenarios**:

1. **Given** o usuário informa um e-mail cadastrado na tela de recuperação, **When** confirma a solicitação, **Then** recebe um e-mail com um link para redefinir a senha.
2. **Given** o usuário acessa o link de redefinição e informa uma nova senha válida, **When** confirma, **Then** a senha é atualizada e ele pode fazer login com a nova senha.
3. **Given** o usuário informa um e-mail não cadastrado na tela de recuperação, **When** confirma, **Then** o sistema exibe a mesma mensagem de sucesso (para não revelar quais e-mails estão cadastrados).

---

### Edge Cases

- O que acontece quando o criador do grupo remove sua própria conta? O grupo deve continuar existindo com os demais membros.
- O que ocorre se o link de convite é acessado por um usuário que ainda não tem conta? O sistema deve permitir o cadastro e a entrada no grupo em sequência.
- O que acontece se o usuário tenta fazer login enquanto já possui uma sessão ativa em outro dispositivo? A nova sessão é criada normalmente; sessões simultâneas são permitidas.
- O que ocorre se um membro sai do grupo? Ele perde o acesso imediatamente; seus dados históricos permanecem no grupo.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema DEVE permitir que novos usuários se cadastrem informando nome, e-mail e senha. A senha DEVE ter no mínimo 8 caracteres, conter pelo menos 1 número e pelo menos 1 letra maiúscula; o sistema DEVE exibir feedback claro sobre cada requisito não atendido.
- **FR-002**: O sistema DEVE validar que o e-mail informado no cadastro é único — não pode existir outra conta com o mesmo e-mail.
- **FR-003**: O sistema DEVE permitir que usuários cadastrados façam login com e-mail e senha.
- **FR-004**: O sistema DEVE permitir que usuários façam logout a qualquer momento.
- **FR-005**: O sistema DEVE permitir que usuários solicitem redefinição de senha via e-mail, recebendo um link temporário para criar uma nova senha.
- **FR-006**: O sistema DEVE permitir que um usuário autenticado, que ainda não pertença a nenhum grupo, crie um grupo familiar informando um nome.
- **FR-007**: Ao criar um grupo, o sistema DEVE gerar automaticamente um link e um código curto de convite únicos para aquele grupo.
- **FR-008**: O sistema DEVE permitir que um usuário autenticado entre em um grupo familiar utilizando um link ou código de convite válido.
- **FR-009**: Todos os membros de um grupo familiar DEVEM ter acesso igual — qualquer membro pode visualizar e editar todas as despesas e orçamentos do grupo.
- **FR-010**: Um usuário DEVE pertencer a no máximo um grupo familiar por vez.
- **FR-011**: O sistema DEVE permitir que um membro saia do grupo a qualquer momento; ao sair, perde o acesso imediatamente.
- **FR-012**: Cada grupo possui no máximo 1 convite ativo por vez. O convite expira após 7 dias sem uso. Qualquer membro pode regenerar um novo convite; ao fazer isso, o convite anterior é invalidado imediatamente.
- **FR-013**: Um usuário autenticado que não pertence a nenhum grupo DEVE ser redirecionado para uma tela de onboarding obrigatória; nenhuma outra tela do app é acessível até que ele crie ou entre em um grupo.
- **FR-014**: As sessões DEVEM ter validade de 30 dias, renovando automaticamente a cada uso do app; uma sessão inativa por 30 dias consecutivos é encerrada e o usuário deve fazer login novamente.

### Key Entities

- **Usuário**: Pessoa com credenciais próprias (e-mail + senha) e um nome de exibição. Pode pertencer a zero ou um grupo familiar.
- **GrupoFamiliar**: Unidade doméstica com um nome. Contém uma lista de membros. Identificado internamente por um identificador único.
- **Convite**: Mecanismo de entrada no grupo — composto por um link compartilhável e um código curto alfanumérico. Tem validade de 7 dias. Existe no máximo 1 convite ativo por grupo; regenerar cria um novo e invalida o anterior imediatamente. Pertence a um GrupoFamiliar.
- **Sessão**: Registro de acesso ativo de um usuário. Criada no login; renovada automaticamente a cada uso; expira após 30 dias sem uso ou ao fazer logout explícito.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Um novo usuário consegue criar uma conta e fazer login em menos de 2 minutos.
- **SC-002**: O criador de um grupo consegue compartilhar um convite e um novo membro consegue entrar no grupo em menos de 3 minutos.
- **SC-003**: 95% dos novos usuários completam o cadastro com sucesso na primeira tentativa.
- **SC-004**: Um membro que entra no grupo tem acesso imediato (sem configuração adicional) a todas as despesas e orçamentos do grupo.
- **SC-005**: O sistema impede que um usuário pertença a mais de um grupo simultaneamente em 100% das tentativas.

## Clarifications

### Session 2026-05-17

- Q: Qual é a tela/estado inicial que o usuário vê após fazer login pela primeira vez sem pertencer a nenhum grupo? → A: Tela de onboarding obrigatória — o usuário deve criar ou entrar em um grupo antes de acessar o restante do app.
- Q: Por quanto tempo uma sessão de usuário permanece ativa sem interação (timeout de inatividade)? → A: 30 dias com renovação automática — a sessão renova a cada uso e expira após 30 dias sem abrir o app.
- Q: Quais são os requisitos mínimos para uma senha ser aceita? → A: Mínimo 8 caracteres + pelo menos 1 número + 1 letra maiúscula.
- Q: O sistema deve limitar ou bloquear tentativas de login após erros consecutivos? → A: Sem limite — o usuário pode tentar indefinidamente; não há bloqueio de conta ou CAPTCHA.
- Q: Ao gerar um novo convite para o grupo, o convite anterior é invalidado? → A: Apenas 1 convite ativo por vez — regenerar invalida o anterior imediatamente.

## Assumptions

- Cada usuário pertence a no máximo um grupo familiar; não há suporte a múltiplos grupos por usuário na versão inicial.
- O sistema não implementa bloqueio de conta ou limite de tentativas de login; proteção contra força bruta é considerada fora do escopo para a versão inicial deste app de uso familiar.
- O convite é gerado para o grupo como um todo, não por membro — qualquer pessoa com o link/código pode entrar até o convite expirar ou ser regenerado.
- Não há papel de "administrador" dentro do grupo: todos os membros têm permissões iguais, incluindo gerar novos convites.
- A recuperação de senha depende de entrega de e-mail; sem um serviço de e-mail configurado, esse fluxo não funcionará em ambientes sem SMTP.
- O app não oferece login via redes sociais (Google, Apple, etc.) na versão inicial — apenas e-mail e senha.
- A interface é exclusivamente em Português do Brasil (PT-BR), conforme restrição global do produto definida no spec 003.
- Esta feature depende da infraestrutura do monorepo estabelecida no spec 001.
