# Feature Specification: Registro de Despesas

**Feature Branch**: `006-expense-registration`

**Created**: 2026-05-25

**Status**: Draft

**Input**: Roadmap feature #005 — "Record individual expenses with an amount, date, description, payment method (cash/debit or credit card), and the family member the expense belongs to (assignable to any member, not necessarily the one recording it). Category assignment is optional. All expenses — including those paid by credit card — count against the budget at the date they are registered. The app does not sync with or automatically calculate credit card bills."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Registrar uma Despesa (Priority: P1)

Um membro do grupo familiar registra uma despesa do dia-a-dia (ex.: compra no mercado, gasolina, jantar) informando o valor, a data, uma descrição curta, o método de pagamento (dinheiro/débito ou crédito) e a quem essa despesa pertence (ele mesmo ou outro membro da família).

**Why this priority**: Sem registro de despesas, o app não tem dado nenhum para mostrar — é a entrada primária de informação do produto e o pré-requisito factual para Dashboard, Orçamentos e Categorias. Toda a proposta de valor depende desta capacidade.

**Independent Test**: Pode ser testado por um usuário autenticado e com grupo: ele abre a tela de nova despesa, preenche o formulário com valor, data, descrição, método de pagamento e responsável, e confirma. Após confirmar, a despesa aparece persistida e acessível para o grupo.

**Acceptance Scenarios**:

1. **Given** o usuário está autenticado e pertence a um grupo familiar, **When** ele acessa a tela de registro de despesa e preenche todos os campos obrigatórios (valor, data, descrição, método de pagamento, membro responsável) com valores válidos, **Then** a despesa é salva e atribuída ao grupo do usuário.
2. **Given** o usuário está preenchendo uma nova despesa, **When** ele seleciona o campo "responsável" (membro da família), **Then** o sistema lista todos os membros do grupo do usuário logado e permite escolher qualquer um deles (inclusive ele mesmo).
3. **Given** o usuário tenta salvar uma despesa, **When** algum campo obrigatório está vazio ou inválido (ex.: valor ≤ 0, data no futuro, descrição em branco), **Then** o sistema rejeita o envio e exibe uma mensagem explicando qual campo precisa ser corrigido.
4. **Given** o usuário registra uma despesa paga em "cartão de crédito", **When** a despesa é salva, **Then** ela conta para o orçamento na data informada no registro (não na data de pagamento da fatura) — comportamento idêntico a despesas pagas em dinheiro/débito.

---

### User Story 2 - Visualizar Despesas Registradas (Priority: P2)

Um membro do grupo abre uma lista das despesas já registradas pelo grupo familiar, com os campos essenciais visíveis (data, descrição, valor, responsável, método de pagamento), permitindo confirmar visualmente que os registros estão corretos.

**Why this priority**: Sem uma visão das despesas registradas o usuário não confia que o registro funcionou e não consegue identificar erros para corrigir. Filtragem avançada (por categoria, intervalo de datas, cartão específico) é responsabilidade da feature 011, mas uma listagem básica é necessária imediatamente.

**Independent Test**: Após registrar pelo menos uma despesa (US1), o usuário abre a tela de listagem e vê todas as despesas do grupo ordenadas por data (mais recente primeiro), com os 5 campos essenciais visíveis em cada linha.

**Acceptance Scenarios**:

1. **Given** o grupo familiar possui despesas registradas, **When** qualquer membro abre a tela de listagem de despesas, **Then** todas as despesas do grupo são exibidas (incluindo as registradas por outros membros), ordenadas da mais recente para a mais antiga.
2. **Given** o grupo familiar ainda não possui despesas registradas, **When** o usuário abre a tela de listagem, **Then** o sistema exibe um estado vazio com um chamado para registrar a primeira despesa.
3. **Given** cada linha da lista representa uma despesa, **When** o usuário visualiza uma linha, **Then** os seguintes campos são imediatamente visíveis: data, descrição, valor formatado em BRL (R$), nome do membro responsável e método de pagamento.

---

### User Story 3 - Editar ou Excluir uma Despesa (Priority: P3)

