# Feature Specification: Categorias de Despesas

**Feature Branch**: `007-expense-categories`

**Created**: 2026-06-08

**Status**: Draft

**Input**: Roadmap feature #006 — "Define and manage a two-level category hierarchy: root categories (e.g., Food, Housing) and sub-categories under each root (e.g., Food → Groceries, Restaurants). Categories are shared across the family group and used to group and analyze spending."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Criar a Árvore de Categorias da Família (Priority: P1)

Um membro do grupo familiar abre a tela de categorias e cadastra as categorias raiz que descrevem como a família organiza seus gastos (ex.: "Alimentação", "Moradia", "Transporte") e, sob cada raiz, as sub-categorias relevantes (ex.: "Alimentação → Mercado", "Alimentação → Restaurantes"). Após a criação, essas categorias ficam disponíveis para todos os membros do grupo selecionarem ao registrar despesas.

**Why this priority**: Sem categorias cadastradas o grupo familiar não tem vocabulário algum para classificar despesas — todos os recursos a jusante (orçamentos por categoria, dashboard, analytics) dependem dessa estrutura existir. Essa é a fundação da feature.

**Independent Test**: Um usuário autenticado e com grupo abre a tela `/categorias`, cria 3 categorias raiz e 2 sub-categorias sob uma delas. Ao reabrir a tela (mesma sessão ou outro membro), as 5 categorias aparecem listadas na hierarquia correta.

**Acceptance Scenarios**:

1. **Given** o usuário autenticado está em um grupo familiar sem categorias cadastradas, **When** ele abre a tela `/categorias`, **Then** o sistema exibe um estado vazio com instrução clara para criar a primeira categoria raiz.
2. **Given** o usuário está na tela de categorias, **When** ele cria uma categoria raiz informando apenas um nome válido (ex.: "Alimentação"), **Then** a categoria é persistida no grupo do usuário e aparece imediatamente na listagem.
3. **Given** uma categoria raiz "Alimentação" já existe, **When** o usuário cria uma sub-categoria "Mercado" sob ela, **Then** "Mercado" aparece aninhada visualmente sob "Alimentação".
4. **Given** outro membro do mesmo grupo familiar cadastrou categorias, **When** um segundo membro abre a tela de categorias, **Then** ele vê exatamente as mesmas categorias (compartilhadas no grupo).
5. **Given** o usuário tenta criar uma categoria com nome em branco, duplicado no mesmo escopo, ou com mais de 60 caracteres, **Then** o sistema rejeita o envio e exibe a mensagem de erro inline.

---

### User Story 2 - Classificar uma Despesa por Categoria (Priority: P1)

Ao registrar ou editar uma despesa, o usuário seleciona opcionalmente uma categoria raiz e (também opcionalmente) uma sub-categoria sob essa raiz. A classificação é salva junto com a despesa e aparece na listagem como uma etiqueta visual, permitindo que o usuário confirme que a despesa foi categorizada corretamente.

**Why this priority**: Categorias só geram valor quando aplicadas às despesas. Sem essa integração com o formulário e a listagem da feature 006, as categorias seriam dados isolados sem efeito sobre o produto. Esta é a entrega de valor que destrava todos os recursos futuros que se apoiam em categoria (orçamentos por categoria, dashboard, analytics).

**Independent Test**: Após criar pelo menos uma categoria raiz e uma sub-categoria (US1), o usuário abre o modal de "Nova despesa", seleciona a categoria raiz, opcionalmente seleciona a sub-categoria, preenche os demais campos e salva. A linha da despesa na listagem mostra a categoria atribuída como uma etiqueta visível.

**Acceptance Scenarios**:

1. **Given** o grupo possui ao menos uma categoria raiz e o usuário está criando uma nova despesa, **When** ele abre o seletor de categoria no formulário, **Then** o sistema lista todas as categorias raiz do grupo em ordem alfabética PT-BR.
2. **Given** o usuário selecionou uma categoria raiz que possui sub-categorias, **When** o seletor de sub-categoria é renderizado, **Then** somente as sub-categorias dessa raiz são exibidas; a sub-categoria permanece opcional (pode ser deixada em branco).
3. **Given** o usuário deixa o seletor de categoria em branco e salva, **When** a despesa é persistida, **Then** ela é salva como **sem categoria** (campo nulo) — sem erro de validação, comportamento idêntico ao já estabelecido na feature 006 (categoria opcional).
4. **Given** uma despesa foi salva com categoria "Alimentação → Mercado", **When** qualquer membro do grupo abre a listagem de despesas, **Then** essa linha exibe uma etiqueta "Alimentação · Mercado" (ou equivalente visual) ao lado dos campos já existentes.
5. **Given** o usuário edita uma despesa existente sem categoria, **When** ele seleciona uma categoria no modal de edição e salva, **Then** a etiqueta de categoria aparece na linha após salvar; quando ele edita uma despesa com categoria e deixa o seletor em branco, a etiqueta desaparece após salvar.

---

### User Story 3 - Reorganizar Categorias Existentes (Priority: P2)

Um membro do grupo identifica que uma categoria foi nomeada incorretamente, está duplicada com outro nome ou não é mais útil. Ele renomeia, move uma sub-categoria para outra raiz ou exclui a categoria — entendendo de forma clara o que acontece com as despesas já classificadas antes de confirmar a ação.

