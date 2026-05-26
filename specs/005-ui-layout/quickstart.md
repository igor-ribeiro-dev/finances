# Quickstart: Layout Visual e Sistema de Design do Frontend

**Branch**: `005-ui-layout` | **Date**: 2026-05-17

---

## Pré-requisitos

- Node.js 20 LTS instalado
- Feature 004 (user-auth-family-groups) implementada e funcionando
- Frontend rodando em `http://localhost:5173`

---

## 1. Instalar Dependências

```bash
cd frontend

# Tailwind CSS v3 + PostCSS
npm install -D tailwindcss@^3 postcss autoprefixer

# Inicializar configuração do Tailwind
npx tailwindcss init -p

# Fonte Inter (self-hosted)
npm install @fontsource/inter

# Ícones
npm install lucide-react
```

---

## 2. Configurar Tailwind

### 2.1 `tailwind.config.js`

O arquivo gerado pelo `init` precisa ser substituído pelo config com os tokens do design system (ver `data-model.md` para valores exatos):

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui'],
      },
      colors: {
        primary: { /* escala teal customizada */ },
      },
      borderRadius: {
        DEFAULT: '8px',
        md: '10px',
        lg: '12px',
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)',
        overlay: '0 10px 25px rgba(0,0,0,0.12), 0 4px 10px rgba(0,0,0,0.08)',
      },
      width: {
        sidebar: '256px',
      },
    },
  },
  plugins: [],
};
```

### 2.2 `src/index.css`

Criar (ou substituir) com as diretivas Tailwind + import da fonte:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

### 2.3 `src/main.tsx`

Adicionar os imports:

```typescript
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import './index.css';
```

---

## 3. Rodar o Ambiente de Desenvolvimento

```bash
# Na raiz do monorepo
npm run dev --workspace=frontend

# Ou dentro de frontend/
cd frontend && npm run dev
```

Acesse: `http://localhost:5173`

---

## 4. Rodar os Testes

```bash
# Testes do frontend
npm run test --workspace=frontend

# Ou dentro de frontend/
cd frontend && npm test
```

Os testes de componente usam Jest + React Testing Library + jsdom.

---

## 5. Verificar Acessibilidade (Manual)

Para validar WCAG 2.1 AA (FR-011):

1. Abra o DevTools do Chrome → Lighthouse → Accessibility
2. Rode a auditoria — score mínimo esperado: **90+**
3. Verifique contraste com a extensão [axe DevTools](https://www.deque.com/axe/) ou [Color Contrast Analyzer](https://www.tpgi.com/color-contrast-checker/)

**Contrastes mínimos**:
- Texto normal: 4,5:1
- Texto grande (>= 18px bold ou >= 24px): 3:1

---

## 6. Verificar Responsividade

1. DevTools → Toggle Device Toolbar
2. Testar em larguras: 320px, 375px (mobile), 768px (breakpoint), 1024px, 1440px, 1920px
3. Em `< 768px`: sidebar deve estar oculta e botão hamburguer visível no topo
4. Em `>= 768px`: sidebar visível, largura 256px, sem sobreposição com o conteúdo

---

## 7. Verificar Sistema de Design

Para garantir que SC-002 está sendo respeitado (sem cores/espaçamentos fora do design system):

```bash
# Verificar uso de valores hard-coded (não deve aparecer em componentes)
grep -r "style={{" frontend/src/components/layout/
grep -r "#[0-9a-fA-F]" frontend/src/components/layout/
grep -r "px-[0-9]" frontend/src/components/layout/ # apenas tokens devem ser usados
```

Todos os valores visuais devem vir dos tokens do `tailwind.config.js`.

---

## 8. Adicionar Nova Seção ao Menu

Quando uma nova feature implementar uma seção (ex.: "Despesas"):

1. Abrir `frontend/src/config/navigation.ts`
2. Localizar o item com `id: 'despesas'`
3. Alterar `status: 'coming-soon'` para `status: 'active'`
4. Salvar — o menu lateral reflete a mudança imediatamente (hot reload)

Nenhum outro arquivo precisa ser modificado (SC-004).