Um membro do grupo identifica um erro em uma despesa (própria ou de outro membro) e corrige o valor, data, descrição, método de pagamento ou responsável — ou exclui o registro inteiro.

**Why this priority**: Permite corrigir erros sem precisar deletar e recriar. Importante para confiança no dado registrado, mas não bloqueia o uso inicial do app — um usuário pode conviver com despesas erradas no curto prazo enquanto a edição não existe.

**Independent Test**: Após registrar uma despesa (US1), o usuário abre essa despesa, altera um campo (ex.: valor) e salva — a alteração é refletida na listagem. Em uma despesa registrada por outro membro, a mesma operação também é permitida e bem-sucedida.

**Acceptance Scenarios**:

1. **Given** uma despesa registrada por qualquer membro do grupo, **When** outro membro do mesmo grupo abre essa despesa e altera um ou mais campos com valores válidos, **Then** a despesa é atualizada e o estado anterior é substituído.
2. **Given** uma despesa registrada, **When** qualquer membro do grupo confirma a exclusão dessa despesa, **Then** ela é removida permanentemente e deixa de aparecer na listagem.
3. **Given** o usuário inicia uma edição, **When** ele cancela antes de salvar, **Then** os valores originais da despesa permanecem inalterados.

---

### Edge Cases

- **Despesa em valor muito alto ou muito baixo**: O valor mínimo é R$ 0,01 (um centavo); não há valor máximo definido por regra de negócio, mas valores acima de R$ 1.000.000,00 devem exibir uma confirmação adicional para evitar erros de digitação.
- **Data futura**: Não permitida — registrar despesas é sempre um ato de retrospectiva. Data máxima permitida é "hoje" no fuso horário do usuário.
- **Data muito antiga**: Permitida sem limite — o usuário pode registrar uma despesa atrasada de qualquer mês passado.
- **Descrição vazia ou apenas espaços em branco**: Rejeitada — descrição é obrigatória e deve conter ao menos 1 caractere significativo. Comprimento máximo de 200 caracteres.
- **Membro responsável que foi removido do grupo**: A despesa permanece associada ao registro histórico do ex-membro (não é re-atribuída automaticamente); a interface exibe o nome do ex-membro em itálico ou marcador visual de "ex-membro" na listagem.
- **Edição concorrente**: Se dois membros editam a mesma despesa simultaneamente, vale o último salvamento (last-write-wins) — não há merge nem trava pessimista.
- **Categoria opcional**: Esta feature NÃO inclui seleção de categoria (categorias serão estruturadas na feature 007). O campo de categoria não é exposto na UI desta feature; será adicionado quando 007 for entregue.
- **Cartão de crédito específico**: Esta feature NÃO permite associar a despesa a um cartão de crédito específico (isso pertence à feature 016). O método de pagamento é apenas o tipo (dinheiro/débito OU cartão de crédito) sem distinguir entre cartões.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema DEVE permitir que qualquer usuário autenticado e pertencente a um grupo familiar registre uma nova despesa.
- **FR-002**: Uma despesa registrada DEVE conter, obrigatoriamente: valor monetário (em BRL, > 0), data da despesa (não no futuro), descrição (1–200 caracteres significativos), método de pagamento (dinheiro/débito OU cartão de crédito) e membro responsável (qualquer membro do mesmo grupo do registrante).
- **FR-003**: O campo "membro responsável" no formulário (tanto na criação quanto na edição) DEVE listar **apenas os membros atualmente ativos** do grupo familiar do usuário logado, permitindo a seleção de qualquer um deles, inclusive ele mesmo. Ex-membros (usuários removidos do grupo) NÃO DEVEM aparecer no seletor — eles permanecem visíveis apenas nas despesas históricas já registradas (FR-018). O backend DEVE validar em `POST` e `PATCH` que o `ownerMemberId` recebido corresponde a um membro ativo do grupo no momento da operação; caso contrário, retornar erro de validação (envelope FR-010) com `field: "ownerMemberId"`.
- **FR-004**: A despesa DEVE ser automaticamente atribuída ao grupo familiar do usuário que a registrou — nenhum campo de seleção de grupo é apresentado.
- **FR-005**: Todas as despesas registradas por qualquer membro DEVEM ser visíveis a todos os outros membros do mesmo grupo familiar; nenhum membro pode possuir despesas privadas.
- **FR-006**: Qualquer membro do grupo DEVE poder editar ou excluir qualquer despesa do grupo, independentemente de quem a registrou.
- **FR-007**: O sistema DEVE expor uma tela de listagem de despesas que exibe as despesas do grupo do usuário logado, ordenadas da data mais recente para a mais antiga, carregadas de forma incremental por paginação baseada em cursor: o backend retorna uma página de tamanho fixo (50 itens) acompanhada de um cursor opaco; o frontend faz infinite scroll, requisitando a próxima página quando o usuário se aproxima do fim da lista. O cursor DEVE ser estável diante de inserções e edições concorrentes (composto por data + identificador da despesa).
- **FR-008**: A listagem DEVE exibir, para cada despesa, no mínimo: data, descrição, valor formatado em BRL, nome do membro responsável e método de pagamento.
- **FR-009**: Quando o grupo não tem despesas registradas, a tela de listagem DEVE exibir um estado vazio com um chamado para ação para registrar a primeira despesa.
- **FR-010**: O sistema DEVE rejeitar registros com valor ≤ 0, data no futuro, descrição em branco, método de pagamento inválido ou membro responsável fora do grupo do registrante. As respostas de erro de validação (HTTP 4xx) DEVEM seguir o envelope **flat** já estabelecido pelo helper `sendError` da feature 004, estendido com um campo opcional `fieldErrors`: `{ code: string, message: string, fieldErrors?: Array<{ field: string, code: string, message: string }> }`. Quando o erro for de validação de campo (status 400/422), `fieldErrors` DEVE estar presente com uma entrada por campo inválido (`field` referencia o nome do campo na requisição, ex.: `amountCents`, `date`, `description`); o frontend renderiza essas mensagens inline embaixo de cada input. Para erros não-de-validação (401, 403, 404, 409, 500) o `fieldErrors` é omitido e o frontend mostra o `message` num toast. O formato é estritamente um superset do shape atual de 004 (`{ code, message }`) — endpoints existentes continuam funcionando sem mudanças.
- **FR-011**: Para valores acima de R$ 1.000.000,00 o sistema DEVE exibir uma confirmação adicional antes de salvar, para mitigar erros de digitação.
- **FR-012**: O valor monetário DEVE ser armazenado e trafegado pela API como inteiro de centavos (ex.: R$ 123,45 → `12345`); arredondamento, truncamento silencioso ou uso de ponto flutuante NÃO são permitidos em nenhuma camada (frontend, API, banco). A exibição em PT-BR DEVE ser feita via formatação localizada (`R$ 123,45`).
- **FR-022**: O campo de entrada de valor DEVE usar máscara monetária no estilo brasileiro (Nubank/banco): a digitação acumula dígitos da direita para a esquerda como centavos e renderiza o valor formatado em tempo real (ex.: digitar `12345` mostra `R$ 123,45`; backspace remove o último dígito). O input NÃO DEVE aceitar entrada de vírgula ou ponto pelo usuário — separadores decimais e de milhar são gerados pela máscara. Internamente o componente expõe o valor como inteiro de centavos.
- **FR-013**: A data da despesa DEVE ser armazenada e transmitida como data civil pura (sem hora e sem timezone) — tipo `DATE` no banco Postgres, formato `"YYYY-MM-DD"` no JSON da API. Não há conversão de timezone em nenhuma camada: a data que o usuário digita é a data que persiste e a data que retorna. O cursor da paginação por data (FR-007) DEVE ordenar por `(date DESC, id DESC)`, usando o `id` (UUID/CUID) como desempate determinístico quando várias despesas caem no mesmo dia.
- **FR-014**: Despesas pagas em cartão de crédito DEVEM ser tratadas, para fins de orçamento, exatamente como despesas em dinheiro/débito — ambas contam para o orçamento na data da despesa, não em data de pagamento de fatura.
- **FR-015**: Esta feature NÃO DEVE expor seleção de categoria nem seleção de cartão de crédito específico — esses recursos pertencem às features 007 e 016, respectivamente.
- **FR-016**: A interface desta feature DEVE estar inteiramente em Português do Brasil (PT-BR), respeitando a restrição global do produto definida no spec 003.
- **FR-017**: Em caso de edição concorrente por dois membros, o sistema aplica last-write-wins (a última operação de salvamento sobrescreve a anterior) sem alertar o usuário.
- **FR-018**: Se o membro responsável por uma despesa for removido do grupo familiar, a despesa permanece intacta com a referência histórica ao ex-membro; a UI DEVE indicar visualmente que se trata de um ex-membro na listagem.
- **FR-019**: Os endpoints REST desta feature DEVEM usar recurso plano sob o prefixo `/api/v1/expenses` (alinhado ao versionamento estabelecido na feature 004 — sem aninhamento de `groupId` na URL). O `groupId` ao qual cada operação se aplica DEVE ser derivado do `userId` do cookie de sessão (validado pelo `auth.middleware.ts` da feature 004, que injeta `res.locals.userId`) seguido de uma consulta de membership no banco — nunca recebido como parâmetro de path ou de body. Operações: `POST /api/v1/expenses` (criar), `GET /api/v1/expenses?limit&cursor` (listar com paginação por cursor), `GET /api/v1/expenses/:id` (detalhar), `PATCH /api/v1/expenses/:id` (editar — corpo é o estado completo da despesa, ver FR-023), `DELETE /api/v1/expenses/:id` (excluir). Toda requisição a `/api/v1/expenses/:id` DEVE retornar 404 se a despesa não pertencer ao grupo do usuário autenticado — sem distinção entre "não existe" e "existe mas não é do seu grupo", para não vazar a existência de recursos de outros grupos.
- **FR-023**: O endpoint `PATCH /api/v1/expenses/:id` DEVE usar semântica full-body (apesar do verbo `PATCH`): o frontend envia sempre o conjunto completo de campos editáveis (`amountCents`, `date`, `description`, `paymentMethod`, `ownerMemberId`); o backend valida o payload inteiro como se fosse uma criação e sobrescreve o registro. Campos não-editáveis (`id`, `groupId`, `createdById`, `createdAt`, `updatedById`, `updatedAt`) DEVEM ser ignorados se enviados — não há erro de validação por isso, mas também não são persistidos. PATCH parcial (campo ausente = "não tocar") NÃO é suportado.
- **FR-024**: O endpoint `POST /api/v1/expenses` DEVE suportar idempotência via header HTTP `Idempotency-Key: <uuid v4>` enviado pelo frontend em cada tentativa de criação. Comportamento do backend: (1) se a chave NÃO existir na tabela de idempotência, processa o POST normalmente, persiste o par `(idempotencyKey, expenseId, userId)` com TTL de 24h, e retorna `201 Created`; (2) se a chave JÁ existir e pertencer ao mesmo `userId`, retorna a despesa originalmente criada com `200 OK` (sem criar nova) — o frontend trata como sucesso idêntico ao 201; (3) se a chave existir mas pertencer a outro `userId`, retorna `409 Conflict` (defesa contra abuso de chave alheia). O frontend DEVE gerar uma nova `Idempotency-Key` (UUID v4) por tentativa de submit do formulário — não reutilizar a chave após sucesso confirmado. Ausência do header é aceita (sem dedupe), mas a UI desta feature SEMPRE envia o header.
- **FR-025**: O campo `createdById` (autor original do registro) DEVE ser **write-once**: definido no `POST /api/v1/expenses` a partir do `userId` da sessão autenticada (não aceito do body) e **imutável** em qualquer `PATCH` subsequente. Mesmo que um payload PATCH inclua `createdById`, o backend ignora silenciosamente (conforme FR-023). O `ownerMemberId` (membro responsável pela despesa) permanece editável por qualquer membro do grupo. Essa distinção preserva a auditoria de "quem cadastrou esse registro", separada da edição funcional de "a quem essa despesa pertence".
- **FR-028**: O campo `updatedById` (último editor do registro) DEVE ser definido **server-side em toda escrita**: no `POST /api/v1/expenses` é igualado ao `createdById` (`res.locals.userId` da sessão); em cada `PATCH /api/v1/expenses/:id` bem-sucedido é sobrescrito com o `userId` da sessão atual. Nunca é aceito do body — se o cliente enviar `updatedById`, o backend ignora silenciosamente (conforme FR-023). Em conjunto com `updatedAt` (auto-atualizado pelo Prisma), o campo permite responder "quem foi o último membro a alterar essa despesa, e quando" — útil para a UI exibir contexto histórico de edição quando outros membros editam despesas de um colega. `updatedById` DEVE ser exposto na resposta de `GET`, `POST` e `PATCH` da API, e a UI PODE exibi-lo como tooltip ou linha auxiliar na listagem (não obrigatório nesta feature; o campo fica disponível para uso por features futuras como histórico/auditoria).
- **FR-026**: A exclusão de despesa DEVE exigir confirmação explícita via modal antes de qualquer mudança de UI ou requisição ao backend. O fluxo: (1) usuário clica no controle "excluir" de uma despesa; (2) o app abre modal de confirmação com título claro ("Excluir esta despesa?"), corpo descrevendo a ação ("Esta ação não pode ser desfeita.") e dois botões — `Cancelar` (foco padrão) e `Excluir` (visualmente destacado como destrutivo, ex.: cor vermelha); (3) clicar `Cancelar` (ou pressionar `Esc`, ou clicar fora do modal) fecha o modal sem efeito algum; (4) clicar `Excluir` fecha o modal, dispara o `DELETE /api/v1/expenses/:id` e aplica a remoção otimista da linha (conforme FR-021); (5) se o backend falhar, a linha é restaurada e um toast de erro é exibido (rollback de FR-021).
- **FR-027**: Quando uma operação `PATCH /api/v1/expenses/:id` ou `DELETE /api/v1/expenses/:id` retornar **404** porque a despesa foi excluída por outro membro do grupo durante a interação, o frontend DEVE:
  1. Em caso de PATCH com modal de edição aberto: exibir mensagem de erro explícita no próprio modal — "Esta despesa foi excluída por outro membro do grupo enquanto você editava. Não é possível salvar." — com um único botão `OK` que fecha o modal. NÃO tentar recriar a despesa (sem "ressurreição" via POST automático) e NÃO restaurar estado antigo via rollback otimista (pois não há estado válido a restaurar — a despesa não existe mais).
  2. Em caso de DELETE: tratar o 404 como sucesso silencioso (o efeito desejado — despesa ausente — já foi alcançado por outro membro); a linha já removida otimisticamente permanece removida; nenhum toast de erro é exibido.
  3. Em ambos os casos, garantir que a linha correspondente esteja removida da listagem local antes do próximo recarregamento incremental, evitando exibir a despesa fantasma.