**Why this priority**: Permite manter a árvore de categorias coerente ao longo do tempo. Importante para o uso prolongado do app, mas não bloqueia o uso inicial — o grupo pode operar por semanas com uma árvore subótima sem perder valor.

**Independent Test**: Após criar pelo menos uma categoria raiz com sub-categoria e atribuir essa categoria a pelo menos uma despesa (US1+US2), o usuário (a) renomeia a raiz e a alteração reflete na etiqueta da despesa na listagem; (b) move uma sub-categoria para outra raiz e a despesa associada passa a exibir o novo caminho; (c) exclui uma sub-categoria e a despesa que a usava passa a exibir apenas a raiz.

**Acceptance Scenarios**:

1. **Given** uma categoria existente, **When** qualquer membro do grupo a renomeia para um nome válido e não duplicado, **Then** o novo nome é persistido e refletido em todas as despesas previamente classificadas com ela (sem reescrever os registros — a despesa referencia a categoria por identificador).
2. **Given** uma sub-categoria sob a raiz "Alimentação", **When** o usuário a move para a raiz "Lazer", **Then** a relação de parentesco é atualizada; despesas que apontavam para essa sub-categoria continuam apontando para o mesmo registro de sub-categoria, agora com novo caminho hierárquico.
3. **Given** uma sub-categoria que está sendo usada por N despesas (N > 0), **When** o usuário inicia a exclusão, **Then** o sistema exibe um modal **bloqueante** informando que existem N despesas vinculadas e que a exclusão não é permitida enquanto elas existirem; o usuário só pode fechar o modal (botão único `OK`) — sem botão de confirmação destrutiva — e precisa primeiro editar ou excluir essas despesas (ou remover a sub-categoria de cada uma) para então retornar e excluir a sub-categoria.
4. **Given** uma categoria raiz que possui sub-categorias E/OU despesas vinculadas (a ela ou às suas sub-categorias), **When** o usuário inicia a exclusão, **Then** o modal **bloqueante** informa exatamente quantas sub-categorias e quantas despesas ainda referenciam essa árvore; o usuário só pode fechar o modal (botão único `OK`) e precisa esvaziar a árvore "de baixo para cima" antes de poder excluir a raiz.
5. **Given** uma categoria sem sub-categorias e sem despesas vinculadas, **When** o usuário inicia a exclusão, **Then** o modal exibe a confirmação destrutiva padrão (Cancelar com foco padrão; Excluir destacado como destrutivo) e, após confirmar, a categoria é removida.
6. **Given** o usuário cancela qualquer operação destrutiva (Esc, clique fora, botão Cancelar/OK), **Then** nenhuma alteração é persistida e o estado original da árvore permanece.

---

### Edge Cases

- **Duplicidade de nome no mesmo escopo**: Não permitida — dois irmãos (duas raízes do mesmo grupo, OU duas sub-categorias sob a mesma raiz) não podem ter o mesmo nome após normalização (trim + lowercase + colapso de espaços internos). Duas raízes diferentes PODEM ter sub-categorias com o mesmo nome (ex.: "Alimentação → Outros" e "Lazer → Outros" coexistem).
- **Nome vazio, apenas espaços ou excessivamente longo**: Rejeitado — nome deve ter 1–60 caracteres significativos após trim.
- **Categoria deletada referenciada por despesa em edição concorrente**: Cenário fica raro com a regra de bloqueio simétrico (FR-013) — o DELETE só passa quando NENHUMA despesa referencia a categoria. Mas existe uma janela mínima: usuário A acabou de abrir o modal de cadastro de despesa com a categoria X selecionada (ainda não submeteu) enquanto usuário B deleta X (que naquele momento não tem nenhuma despesa vinculada). Quando A submete, a tentativa de `INSERT`/`UPDATE` de despesa com `categoryId = X` viola a FK do banco e o backend trata isso como exclusão concorrente da categoria: salva a despesa SEM categoria (campo nulo) e a resposta inclui `warnings: ["category.removed_concurrently"]` para o frontend exibir um toast informativo ("A categoria selecionada foi removida; a despesa foi salva sem categoria.").
- **Tentar mover categoria raiz para virar sub-categoria (ou sub para virar raiz)**: NÃO suportado nesta feature — uma categoria nasce como raiz ou sub e mantém esse papel; mover entre níveis exige excluir e recriar. Documentado como limitação no Assumptions.
- **Profundidade além de dois níveis**: Não suportado — não é possível criar sub-sub-categorias. O seletor de "categoria pai" ao criar uma nova categoria mostra apenas raízes; sub-categorias não podem ser pais.
- **Cor / ícone / emoji**: Fora de escopo nesta feature — apenas o nome textual. Personalização visual avançada PODE ser adicionada por feature futura sem afetar o schema.
- **Pré-popular categorias-padrão ao criar grupo**: Não — todo grupo começa com a árvore vazia. O usuário cria as categorias que fazem sentido para a família. Reduz superfície de decisão de produto e mantém PT-BR autêntico ao vocabulário familiar.
- **Membro removido criou a categoria**: A categoria pertence ao grupo, não ao membro; permanece intacta após remoção do membro.
- **Nome após normalização case-insensitive**: "Alimentação" e "alimentação" são considerados o mesmo nome para duplicidade; preservamos o casing exato digitado pelo usuário na primeira criação (não normalizamos a exibição).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema DEVE permitir que qualquer usuário autenticado e pertencente a um grupo familiar gerencie (criar, listar, editar, excluir) categorias para o seu grupo. Todos os membros têm os mesmos direitos sobre toda a árvore — não há distinção entre criador e demais membros.
- **FR-002**: As categorias DEVEM formar uma hierarquia de exatamente dois níveis: **categoria raiz** (sem pai) e **sub-categoria** (com exatamente um pai, que DEVE ser uma categoria raiz). Sub-sub-categorias NÃO são permitidas.
- **FR-003**: Toda categoria DEVE pertencer a um único grupo familiar (`groupId` derivado do usuário autenticado, idêntico ao padrão estabelecido em FR-019 da feature 006). Categorias NÃO são compartilhadas entre grupos. Toda requisição a `/api/v1/categories/:id` DEVE retornar 404 se a categoria não pertencer ao grupo do usuário autenticado.
- **FR-004**: Toda categoria DEVE ter um `name` obrigatório de 1 a 60 caracteres significativos após `trim()`. O sistema DEVE rejeitar nomes em branco, apenas espaços, ou que excedam 60 caracteres após normalização.
- **FR-005**: O sistema DEVE rejeitar a criação ou renomeação de uma categoria cujo nome (após normalização — trim, lowercase PT-BR, colapso de espaços internos) já exista em outra categoria do mesmo grupo no mesmo escopo de parentesco:
  - Duas categorias raiz do mesmo grupo não podem ter nomes iguais;
  - Duas sub-categorias sob a mesma raiz não podem ter nomes iguais;
  - Uma raiz e uma sub-categoria PODEM ter nomes iguais (escopos diferentes);
  - Duas sub-categorias sob raízes diferentes PODEM ter nomes iguais.
