# Quickstart — Frontend Redesign

**Feature**: 013-frontend-redesign | **Date**: 2026-06-17

Como rodar, desenvolver e validar o redesign (frontend-only, zero mudança de
backend).

## Pré-requisitos

- Node.js 20 LTS, dependências instaladas (`npm install` na raiz do monorepo).
- **Nenhuma** lib nova é necessária para esta feature.

## Rodar em desenvolvimento

```bash
# na raiz do monorepo
npm run dev --workspace frontend       # Vite dev server
```

O backend não muda; suba-o como de costume se for testar fluxos completos.

## Ordem de implementação (TDD — testes vermelhos primeiro)

1. **Tokens + Tailwind** — `index.css` (`:root` claro / `.dark` escuro), utilitário
   `.glass` + fallback `@supports`; `tailwind.config.js` (`darkMode:'class'`,
   cores semânticas, remover escala teal morta); script anti-flash no `index.html`.
2. **Tema** — testes de `ThemeProvider`/`useTheme` (default por
   `prefers-color-scheme` mockando `matchMedia`, fallback dark, persistência em
   `localStorage`, escolha manual prevalece) → implementação; envolver app em
   `main.tsx`.
3. **Primitivos** — testes (um por primitivo: `Button`, `IconButton`, `Pill`,
   `Card`, `GlassCard`, `Modal`, `Input`, `FormField`, `Select`, `Badge`,
   `Spinner`) → implementação em `src/components/ui/` + export no barrel
   `index.ts`. Recompor `MoneyInput` sobre `Input`/`FormField`.
4. **Shell** — migrar `AppLayout`/`Sidebar`/`NavigationItem` para tokens +
   primitivos + glass; validar drawer mobile (abre/fecha, fecha ao navegar).
5. **Telas** — migrar as 11 telas **compondo** primitivos (sem marcação avulsa):
   `*FormModal`→`Modal`; método/status/mês→`Pill`; categoria/cartão→`Select`;
   cards de resumo→`GlassCard`. Teste de migração: pill/`Select` disparam o mesmo
   handler; `Modal` abre/fecha/ESC.

### Como compor (padrão de uso)

```tsx
import { Button, Pill, Modal, FormField, Select } from '@/components/ui';
// variação por prop, nunca por clone:
<Button variant="primary" size="md" loading={saving}>Salvar</Button>
<Pill selected={method === 'CREDIT_CARD'} onClick={() => setMethod('CREDIT_CARD')}>Crédito</Pill>
```

## Rodar testes

```bash
npm test --workspace frontend          # Jest + RTL
npm test --workspace frontend -- Pill  # filtrar por arquivo/nome
```

## Checklist de validação manual (gate antes do merge)

- [ ] **Tema**: primeiro acesso segue o SO; sem preferência → dark; toggle
      alterna e persiste após reload (SC-007).
- [ ] **Sem flash**: recarregar não pisca o tema errado.
- [ ] **Paleta**: nenhuma tela mostra teal/azul/índigo antigos; tudo roxo/violeta
      via tokens (SC-001).
- [ ] **Pills**: método de pagamento, status e mês são pills com estado ativo
      claro; categoria e cartão continuam dropdown (SC-002).
- [ ] **Glass**: cards de resumo e modais têm vidro nos dois temas; navegador sem
      `backdrop-filter` mostra fundo sólido legível (SC-004/FR-006).
- [ ] **Contraste**: passar axe (ou verificação manual) nos dois temas — corpo
      ≥ 4.5:1, títulos grandes ≥ 3:1 (SC-003).
- [ ] **Responsivo**: 320px → desktop sem quebra; drawer mobile acessível a todas
      as seções (SC-009).
- [ ] **Sem regressão**: registrar gasto, pagar conta, criar cartão/fatura,
      editar orçamento funcionam igual (SC-005/FR-008).
- [ ] **Animações** ≤ 300ms, sem jank (SC-006).
- [ ] **Reuso/identidade**: nenhuma tela recria botão/pill/card/modal/campo/
      dropdown inline; tudo composto de `@/components/ui`; variação só por
      `variant`/`size`/`tone` (gate de reutilização do plano).

## Notas

- `prefers-reduced-motion` está **fora de escopo** (animações sempre ativas).
- Fonte **Inter** mantida.
- A preferência de tema fica só no dispositivo (`localStorage`), não na conta.