- **FR-020**: O formulário de criação e edição de despesa DEVE ser apresentado como modal overlay sobre a tela de listagem — não como rota dedicada. Clicar em "+ Nova despesa" abre o modal vazio; clicar em uma linha da listagem (ou em um botão de editar dessa linha) abre o modal pré-preenchido com os valores atuais da despesa. Cancelar ou clicar fora do modal o fecha sem persistir; salvar persiste e fecha o modal, atualizando a linha correspondente (ou inserindo a nova despesa) na listagem ao fundo. A listagem NÃO precisa ser recarregada por completo após salvar — apenas a linha afetada é atualizada in-place.
- **FR-021**: O frontend DEVE usar atualização otimista da UI para as operações de criar, editar e excluir despesa: ao confirmar a ação, o modal fecha imediatamente (no caso de criar/editar) ou a linha desaparece imediatamente (no caso de excluir), com a listagem refletindo o novo estado antes da resposta do servidor. Em caso de falha na requisição, o frontend DEVE reverter a UI ao estado anterior (a despesa reaparece com os valores antigos, ou volta para a lista após exclusão) e exibir um toast de erro descrevendo a falha. Para que o rollback seja confiável, o frontend DEVE armazenar o snapshot do estado anterior antes de aplicar a mudança otimista.

