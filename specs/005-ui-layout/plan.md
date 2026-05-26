# Implementation Plan: Layout Visual e Sistema de Design do Frontend

**Branch**: `005-ui-layout` | **Date**: 2026-05-17 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/005-ui-layout/spec.md`

## Summary

Implementar o shell de layout autenticado do app de finanças: sidebar de navegação fixa à esquerda com menu configurável, sistema de design com tokens Tailwind (fonte Inter, paleta teal, cantos 8–12px, 2 níveis de sombra, glassmorphism sutil no header da sidebar), responsividade com colapso abaixo de 768px, skeleton de loading, e redirect seguro com preservação de URL para rotas protegidas. Nenhuma mudança no backend.

## Technical Context

**Language/Version**: Node.js 20 LTS + TypeScript 5 (strict mode) — frontend SPA

**Primary Dependencies**:
- Existentes: React 18, React Router DOM v7, Vite 5, Jest, React Testing Library
- Novas: `tailwindcss@^3`, `postcss`, `autoprefixer`, `@fontsource/inter`, `lucide-react`

**Storage**: N/A (feature puramente frontend — sem novos endpoints ou tabelas)

**Testing**: Jest + React Testing Library (jsdom) — testes de componente

**Target Platform**: Navegador moderno (Chrome 115+, Firefox 120+, Safari 17+) — desktop primário, responsivo 320px–1920px

**Project Type**: Frontend SPA — monorepo npm workspace `frontend/`

**Performance Goals**:
- SC-001: Navegação para qualquer seção em ≤ 2 cliques
- SC-003: Layout estável em 320px–1920px sem sobreposição
- Skeleton visível < 100ms após clique de navegação (percepção imediata de feedback)

**Constraints**:
- WCAG 2.1 AA: contraste ≥ 4,5:1 (texto normal), ≥ 3:1 (texto grande)
- Cor primária: teal-600 (#0d9488) — satisfaz AA contra branco (≈ 4.6:1)
- Todos os tokens visuais definidos em `tailwind.config.js` — sem valores hard-coded em componentes
- Inter como fonte primária (via `@fontsource/inter`, self-hosted)
- Glassmorphism apenas em superfícies de sobreposição/header sidebar (não em cards de conteúdo)
- Interface exclusivamente em PT-BR

**Scale/Scope**: App familiar — shell de navegação + design system base; sem lógica de domínio nesta feature

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Princípio | Status | Notas |
|-----------|--------|-------|
| I. API-First | ✅ N/A | Feature puramente frontend — sem novos endpoints ou interação backend. Consome API existente da feature 004 (já contratada em `specs/004-user-auth-family-groups/contracts/`). Contrato UI documentado em `contracts/nav-config.schema.md`. |
| II. Test-First | ✅ APPLIES | TDD obrigatório — testes de componente (RTL) escritos e falhando antes da implementação. Cobertura: AppLayout, Sidebar, NavigationItem (3 estados), SkeletonPlaceholder, ProtectedRoute (redirect com URL). |
| III. Security & Data Integrity | ✅ PASS | FR-014: ProtectedRoute estendido para preservar URL original no redirect para login. Sem exposição de dados sensíveis em query params (usa React Router `state`). |
| IV. Simplicity | ✅ PASS | Sem nova biblioteca de estado global. Nav config como array TypeScript simples. Skeleton com `animate-pulse` nativo do Tailwind. Nenhuma abstração além do necessário. |
| V. Observability | ✅ N/A | Frontend layout shell não requer logs estruturados. Error boundaries com `console.error` são suficientes para esta camada. |

**Sem violações. Nenhuma entrada em Complexity Tracking necessária.**

## Project Structure

### Documentation (this feature)

```text
specs/005-ui-layout/
├── plan.md              ← este arquivo
├── research.md          ← Phase 0: 8 decisões técnicas resolvidas
├── data-model.md        ← Phase 1: tokens de design + schema NavItem
├── contracts/
│   └── nav-config.schema.md  ← Phase 1: contrato UI do arquivo de configuração
├── quickstart.md        ← Phase 1: setup Tailwind, Inter, Lucide + guia de validação
└── tasks.md             ← Phase 2 (/speckit-tasks — não criado aqui)
```

### Source Code Impact

```text
frontend/
├── tailwind.config.js           ← NOVO: tokens de design system completos
├── postcss.config.js            ← NOVO: Tailwind + Autoprefixer
├── src/
│   ├── index.css                ← NOVO: @tailwind base/components/utilities
│   ├── main.tsx                 ← MODIFICAR: imports @fontsource/inter + index.css
│   ├── config/
│   │   └── navigation.ts        ← NOVO: array NavItem[] com 6 seções (satisfaz SC-004)
│   ├── components/
│   │   └── layout/
│   │       ├── AppLayout.tsx         ← NOVO: container raiz (sidebar + content area)
│   │       ├── Sidebar.tsx           ← NOVO: menu lateral com header glass + user info
│   │       ├── NavigationItem.tsx    ← NOVO: item de nav com 3 estados visuais
│   │       └── SkeletonPlaceholder.tsx ← NOVO: skeleton animate-pulse
│   ├── pages/
│   │   └── DashboardPage.tsx         ← NOVO: substitui DashboardPlaceholder inline
│   └── router/
│       ├── AppRouter.tsx             ← MODIFICAR: wrap rotas protegidas em AppLayout
│       └── ProtectedRoute.tsx        ← MODIFICAR: redirect com preservação de URL (FR-014)
└── tests/
    └── unit/
        └── components/
            └── layout/
                ├── AppLayout.test.tsx
                ├── Sidebar.test.tsx
                ├── NavigationItem.test.tsx
                └── SkeletonPlaceholder.test.tsx
```

**Structure Decision**: Monorepo Option 2 (web application). Frontend SPA com Vite. Estrutura de `components/layout/` isolada para o shell de navegação — não interfere com componentes de auth (feature 004) nem com futuras seções de domínio.

## Complexity Tracking

> Nenhuma violação da Constitution identificada. Tabela não aplicável.
