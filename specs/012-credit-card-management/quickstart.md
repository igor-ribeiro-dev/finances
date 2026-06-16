# Quickstart — Credit Card Management (feature 012)

Como exercitar a feature de ponta a ponta no monorepo (`backend/` + `frontend/`).

## Pré-requisitos

- Branch `012-credit-card-management`.
- Postgres de desenvolvimento ativo; migração `2026XXXX_012_credit_card_management`
  aplicada (`npm -w backend run prisma:migrate`).
- Usuário autenticado e membro de um grupo familiar (features 004/005).

## Fluxo feliz (manual)

1. **Registrar um cartão** — em "Cartões", criar `Nubank` com dia de fechamento
   `10`. Confirmar que aparece na lista e fica disponível na seleção de gasto.
2. **Registrar um gasto no cartão** — no tracker, "registrar gasto" com método
   *cartão de crédito*, selecionar `Nubank`, valor `R$ 120,00`, data de hoje.
   Conferir: a compra conta no dashboard do mês (data da compra) **e** aparece
   no aberto do `Nubank`.
3. **Ver o que está acumulando** — abrir a visão do `Nubank`: a compra aparece
   na lista de abertos e o total corrente = `R$ 120,00`. O resumo por cartão no
   tracker mostra o mesmo total.
4. **Registrar a fatura** — ação "registrar fatura" no `Nubank`, valor
   `R$ 120,00`, vencimento. Cria uma conta `isFatura` PENDING. Tentar registrar
   uma segunda fatura pendente do mesmo cartão deve falhar (`fatura.pending_exists`).
5. **Pagar a fatura** — pagar a conta-fatura. Conferir: o aberto do `Nubank` cai
   para `R$ 0,00`; o total do dashboard do mês **não** sobe pela fatura (a compra
   já contou — sem dupla contagem).
6. **Reverter a fatura** — reverter o pagamento da fatura. Conferir: a compra de
   `R$ 120,00` volta a aparecer como aberta no `Nubank`.
7. **Arquivar / deletar** — arquivar o `Nubank` (some da seleção de novo gasto,
   permanece no histórico). Tentar deletar um cartão com contas deve ser
   bloqueado (`credit_card.has_bills`).

## Verificações automatizadas (TDD — escrever falhando primeiro)

Backend (Jest + Supertest):

```bash
npm -w backend test -- credit-card        # CRUD, unicidade entre ativos, guarda de deleção
npm -w backend test -- register-fatura     # 1 fatura pendente por cartão (FR-012a)
npm -w backend test -- pay-fatura-settlement   # snapshot + reversão exata (FR-009/SC-005)
npm -w backend test -- aggregate-excludes-fatura # fatura fora do orçamento (FR-010/SC-004)
npm -w backend test -- log-spending        # creditCardId obrigatório/proibido (FR-003)
```

Frontend (Jest + RTL):

```bash
npm -w frontend test -- CreditCards        # página, form, visão por cartão
npm -w frontend test -- QuickLogModal      # seletor de cartão no método crédito
npm -w frontend test -- RegisterFatura     # modal dedicado
```

## Checks de aceitação mapeados

- **SC-001**: registrar cartão e usá-lo em < 30 s (passos 1–2).
- **SC-002/SC-003**: total em aberto = soma das compras não quitadas (passo 3).
- **SC-004**: zero dupla contagem — fatura paga fora do orçamento (passo 5).
- **SC-005**: pagar/reverter fatura move o aberto exatamente (passos 5–6).