### Key Entities

- **Despesa (Expense)**: Registro de um gasto único da família. Atributos: identificador (UUID/CUID), valor (`amountCents`, inteiro em centavos), data (`date`, civil pura `YYYY-MM-DD`), descrição (1–200 caracteres), método de pagamento (`paymentMethod`), grupo familiar (`groupId`, proprietário implícito derivado do registrante), membro responsável (`ownerMemberId`, editável), autor do registro (`createdById`, write-once — definido na criação, imutável em edição), último editor (`updatedById`, sobrescrito server-side em cada PATCH; igual a `createdById` na criação), timestamps de criação (`createdAt`) e atualização (`updatedAt`). Categoria e cartão de crédito específico não fazem parte desta feature.
- **Método de Pagamento (PaymentMethod)**: Enumeração com exatamente dois valores nesta feature: `CASH_OR_DEBIT` (dinheiro ou débito) e `CREDIT_CARD` (cartão de crédito genérico). A associação com um cartão específico será adicionada pela feature 016.
- **Grupo Familiar (FamilyGroup)**: Entidade já existente (feature 004) — proprietário implícito de todas as despesas registradas por seus membros.
- **Membro do Grupo (User dentro de FamilyGroup)**: Entidade já existente (feature 004) — qualquer membro do grupo pode ser indicado como responsável por uma despesa, independentemente de quem a registrou.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Um usuário consegue registrar uma despesa nova (do clique em "nova despesa" até a confirmação de salvamento) em no máximo 30 segundos, em condições normais de uso.
- **SC-002**: 100% das despesas registradas por qualquer membro do grupo ficam visíveis para todos os outros membros do mesmo grupo imediatamente após o salvamento.
- **SC-003**: Nenhum dado de despesa é perdido ou corrompido em registros válidos: 0% de divergência entre valor digitado pelo usuário e valor exibido na listagem.
- **SC-004**: Tentativas de registrar despesas com dados inválidos (valor ≤ 0, data no futuro, descrição vazia, membro fora do grupo) são bloqueadas em 100% dos casos antes de tocar o armazenamento.
- **SC-005**: O usuário identifica e corrige uma despesa errada (editar ou excluir) em no máximo 3 cliques a partir da tela de listagem.
- **SC-006**: Em uma listagem com até 500 despesas no grupo, todas as despesas aparecem na tela de listagem em até 2 segundos após abrir a tela (carregamento percebido como "imediato" pelo usuário).

