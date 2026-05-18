# Full-Stack Checklist: Autenticação de Usuários e Grupos Familiares

**Purpose**: Auto-revisão pré-PR — valida a qualidade, completude e clareza dos requisitos de backend (API + dados) e frontend (UX + fluxos) antes de qualquer código ser escrito.
**Created**: 2026-05-17
**Feature**: [spec.md](../spec.md) | [plan.md](../plan.md) | [data-model.md](../data-model.md) | [contracts/openapi.yaml](../contracts/openapi.yaml)
**Audiência**: Autor (auto-revisão) | **Escopo**: Full stack | **Depth**: Standard

> **🔒 GATE**: Itens marcados com `[GATE]` são **bloqueantes** — o PR não deve avançar enquanto houver falhas aqui.

---

## 🔒 Segurança — Requisitos [GATE]

- [ ] CHK001 — O algoritmo de hashing de senha e o fator de custo (bcrypt 12) estão especificados nos requisitos ou apenas em `research.md`? Se apenas no research, falta elevar para o spec como requisito formal. [Completeness, Spec §FR-001, research.md Decision 2] `[GATE]`
- [ ] CHK002 — Os atributos do cookie de sessão (`httpOnly`, `SameSite`, `Secure`) estão especificados como requisitos, ou apenas no contrato OpenAPI? Requisitos de segurança de cookie devem estar no spec. [Completeness, contracts/openapi.yaml] `[GATE]`
- [ ] CHK003 — Está explicitamente especificado o que acontece com as sessões ativas quando o usuário redefine a senha? (Ex.: todas as outras sessões são invalidadas ou permanecem?) [Gap, Spec §FR-005, FR-014] `[GATE]`
- [ ] CHK004 — O requisito de que tokens de reset de senha são de uso único está documentado no spec? O `usedAt` existe no data model, mas a regra de negócio precisa estar no spec. [Completeness, Spec §FR-005, data-model.md] `[GATE]`
- [ ] CHK005 — A geração do código de convite é especificada como criptograficamente segura (`crypto.randomBytes`)? Ou apenas "aleatória"? Para um app financeiro, a fonte de entropia deve ser um requisito. [Clarity, research.md Decision 4] `[GATE]`
- [ ] CHK006 — Estão definidos os requisitos para todos os endpoints autenticados rejeitarem requests não autenticados com HTTP 401? O contrato cobre alguns casos, mas o requisito geral está no spec? [Completeness, Spec §FR-009, contracts/openapi.yaml] `[GATE]`
- [ ] CHK007 — Os requisitos de expiração e invalidação do token de reset de senha (1 hora, uso único) estão no spec ou apenas no `research.md`? Decisões de segurança com impacto de negócio devem estar no spec. [Traceability, research.md Decision 3] `[GATE]`
- [ ] CHK008 — O requisito que "nenhuma informação é revelada sobre e-mails cadastrados" na recuperação de senha está capturado formalmente como requisito de segurança? [Completeness, Spec §User Story 4, Acceptance Scenario 3] `[GATE]`

---

## Contrato de API — Completude e Clareza

- [ ] CHK009 — Todos os códigos de erro máquina-legíveis (`code`) estão documentados no OpenAPI? Os exemplos cobrem apenas alguns cenários — há cenários de erro sem `code` definido? [Completeness, contracts/openapi.yaml]
- [ ] CHK010 — As constraints de input estão especificadas no contrato para todos os campos? Ex.: `name` no `POST /groups` tem `maxLength: 100` — está consistente com o `VARCHAR(100)` do data model? [Consistency, contracts/openapi.yaml, data-model.md]
- [ ] CHK011 — O efeito colateral de renovação de sessão no `GET /auth/me` está documentado no contrato OpenAPI de forma que o consumidor da API entenda o comportamento? [Clarity, contracts/openapi.yaml]
- [ ] CHK012 — O contrato define o comportamento do `POST /groups/join` quando o código tem case diferente (ex.: `xkcd4723` vs `XKCD4723`)? O requisito de normalização de case está especificado? [Clarity, Spec §FR-008, contracts/openapi.yaml]
- [ ] CHK013 — A estratégia de versionamento de API (`/api/v1`) está documentada com uma política de mudanças quebrando contrato? O plano menciona bump de versão, mas onde está o requisito formal? [Gap, plan.md]
- [ ] CHK014 — Requisitos de rate limiting para endpoints de auth estão explicitamente excluídos do escopo? Se sim, está documentado como exclusão intencional no spec? [Coverage, Spec §Assumptions]
- [ ] CHK015 — O contrato cobre o cenário de `POST /groups/join` com link completo de URL (não apenas código)? O spec menciona ambos (link e código), mas o contrato só aceita `code`. [Consistency, Spec §FR-008, contracts/openapi.yaml]

---

## Requisitos de UX e Frontend

