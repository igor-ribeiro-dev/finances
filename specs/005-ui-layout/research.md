# Research: Layout Visual e Sistema de Design do Frontend

**Branch**: `005-ui-layout` | **Date**: 2026-05-17

---

## Decision 1: Versão do Tailwind CSS

**Decision**: Tailwind CSS v3 (com PostCSS + Autoprefixer)

**Rationale**: A Constitution documenta explicitamente `tailwind.config` como mecanismo de definição de tokens — esse arquivo é o padrão do Tailwind v3. A v4, lançada em 2025, usa uma abordagem CSS-native sem `tailwind.config.js`, o que contradiz a expectativa da Constitution. O projeto usa Vite 5, que tem integração estabelecida com Tailwind v3 via PostCSS. Código já existente no frontend (feature 004) usa classes Tailwind sem a biblioteca instalada — esta feature formaliza essa dependência.

**Alternatives considered**:
- Tailwind v4: Usa `@import "tailwindcss"` em CSS e configuração nativa CSS; elimina `tailwind.config.js`. Mais performático, mas conflita com a Constitution e é uma mudança de paradigma desnecessária neste estágio.
- UnoCSS: Compatível com sintaxe Tailwind, mais rápido em build, mas adiciona uma dependência não estabelecida no projeto e exige migração futura.

---

## Decision 2: Fonte Tipográfica — Inter

**Decision**: `@fontsource/inter` (v5) — fonte self-hosted

**Rationale**: `@fontsource/inter` hospeda a fonte Inter localmente via npm, eliminando dependência de CDN externo (sem latência de DNS, sem risco de privacidade). Funciona com Vite com um simples `import '@fontsource/inter'` no `main.tsx`. Suporta tree-shaking por peso (300, 400, 500, 600, 700). A fonte é aplicada globalmente via `font-sans` redefinido no `tailwind.config`.

**Alternatives considered**:
- Google Fonts CDN: Dependência de rede externa; potencial bloqueio de GDPR em alguns contextos; sem controle sobre disponibilidade.
- System fonts (`font-system-ui`): Zero custo, máxima compatibilidade, mas perde a identidade visual consistente que Inter oferece — Inter é essencial para o visual moderno especificado.

---

## Decision 3: Biblioteca de Ícones — Lucide React

**Decision**: `lucide-react` (versão mais recente estável)

**Rationale**: Lucide React é a primeira opção citada nas Assumptions do spec. Tem suporte nativo a TypeScript, tree-shaking por importação individual (`import { Home } from 'lucide-react'`), e mais de 1000 ícones consistentes no estilo outline. Cada ícone é um componente React que aceita `size`, `color`, `strokeWidth` como props — ideal para um sistema de design padronizado.

**Alternatives considered**:
- `@heroicons/react`: 292 ícones, menos variedade. Mantido pelo time do Tailwind, porém menor atualização recente.
- `react-icons`: Agrega várias bibliotecas, mas o bundle pode crescer se não houver tree-shaking configurado corretamente; menos consistência visual entre conjuntos.

---

## Decision 4: Estado de Loading — Skeleton Custom

**Decision**: Skeleton customizado com `animate-pulse` do Tailwind (sem biblioteca externa)

**Rationale**: O `animate-pulse` nativo do Tailwind é suficiente para criar placeholders de loading convincentes. Uma `<SkeletonPlaceholder />` genérica com divs em cinza animado satisfaz FR-015 sem adicionar dependência externa. Alinha com Princípio IV da Constitution (Simplicidade).

**Alternatives considered**:
- `react-loading-skeleton`: ~12KB gzipped, API bem projetada, mas desnecessária para o escopo desta feature. Pode ser reavaliada quando as telas de dados forem implementadas.
- `react-content-loader` (SVG-based): Mais expressivo visualmente, mas maior complexidade de implementação para o shell inicial.

---

## Decision 5: Configuração de Navegação — TypeScript Array

**Decision**: Array TypeScript tipado (`as const`) em `src/config/navigation.ts`

**Rationale**: Um arquivo `.ts` com um array de objetos tipados é a solução mais simples que satisfaz SC-004 ("adicionar seção em 1 arquivo"). TypeScript oferece autocomplete e type-checking no IDE; `as const` torna o array imutável em tempo de compilação. Nenhum build step adicional; nenhuma biblioteca de configuração.

```typescript
export type NavItemStatus = 'active' | 'coming-soon';

export interface NavItem {
  id: string;
  label: string;
  path: string;
  icon: LucideIcon;
  status: NavItemStatus;
}

export const NAV_ITEMS: NavItem[] = [ ... ] as const;
```

**Alternatives considered**:
- JSON externo: Perde type inference de TypeScript; não suporta importar componente de ícone.
- CMS ou feature flags: Muito complexo para este domínio; o controle de "em breve" é estático e deliberado.

---

## Decision 6: Glassmorphism com Tailwind

**Decision**: Utilities nativas do Tailwind — `backdrop-blur-md`, `bg-white/10`, `border border-white/20`

**Rationale**: Tailwind v3 inclui `backdrop-blur-*` e modificadores de opacidade no formato `bg-color/opacity` nativamente — nenhuma configuração adicional necessária. O efeito de glass fica restrito ao header do sidebar e a superfícies de sobreposição (FR-016), evitando afetar legibilidade dos cards de conteúdo (WCAG 2.1 AA).

**Implementation pattern** (sidebar header):
```html
<div class="backdrop-blur-md bg-teal-800/80 border-b border-white/10">
  <!-- Nome do grupo familiar -->
</div>
```

**Alternatives considered**:
- CSS custom com `filter: blur()`: Não funciona corretamente com a abordagem utility-first; requer CSS externo.
- Biblioteca `glassmorphism-css`: Desnecessária; Tailwind já cobre o caso de uso.

---

## Decision 7: Estratégia de Redirect para Rota Protegida (FR-014)

**Decision**: Estender `ProtectedRoute` para capturar `location.pathname + location.search` e passar como `state` ao redirecionar para `/login`; após login bem-sucedido, ler `state.from` e fazer `navigate(state.from, { replace: true })`.

**Rationale**: React Router v7 suporta passagem de estado no `<Navigate state={{ from: location }} />`. O componente de login já existente (feature 004) precisa ser atualizado para consumir este estado após autenticação. Sem dependências extras — usa apenas APIs do React Router.

**Alternatives considered**:
- Query param `?redirect=/rota`: Expõe a URL de destino na barra de endereço; risco de open redirect se mal validado.
- localStorage: Persiste entre sessões (não desejável para redirect temporário); menos seguro.

---

## Decision 8: Responsividade — Breakpoint de Colapso do Menu

**Decision**: `md:` breakpoint do Tailwind (768px) — padrão que coincide com FR-007

**Rationale**: O spec define explicitamente 768px como breakpoint para colapso do menu. O Tailwind `md:` é exatamente 768px. Em telas `< md`: menu oculto + botão hamburguer. Em telas `>= md`: sidebar fixa à esquerda, width definida em `tailwind.config` como token `sidebar-width: 256px`.

**Alternatives considered**:
- CSS custom media queries: Duplicaria a definição já presente no Tailwind e perderia consistência.
- `lg:` breakpoint (1024px): Mais generoso, mas conflita com o requisito explícito de 768px no spec.