- **FR-006**: A tela `/categorias` DEVE ser acessível a qualquer membro autenticado do grupo. Ela DEVE exibir todas as categorias do grupo agrupadas por raiz, em ordem alfabética PT-BR (locale `pt-BR`, comparação case-insensitive), com as sub-categorias listadas em ordem alfabética sob cada raiz. NÃO há ordenação manual nesta feature (sem drag-and-drop, sem `sortOrder`).
- **FR-007**: O formulário de despesa (feature 006) DEVE ser estendido com dois campos opcionais lado a lado ou em sequência: **Categoria raiz** (seletor que lista todas as raízes do grupo em ordem alfabética PT-BR) e **Sub-categoria** (seletor que lista apenas as sub-categorias da raiz atualmente selecionada). Se nenhuma raiz for selecionada, o seletor de sub-categoria DEVE estar desabilitado e vazio. Ambos os seletores DEVEM oferecer a opção "(sem categoria)" / limpar a seleção.
- **FR-008**: O sistema DEVE permitir salvar uma despesa sem categoria alguma, mantendo o comportamento estabelecido pela feature 006 (categoria opcional). Salvar uma despesa com apenas a categoria raiz selecionada (sem sub-categoria) DEVE ser permitido. Salvar uma despesa com sub-categoria sem raiz NÃO é possível (a UI desabilita o seletor de sub-categoria nesse estado). Mapeamento da seleção de UI para o payload enviado ao backend (single-column design):
  - Nada selecionado → `categoryId: null`.
  - Apenas raiz selecionada → `categoryId: <root.id>`.
  - Raiz + sub-categoria selecionadas → `categoryId: <subCategory.id>` (a raiz é inferida server-side via `parentId` da sub).
  - O backend NÃO aceita `subCategoryId` no body; a hierarquia é estrutural (Key Entities → Despesa).
- **FR-009**: A listagem de despesas (feature 006) DEVE exibir, em cada linha onde a despesa tem categoria atribuída, uma etiqueta textual no formato `"<raiz>"` (quando há apenas raiz) ou `"<raiz> · <sub-categoria>"` (quando há ambos), posicionada de forma que não desloque os 5 campos essenciais já existentes (data, descrição, valor, responsável, método). A etiqueta NÃO é exibida quando a despesa está sem categoria.
- **FR-010**: O sistema DEVE oferecer os seguintes endpoints REST sob o prefixo `/api/v1/categories` (recurso plano, alinhado a FR-019 da feature 006 — `groupId` derivado do cookie de sessão; nunca aceito como parâmetro):
  - `POST /api/v1/categories` — criar categoria raiz ou sub-categoria;
  - `GET /api/v1/categories` — listar **todas** as categorias do grupo do usuário em uma única resposta (sem paginação — é viável dado o tamanho esperado de até ~50 categorias por grupo, ver SC-006);
  - `PATCH /api/v1/categories/:id` — renomear e/ou mover (mudar `parentId`) — semântica full-body como em FR-023 da feature 006;
  - `DELETE /api/v1/categories/:id` — excluir.
- **FR-011**: O endpoint `POST /api/v1/categories` DEVE aceitar `{ name: string, parentId: string | null }` validado por Zod no boundary. `parentId === null` cria uma raiz; `parentId !== null` cria uma sub-categoria — o backend DEVE validar que o `parentId` referencia uma categoria raiz do mesmo grupo do usuário (não uma sub-categoria, não uma raiz de outro grupo, não uma categoria inexistente). Caso contrário retorna 422 com `fieldErrors` para `parentId`.
- **FR-012**: O endpoint `PATCH /api/v1/categories/:id` DEVE aceitar atualizações de `name` e/ou `parentId` (semântica full-body — envia o estado completo desejado da categoria). Restrições:
  - Uma categoria raiz NÃO pode ser transformada em sub-categoria (não pode receber `parentId !== null`); uma sub-categoria NÃO pode ser transformada em raiz (não pode receber `parentId === null`). Tentativa retorna 422 com `fieldErrors` para `parentId` e código `category.role_immutable`.
  - Uma sub-categoria PODE ser movida para outra raiz **do mesmo grupo** (alterando `parentId` para outra raiz válida do grupo).
