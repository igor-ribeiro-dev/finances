import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import './index.css';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { ThemeProvider } from './theme/ThemeProvider';
import { AppRouter } from './router/AppRouter';

const root = document.getElementById('root');
if (!root) throw new Error('Root element #root not found in DOM');

createRoot(root).render(
  <ThemeProvider>
    <AppRouter />
  </ThemeProvider>,
);