## Clarifications

### Session 2026-05-25 (gaps remanescentes)

- Q: Padrão de confirmação ao excluir uma despesa? → A: Modal de confirmação explícito ("Excluir esta despesa? Esta ação não pode ser desfeita.") com Cancelar (foco padrão) e Excluir (botão destrutivo); só após Confirmar é que o delete otimista (FR-021) é aplicado e o DELETE disparado.
- Q: Comportamento quando uma despesa é deletada por outro membro durante minha edição? → A: PATCH 404 → mensagem explícita no modal "Esta despesa foi excluída por outro membro" + botão OK fecha; sem ressurreição via POST automático; sem rollback (não há estado válido). DELETE 404 → sucesso silencioso (efeito já alcançado).
- Q: Visibilidade de ex-membros no seletor de "responsável" do formulário? → A: Apenas membros ativos no picker (criar e editar); ex-membros só aparecem nas despesas históricas (FR-018). Backend valida que `ownerMemberId` está ativo no grupo no momento da operação.

### Session 2026-05-25 (backend deep-dive)

- Q: Tipo de armazenamento e transmissão do campo `date`? → A: `DATE` puro (Postgres `DATE`, JSON `"YYYY-MM-DD"`); cursor desempata por `(date DESC, id DESC)`. Sem conversão de timezone.
- Q: Semântica do `PATCH /api/v1/expenses/:id`? → A: Full-body — frontend envia todos os campos editáveis; backend valida e sobrescreve. PATCH parcial não suportado. Campos não-editáveis (id, groupId, createdById, createdAt) ignorados silenciosamente.
- Q: Estratégia de idempotência no `POST /api/v1/expenses`? → A: Header `Idempotency-Key: <uuid v4>` por tentativa de submit; backend dedupe em tabela com TTL 24h. Chave repetida do mesmo usuário retorna 200 com a despesa original; chave de outro usuário retorna 409.
- Q: Formato da resposta de erro de validação (4xx)? → A: Envelope **flat** existente de 004 (`{ code, message }`) estendido com `fieldErrors?: Array<{ field, code, message }>` opcional; presente em erros de validação para inline errors; omitido em outros 4xx/5xx (toast). Sem campo `error` wrapper — mantém compatibilidade com endpoints já mergeados de 004.
- Q: Mutabilidade do `createdById` em edição? → A: Write-once — `createdById` é definido no POST a partir do `userId` da sessão e imutável em PATCH; `ownerMemberId` permanece editável. Preserva auditoria de autoria.