- **FR-013**: O endpoint `DELETE /api/v1/categories/:id` DEVE aplicar **bloqueio simétrico** por integridade referencial — uma categoria SÓ pode ser excluída quando NENHUMA outra entidade ainda a referencia. Regras detalhadas:
  - Para uma **sub-categoria**: só pode ser excluída se nenhuma despesa tem `categoryId` apontando para ela.
  - Para uma **categoria raiz**: só pode ser excluída se (a) nenhuma sub-categoria tem `parentId` apontando para ela E (b) nenhuma despesa tem `categoryId` apontando para ela diretamente nem para qualquer sub-categoria dela.
  - Garantia de integridade no banco via foreign keys com `ON DELETE RESTRICT`:
    - `Category.parentId` → `Category(id)` `ON DELETE RESTRICT`
    - `Expense.categoryId` → `Category(id)` `ON DELETE RESTRICT` (FK única, sob single-column design da Key Entities → Despesa; cobre tanto referências a raízes quanto a sub-categorias)
  - Resposta do endpoint:
    - **Sucesso** (sem referências): HTTP `204 No Content`. Nenhum corpo.
    - **Bloqueado** (qualquer referência existente): HTTP `409 Conflict` com `{ code: "category.has_dependencies", message: <texto PT-BR>, blockers: { subCategoriesCount: number, affectedExpensesCount: number } }`. NENHUMA alteração no banco. Como a despesa tem FK única `categoryId` (single-column design), o cálculo de `affectedExpensesCount` é:
      - Para uma **sub-categoria**: `COUNT(*) FROM Expense WHERE categoryId = :id`.
      - Para uma **raiz**: `COUNT(*) FROM Expense WHERE categoryId = :id OR categoryId IN (SELECT id FROM Category WHERE parentId = :id)` — soma despesas classificadas a nível de raiz e despesas classificadas em qualquer sub-categoria dela.
  - Race entre delete-preview e delete: se um membro deleta a última despesa entre a abertura do modal e o clique em "Excluir", o `DELETE` deve passar (o estado mais recente é o que conta). Inversamente, se outro membro adiciona uma despesa nesse mesmo intervalo, o `DELETE` retorna 409 e o frontend mostra mensagem atualizada.
  - Esta regra elimina a possibilidade de despesa órfã (referenciando categoria inexistente) — garantia estrutural do schema, não dependente de transação aplicacional. Inconsistência hierárquica entre raiz e sub-categoria de uma despesa é impossível por design (single-column, ver Key Entities → Despesa).
- **FR-014**: Antes de exibir o modal de confirmação de exclusão, o frontend DEVE consultar `GET /api/v1/categories/:id/delete-preview` (somente leitura, retorna `{ subCategoriesCount: number, affectedExpensesCount: number }`) e usar o resultado para escolher entre dois modos de modal:
  - **Modal destrutivo padrão** (quando `subCategoriesCount === 0` E `affectedExpensesCount === 0`): título "Excluir esta categoria?", corpo "Esta ação não pode ser desfeita.", botões `Cancelar` (foco padrão) e `Excluir` (destacado como destrutivo). Confirmar dispara `DELETE` e remove a linha otimisticamente. Mesmo padrão de FR-026 da feature 006.
  - **Modal bloqueante** (quando `subCategoriesCount > 0` OU `affectedExpensesCount > 0`): título "Não é possível excluir esta categoria", corpo com mensagem explícita em PT-BR listando exatamente quantas sub-categorias e/ou despesas ainda referenciam a árvore — exemplo: "Esta categoria ainda possui **3 sub-categorias** e **12 despesas vinculadas**. Reorganize esses registros antes de excluí-la." Botão único `OK` que fecha o modal. NÃO há botão de "Forçar exclusão" / "Excluir mesmo assim". O `DELETE` NÃO é disparado.
  - O `GET /delete-preview` cobre o caso esperado mas NÃO substitui a checagem do backend: se uma race entre preview e delete fizer o `DELETE` chegar com dependências, o backend ainda retorna 409 (FR-013) e o frontend renderiza um toast de erro com a mesma mensagem de bloqueio.