- [ ] CHK016 — Os requisitos de feedback visual para validação de senha (item a item: comprimento, número, maiúscula) estão especificados com precisão suficiente para design de UI? [Clarity, Spec §FR-001]
- [ ] CHK017 — A tela de onboarding está especificada com as opções disponíveis ao usuário (criar grupo vs. entrar com código) e o fluxo completo de cada opção? [Completeness, Spec §FR-013]
- [ ] CHK018 — Estão definidos requisitos para estados de carregamento durante operações assíncronas (login, cadastro, criar grupo, entrar no grupo)? [Gap]
- [ ] CHK019 — Os requisitos de exibição de erro no formulário são consistentes entre os cenários de validação frontend e os erros retornados pela API (ex.: `INVALID_PASSWORD` → mensagem em PT-BR)? [Consistency, Spec §FR-001, contracts/openapi.yaml]
- [ ] CHK020 — O comportamento do frontend quando o usuário acessa `/join/{código}` sem estar autenticado está especificado? (Deve cadastrar primeiro, depois entrar — fluxo sequencial do Edge Case.) [Coverage, Spec §Edge Cases]
- [ ] CHK021 — O que o usuário vê quando a sessão expira enquanto usa o app está especificado? (Requisito de UX de sessão expirada.) [Gap, Spec §FR-014]
- [ ] CHK022 — O requisito de "copiar convite para clipboard" está especificado com comportamento esperado (feedback visual de cópia, fallback se clipboard API não disponível)? [Completeness, Spec §FR-007]
- [ ] CHK023 — Estão definidos requisitos para o estado da tela de onboarding quando o usuário já pertence a um grupo e tenta acessá-la diretamente? (Redirecionamento para dashboard?) [Edge Case, Spec §FR-013]

---

## Modelo de Dados — Completude e Consistência

- [ ] CHK024 — As regras de cascade delete para as FK relationships estão especificadas? Ex.: ao deletar um `User`, o que acontece com suas `Session`s, `PasswordResetToken`s, e `familyGroupId` dos outros membros? [Completeness, data-model.md]
- [ ] CHK025 — O requisito de que dados históricos de um membro que saiu do grupo permanecem no grupo está documentado no data model com a implicação de que `expenses.userId` pode referenciar um usuário sem `familyGroupId`? [Consistency, Spec §FR-011, data-model.md]
- [ ] CHK026 — O requisito de normalização de email para lowercase está documentado no spec como regra de negócio, ou apenas inferível do data model? [Clarity, data-model.md]
- [ ] CHK027 — O que acontece a um `FamilyGroup` quando todos os seus membros saem (grupo com 0 membros) está especificado? O spec diz que o grupo persiste quando o criador sai, mas não define o estado de grupo vazio. [Gap, Spec §Edge Cases, data-model.md]
- [ ] CHK028 — Os requisitos de índice de banco de dados para lookups de alta frequência (`Session.id`, `Invite.code`) estão documentados ou são deixados como decisão de implementação? [Coverage, data-model.md]

---

## Ciclo de Vida de Sessões e Tokens

- [ ] CHK029 — "A cada uso do app" (renovação de sessão) está definido com precisão? Cada request HTTP conta? Ou apenas operações de leitura/escrita de dados? [Clarity, Spec §FR-014]
- [ ] CHK030 — O número máximo de `PasswordResetToken`s pendentes que um usuário pode ter simultaneamente está especificado? Ou qualquer quantidade é permitida? [Completeness, data-model.md]
- [ ] CHK031 — O spec ou research.md define qual token de reset é válido quando há múltiplos pendentes para o mesmo usuário? [Clarity, data-model.md, research.md Decision 3]
- [ ] CHK032 — Os requisitos de sessão simultânea (múltiplos dispositivos) estão especificados com comportamento claro? O Edge Case menciona que são permitidas, mas há limite máximo de sessões por usuário? [Completeness, Spec §Edge Cases]

---

## Cobertura de Edge Cases e Fluxos de Exceção

- [ ] CHK033 — O fluxo completo de um novo usuário que acessa link de convite antes de ter conta está especificado passo a passo? (Cadastro → redirect automático para join → entrar no grupo.) [Coverage, Spec §Edge Cases]
- [ ] CHK034 — O que acontece quando um usuário tenta usar um código de convite do próprio grupo em que já é membro está especificado? [Gap]
- [ ] CHK035 — Estão definidos requisitos para o cenário de redefinição de senha com link expirado acessado pelo usuário? (Mensagem de erro específica, link para solicitar novo reset.) [Coverage, Spec §User Story 4]
- [ ] CHK036 — O fluxo de saída do grupo (`DELETE /groups/members/me`) especifica se o convite ativo do grupo é afetado? (O membro que saiu pode ter gerado o convite atual.) [Gap, Spec §FR-011, FR-012]

---

## Mensurabilidade dos Critérios de Sucesso

- [ ] CHK037 — SC-001 ("cadastro e login em menos de 2 minutos") é mensurável sem especificar condições de rede e dispositivo? Falta definir as condições de medição. [Measurability, Spec §SC-001]
- [ ] CHK038 — SC-003 ("95% dos novos usuários completam o cadastro na primeira tentativa") tem uma metodologia de medição definida ou é aspiracional? [Measurability, Spec §SC-003]
- [ ] CHK039 — SC-005 ("100% das tentativas de multi-grupo bloqueadas") pode ser verificado por um teste automatizado? O critério está escrito de forma testável? [Measurability, Spec §SC-005]

---

## Notes

- Itens `[GATE]` devem estar todos resolvidos antes de abrir o PR.
- Itens sem `[GATE]` são recomendados — anote achados e decisões inline.
- Marque como `[x]` quando o requisito está adequado; adicione `→ AÇÃO:` quando precisar de atualização no spec/plan/contrato.
- Exemplo: `- [x] CHK001 → bcrypt 12 promovido para FR-015 no spec.`