### Session 2026-05-25

- Q: Estratégia de paginação na listagem de despesas? → A: Paginação por cursor — backend retorna `limit=50` por página com cursor opaco (data + id); frontend faz infinite scroll.
- Q: Estrutura dos endpoints REST de despesa? → A: Recurso plano `/api/v1/expenses`; `userId` do cookie de sessão (feature 004) + lookup de membership resolve o `groupId` no middleware (sem aninhamento na URL); 404 indistinguível entre "não existe" e "não é do seu grupo".
- Q: Padrão de apresentação do formulário (criar/editar)? → A: Modal overlay sobre a listagem — sem rota dedicada; salvar atualiza a linha in-place ao fundo; cancelar/clicar fora fecha sem persistir.
- Q: Estratégia de atualização da UI ao salvar/excluir? → A: Otimista — UI atualiza imediatamente ao confirmar; se a API falhar, frontend reverte ao snapshot anterior e mostra toast de erro.
- Q: Entrada e exibição do valor monetário? → A: Máscara monetária BR estilo Nubank (digitação acumula centavos da direita); armazenado e trafegado como inteiro de centavos; exibição formatada via locale pt-BR.

## Assumptions

- A moeda única do app é o Real Brasileiro (R$ / BRL), conforme assunção global definida no roadmap (spec 003) — multi-moeda está fora de escopo.
- O fuso horário padrão de interpretação de datas é America/Sao_Paulo; o app não precisa lidar com membros em fusos diferentes nesta feature.
- O usuário sempre estará autenticado e pertencendo a um grupo familiar ao acessar esta feature — o fluxo de onboarding (feature 004) garante isso antes de qualquer tela do app ficar acessível.
- A exclusão de despesa é definitiva (hard-delete) — não há lixeira, soft-delete ou trilha de auditoria nesta feature. Histórico/auditoria, se necessário, será uma feature futura.
- Edição não mantém histórico de versões anteriores — apenas o estado atual da despesa é persistido.
- Despesas em valor negativo (reembolsos, estornos) NÃO são suportadas — o usuário deve excluir ou ajustar o registro original. Tracking de receita está fora do escopo do produto.
- A listagem desta feature é simples: ordenação fixa por data decrescente, sem filtros, com paginação por cursor (infinite scroll, 50 itens por página). Filtragem avançada (por membro, categoria, intervalo de datas, cartão específico) é a feature 011.
- O campo de categoria, embora previsto no roadmap como "opcional", NÃO está exposto nesta feature — categorias serão estruturadas na feature 007 e o picker será adicionado lá. Despesas registradas antes da 007 ficarão sem categoria até serem editadas.
- A seleção de cartão de crédito específico (Nubank, Itaú, etc.) NÃO está exposta nesta feature — apenas o tipo "cartão de crédito" genérico. Cartões nomeados são responsabilidade da feature 016.
- A feature depende exclusivamente da infraestrutura de autenticação e grupos familiares já entregue na feature 004 e do shell de layout entregue na feature 005.