- **FR-015**: O endpoint `POST /api/v1/categories` DEVE suportar idempotência via header `Idempotency-Key: <uuid v4>`, com a mesma semântica definida em FR-024 da feature 006 (mesma tabela de idempotência, TTL 24h, mesma matriz de respostas: nova chave → 201; chave repetida do mesmo usuário **+ mesmo `resourceType`** → 200 com a categoria original; chave de outro usuário → 409 `idempotency.conflict`; chave do mesmo usuário **mas usada antes para outro `resourceType`** (ex.: chave já gravada para `EXPENSE`) → 409 `idempotency.cross_resource_conflict`. A UI DEVE gerar uma nova chave por tentativa de submit do formulário de criação de categoria.
- **FR-016**: Toda resposta de erro de validação (4xx) DEVE seguir o envelope flat `{ code, message, fieldErrors? }` já estabelecido em FR-010 da feature 006. Códigos de erro específicos desta feature: `category.duplicate_name`, `category.role_immutable`, `category.parent_invalid`, `category.parent_not_root`, `category.not_found`, `category.has_dependencies`, `idempotency.conflict` (chave reutilizada por outro usuário), `idempotency.cross_resource_conflict` (chave já usada pelo mesmo usuário para outro `resourceType`, ex.: tentar reutilizar uma chave EXPENSE em uma criação de CATEGORY). `fieldErrors` é preenchido em erros de validação (status 400/422) com uma entrada por campo (`name`, `parentId`); `blockers` é preenchido apenas em `category.has_dependencies` (409).
- **FR-017**: O frontend DEVE usar atualização otimista da UI para criar, renomear, mover e excluir categorias (mesmo padrão de FR-021 da feature 006): a árvore reflete imediatamente a mudança; em falha, faz rollback ao snapshot anterior e exibe toast de erro. Para deleção, a remoção otimista cobre tanto a linha da categoria quanto a remoção visual da etiqueta nas despesas afetadas atualmente carregadas em memória.
- **FR-018**: Quando uma categoria selecionada no formulário de despesa for excluída por outro membro durante a edição (cenário concorrente), o backend DEVE tratar a `categoryId` referenciada-mas-inexistente como nula no momento do `POST` ou `PATCH` da despesa — a despesa é salva sem categoria e a resposta inclui um aviso `warnings: ["category.removed_concurrently"]` para o frontend exibir um toast informativo ("A categoria selecionada foi removida; a despesa foi salva sem categoria."). O mecanismo: a tentativa de `INSERT`/`UPDATE` com `categoryId` órfã viola a FK `Expense.categoryId → Category(id)`; o use case captura o erro, faz retry da escrita com `categoryId = null` e anexa o warning à resposta.
- **FR-019**: A renomeação de uma categoria (PATCH) NÃO altera os identificadores das despesas que a referenciam; as despesas continuam apontando para a mesma `categoryId` e passam a exibir o novo nome após o próximo carregamento da listagem (resolução server-side via JOIN, ver FR-026). O backend NÃO precisa atualizar registros de despesa em massa.
- **FR-020**: A interface desta feature DEVE estar inteiramente em Português do Brasil (PT-BR). A ordenação alfabética DEVE usar comparação localizada (`pt-BR`, case-insensitive, sensível a acentos — "Águas" vem depois de "Alimentação" e antes de "Alvenaria"), garantindo previsibilidade na lista.
- **FR-021**: O item de navegação "Categorias" (já presente no shell entregue pela feature 005 com status `coming-soon` e rota `/categorias`) DEVE passar a status `active` e ficar funcional — o usuário clicando nele chega à tela de gerenciamento de categorias.
- **FR-022**: As ações de **criar** e **editar** categoria DEVEM ser apresentadas como modal overlay sobre a tela `/categorias` — não como rota dedicada nem como edição inline na árvore. Padrão idêntico ao estabelecido em FR-020 da feature 006:
  - Botão `"+ Nova categoria"` no topo da tela abre o modal **vazio**; o usuário escolhe o `nome` e, opcionalmente, uma **categoria pai** (seletor que lista apenas as raízes do grupo — deixar em branco cria uma nova raiz, selecionar uma raiz cria uma sub-categoria sob ela).
  - Ícone de editar em cada linha da árvore abre o **mesmo modal**, pré-preenchido com o `nome` e o `parentId` atuais da categoria. O seletor de pai permanece desabilitado para categorias raiz e habilitado (com opções restritas às outras raízes do grupo) para sub-categorias — refletindo a regra de FR-012 (raiz ↔ sub não se converte; sub pode mover entre raízes).
  - Clicar fora do modal, pressionar `Esc` ou clicar `Cancelar` fecha sem persistir; salvar persiste e fecha o modal, refletindo a inserção ou atualização in-place na árvore ao fundo (sem recarregar a tela inteira). O comportamento otimista de FR-017 aplica-se.
- **FR-023**: O formulário de despesa (modal da feature 006) NÃO DEVE oferecer criação de categoria on-the-fly — sem link "+ Nova categoria" dentro do seletor, sem modal-over-modal e sem formulário inline expansível. Se a categoria desejada ainda não existe, o usuário fecha o modal de despesa, acessa `Categorias` pela navegação lateral, cria a categoria e retorna ao formulário de despesa. Justificativa: evita stacking de modais e contenção de foco aninhada (problemática para WCAG 2.1 AA herdado da feature 005), mantém o fluxo de cadastro de despesa previsível e alinha-se ao princípio de Simplicidade da constituição. Esta decisão preserva o seletor de FR-007 como um picker puro, sem responsabilidades de criação.
- **FR-024**: Em edição concorrente de uma mesma categoria por dois membros do grupo (dois `PATCH /api/v1/categories/:id` quase simultâneos), o sistema DEVE aplicar **last-write-wins** — herda a mesma postura estabelecida em FR-017 da feature 006: a última operação vence sem aviso ao primeiro escritor. O backend NÃO DEVE manter coluna de versão, NÃO DEVE emitir HTTP 409 para conflito de PATCH e NÃO DEVE serializar via lock pessimista. A UI NÃO precisa lidar com recarregamento forçado. Esta decisão se aplica a renomeação E a movimentação (mudança de `parentId`) de sub-categorias.
- **FR-025**: Quando o grupo ainda não possui categoria alguma cadastrada (estado inicial garantido para todo grupo novo, conforme Assumptions), o formulário de despesa (modal da feature 006) DEVE comportar-se assim:
  - Os campos **Categoria raiz** e **Sub-categoria** definidos em FR-007 PERMANECEM visíveis no modal — sem reorganização condicional do layout entre o primeiro e os próximos registros.
  - O seletor de **Categoria raiz** DEVE estar habilitado e apresentar apenas a opção `(sem categoria)` (já selecionada por padrão). O seletor de **Sub-categoria** DEVE permanecer desabilitado e vazio enquanto nenhuma raiz estiver selecionada (conforme FR-007).
  - Imediatamente abaixo dos campos de categoria, uma **dica textual discreta** DEVE ser exibida com o conteúdo "Cadastre categorias em" seguido de um link "Categorias" que navega para `/categorias`. A dica NÃO bloqueia o submit do formulário; o usuário pode salvar a despesa sem categoria normalmente, em conformidade com FR-008.
  - A dica DEVE desaparecer automaticamente assim que o grupo possuir ao menos uma categoria raiz cadastrada — não há flag persistente de "dispensar".
- **FR-026**: As respostas paginadas e individuais de despesa (`GET /api/v1/expenses`, `GET /api/v1/expenses/:id`, `POST /api/v1/expenses`, `PATCH /api/v1/expenses/:id`) DEVEM **denormalizar** os dados de categoria no próprio item de despesa, **derivando o caminho hierárquico server-side a partir do único campo `Expense.categoryId`** (single-column design — ver Key Entities → Despesa):
  - **Caso A** — `Expense.categoryId` referencia uma **categoria raiz** (Category com `parentId IS NULL`): `category: { id, name }` é a própria categoria referenciada; `subCategory: null`.
  - **Caso B** — `Expense.categoryId` referencia uma **sub-categoria** (Category com `parentId IS NOT NULL`): `subCategory: { id, name }` é a sub-categoria referenciada; `category: { id, name }` é a raiz (pai), resolvida via JOIN no `parentId`.
  - **Caso C** — `Expense.categoryId IS NULL`: `category: null` e `subCategory: null`.
  - O backend DEVE produzir esses objetos em uma única consulta paginada via `LEFT JOIN` duplo: `LEFT JOIN Category direct ON Expense.categoryId = direct.id LEFT JOIN Category root ON direct.parentId = root.id`. Sem N+1, sem join client-side.
  - O frontend SEMPRE consome `category` e `subCategory` da resposta — nunca precisa inspecionar `Expense.categoryId` diretamente para decidir o que renderizar. Isso isola o frontend de detalhes do schema.
  - Quando uma categoria for renomeada (PATCH), a próxima resposta de despesa traz o nome novo automaticamente — comportamento esperado por FR-019.
- **FR-027**: A resposta de `GET /api/v1/categories` DEVE ser uma **lista plana** (`Category[]`), onde cada item tem o shape `{ id: string, name: string, parentId: string | null, createdAt: string, updatedAt: string }`. A resposta NÃO DEVE aninhar sub-categorias dentro de raízes (sem `children`), NÃO DEVE incluir uma versão paralela em árvore, e NÃO DEVE incluir contadores agregados (contagem de despesas, etc.) — esses são obtidos sob demanda via `GET /api/v1/categories/:id/delete-preview` (FR-014). A ordenação default do backend DEVE ser `ORDER BY name ASC` usando collation `pt-BR` (case-insensitive, sensível a acentos), mas o frontend NÃO DEVE depender dessa ordenação para reconstruir a hierarquia — a relação pai-filho é determinada exclusivamente pelo campo `parentId`. O frontend reconstrói a árvore em memória em O(n) com um `Map<id, Category>`.
- **FR-028**: A regra de unicidade de FR-005 (`(groupId, parentId, normalizedName)` único, com `normalizedName = trim().toLowerCase('pt-BR').replace(/\s+/g, ' ')`) DEVE ser garantida no banco — não na camada de aplicação. Implementação obrigatória:
  - A tabela `Category` DEVE conter uma coluna `normalizedName` declarada como `GENERATED ALWAYS AS (lower(regexp_replace(trim(name), '\s+', ' ', 'g'))) STORED` (collation `pt-BR-x-icu`). A coluna NÃO é exposta na API — é apenas mecanismo interno de enforcement.
  - Um índice único composto DEVE existir em `(groupId, parentId, normalizedName)`. Como `parentId` é nullable, o índice DEVE usar `COALESCE(parentId, '00000000-0000-0000-0000-000000000000')` ou um índice parcial dedicado para o caso `parentId IS NULL` — escolha cabe ao plano, mas a garantia de "duas raízes do mesmo grupo não podem ter nomes normalizados iguais" é obrigatória no banco.
  - O use case de `POST` e `PATCH` de categoria NÃO DEVE pré-verificar a existência de duplicata via `SELECT`; em vez disso, DEVE tentar a operação direto e capturar o erro de violação de unicidade do Postgres (SQLSTATE `23505`) traduzindo para a resposta HTTP 422 `{ code: "category.duplicate_name", message, fieldErrors: [{ field: "name", code: "category.duplicate_name", message }] }`, conforme FR-016. Essa abordagem é race-safe e elimina TOCTOU sob requisições concorrentes.

### Key Entities

- **Categoria (Category)**: Rótulo nomeado usado para agrupar despesas de um grupo familiar. Atributos: identificador (UUID/CUID), grupo familiar (`groupId`), nome (`name`, 1–60 caracteres), pai (`parentId`, nullable — `null` indica raiz; valor referencia outra Categoria do mesmo grupo cujo `parentId` é nulo), timestamps (`createdAt`, `updatedAt`). Restrição de unicidade: `(groupId, parentId, normalizedName)` é único — onde `normalizedName = trim().toLowerCase('pt-BR').replace(/\s+/g, ' ')`.
- **Categoria Raiz vs Sub-categoria**: A distinção é estrutural, não um campo separado — uma categoria com `parentId === null` é raiz; com `parentId !== null` é sub-categoria. Uma sub-categoria nunca pode ter filhos (validação no `POST`/`PATCH` baseada no estado de seu pai).
- **Despesa (Expense)**: Entidade já existente (feature 006). Estendida com **um único** novo campo opcional: `categoryId` (nullable, FK para `Category(id)`) — pode referenciar tanto uma categoria raiz (Category com `parentId IS NULL`) quanto uma sub-categoria (Category com `parentId IS NOT NULL`). O "caminho hierárquico" da classificação (raiz → sub) é derivado server-side em tempo de leitura via `JOIN` no `parentId` da categoria referenciada — NÃO é armazenado como dois campos separados. Quando `categoryId` é nulo, a despesa está sem categoria. **Não há campo `subCategoryId`**; consistência hierárquica é estrutural por design (não há dois campos para manter em sincronia, não há janela para mismatch).
- **Grupo Familiar (FamilyGroup)**: Entidade já existente (feature 004) — todo grupo possui seu próprio conjunto independente de categorias.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Um novo grupo familiar consegue criar sua árvore inicial de categorias (cerca de 5–10 raízes e 10–20 sub-categorias) em menos de 5 minutos de uso da tela de categorias.
- **SC-002**: 100% das categorias criadas por qualquer membro ficam imediatamente disponíveis no formulário de despesa para todos os membros do mesmo grupo.
- **SC-003**: A árvore de categorias é compartilhada de forma íntegra: 0% de divergência entre o que um membro vê na tela de categorias e o que outro membro do mesmo grupo vê no mesmo momento (após sincronização da listagem).
- **SC-004**: Tentativas de criar categorias com nome inválido (vazio, > 60 chars) ou duplicado no mesmo escopo são bloqueadas em 100% dos casos antes de tocar o armazenamento.
- **SC-005**: Em uma despesa com categoria atribuída, o usuário consegue identificar visualmente a categoria na listagem em menos de 1 segundo após a tela carregar (etiqueta visível sem necessidade de hover ou clique).
- **SC-006**: O grupo suporta confortavelmente até 50 categorias totais (somando raízes + sub-categorias) sem degradação perceptível de tempo de carregamento da tela de categorias ou do formulário de despesa — alvo de até 1 segundo para popular ambos.
- **SC-007**: Integridade referencial é garantida pelo schema do banco — 0 ocorrências de despesa órfã (referenciando categoria inexistente) e 0 ocorrências de sub-categoria órfã (com `parentId` inválido). Inconsistência hierárquica entre categoria raiz e sub-categoria atribuídas a uma despesa é **impossível por design** (single-column design — Expense tem um único FK `categoryId`, nunca pode haver mismatch entre dois campos). Toda tentativa de DELETE que violaria essa integridade é rejeitada em 100% dos casos por FK `ON DELETE RESTRICT`, com erro 409 e mensagem clara ao usuário (FR-013/FR-014).

## Clarifications

### Session 2026-06-08

- Q: Padrão de apresentação para criar e editar categorias na tela `/categorias`? → A: Modal overlay sobre a árvore (mesmo padrão do formulário de despesa em FR-020 da feature 006); seletor de "categoria pai" no modal — em branco cria raiz, raiz selecionada cria sub-categoria. Sem rota dedicada e sem edição inline na árvore.
- Q: Criação de categoria diretamente do formulário de despesa (modal-over-modal ou inline expansível)? → A: Não suportado — sem criação on-the-fly; o usuário sai do modal de despesa, vai a `/categorias` pela navegação lateral, cria e volta. Evita stacking de modais e contenção de foco aninhada (WCAG 2.1 AA).
- Q: Semântica de edição concorrente (PATCH simultâneo) na mesma categoria por dois membros? → A: Last-write-wins, sem coluna de versão e sem 409 — herda FR-017 da feature 006. Aplica-se a renomeação e a movimentação de sub-categoria entre raízes.
- Q: Estado vazio do seletor de categoria no formulário de despesa quando o grupo ainda não tem categorias? → A: Seletor sempre visível com apenas `(sem categoria)` + dica discreta abaixo dos campos linkando para `/categorias`. Layout do formulário não reorganiza; submit não é bloqueado; dica some assim que existir ≥ 1 categoria raiz.

### Session 2026-06-08 (backend)

- Q: Shape da resposta do `GET /api/v1/expenses` para entregar o nome da categoria à listagem? → A: Denormalização embutida no item — `category: { id, name } | null` e `subCategory: { id, name } | null` resolvidos por LEFT JOIN server-side; sem sidecar dictionary, sem fetch separado, sem join client-side.
- Q: Shape da resposta do `GET /api/v1/categories`? → A: Lista plana `Category[]` com `{ id, name, parentId, createdAt, updatedAt }`; sem `children` aninhado, sem árvore paralela, sem agregados; frontend reconstrói a árvore em O(n) via `parentId`. Ordenação backend `ORDER BY name ASC` collation `pt-BR`, mas estrutura pai-filho não depende dessa ordem.
- Q: Estratégia de execução do `DELETE /api/v1/categories/:id` quando há sub-categorias ou despesas vinculadas? → A: **Bloqueio simétrico via FK `ON DELETE RESTRICT`** em `Category.parentId` e em `Expense.categoryId` (FK única, single-column design — ver Q5 abaixo). Sem cascade (DB nem aplicação), sem nullificação implícita: backend retorna 409 com `{ blockers: { subCategoriesCount, affectedExpensesCount } }` quando há qualquer referência; sucesso 204 só quando não há nenhuma. Frontend consulta `GET /delete-preview` para decidir entre modal destrutivo padrão (sem dependências) ou modal bloqueante (com dependências, botão único OK).
- Q: Enforcement da unicidade `(groupId, parentId, normalizedName)` da FR-005 — onde a regra vive? → A: **Constraint no banco como única autoridade** — coluna `normalizedName` `GENERATED ALWAYS AS … STORED` (collation `pt-BR-x-icu`) + índice único composto. Use case faz INSERT direto e captura SQLSTATE `23505` para responder 422 com `fieldErrors[name]`. Sem pré-check aplicacional (race-safe, evita TOCTOU sob concorrência).
- Q: Garantia de consistência entre categoria raiz e sub-categoria atribuídas a uma despesa? → A: **Single-column design** — `Expense.categoryId` é o único FK e referencia tanto raízes quanto sub-categorias; backend deriva o caminho hierárquico server-side via JOIN no `parentId`. Sem coluna `subCategoryId`, sem validação aplicacional de consistência, sem trigger — inconsistência hierárquica é impossível por design. FR-026 explica o LEFT JOIN duplo que entrega `category` + `subCategory` denormalizados na resposta.

## Assumptions

- **Sem pré-população**: Todo grupo familiar começa com a lista de categorias vazia. Não há seed automático com sugestões. O grupo cria categorias que reflitam o vocabulário real da família. (Decisão informada pelo princípio de Simplicidade da constituição e pela diretriz PT-BR autêntica do roadmap.)
- **Sem personalização visual nesta feature**: Categorias têm apenas `name`. Cor, ícone, emoji, ordem manual (drag-and-drop) e descrição livre ficam fora do escopo. A etiqueta na listagem usa apenas texto e separador visual.
- **Sem migração entre níveis**: Uma categoria raiz não pode virar sub-categoria e vice-versa. Para alterar o papel hierárquico, o usuário deve excluir e recriar — caminho explícito que evita ambiguidades de cascata e idempotência. Mover sub-categorias entre raízes é suportado (FR-012).
- **Sem soft-delete / lixeira / auditoria**: Exclusão é definitiva (hard-delete em transação). Histórico de mudanças, restauração de categorias excluídas e trilha de auditoria ficam fora de escopo — alinhado às mesmas decisões da feature 006 (FR-021 / Assumptions).
- **Sem filtragem por categoria na listagem desta feature**: Filtros (exibir só despesas de "Alimentação", etc.) são responsabilidade da feature 011 (Expense History & Filtering). Esta feature apenas exibe a etiqueta na linha. A tela de despesas continua ordenada por data decrescente como definido em FR-007 da feature 006.
- **Sem analytics nem orçamentos por categoria nesta feature**: Gráficos (feature 009), orçamentos por categoria (feature 007) e dashboard (feature 008) são entregues por features posteriores. Esta feature apenas garante a existência da estrutura de dados e da integração mínima com o registro de despesas, deixando o terreno preparado para essas features.
- **Categorias são compartilhadas no grupo, sem privacidade por membro**: Todos os membros veem todas as categorias e podem editar/excluir qualquer uma — coerente com o modelo plano de permissões estabelecido em FR-006 da feature 006 ("qualquer membro do grupo DEVE poder editar ou excluir qualquer despesa").
- **Duas tabelas separadas vs `parentId` self-reference**: Esta feature usa uma única tabela `Category` com `parentId` nullable (self-reference). Mais simples que duas tabelas (`Category` e `Subcategory`) e suficiente para a hierarquia de dois níveis, com a regra de "sub-categoria não pode ter filhos" garantida na camada de aplicação (validação no POST/PATCH).
- **Limite de profundidade fixo**: Dois níveis é uma decisão de produto explícita do roadmap. Não há flag, configuração ou plano de expandir para hierarquias arbitrárias — features de relatório (008, 009, 013) assumem essa estrutura plana.
- **Dependência prévia satisfeita**: A feature depende exclusivamente da autenticação e grupos familiares já entregues pela feature 004, do shell de layout entregue pela feature 005 (o item "Categorias" passa a `active`) e do schema de despesas entregue pela feature 006 (estendido com um único campo `categoryId` — single-column design, ver Key Entities → Despesa).
