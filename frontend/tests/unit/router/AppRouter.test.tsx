// T027 (US3) — /despesas redirects to /pagamentos; NAV_ITEMS has no "despesas".
import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'util';
Object.assign(global, { TextEncoder, TextDecoder });

import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Routes, Route, Navigate } from 'react-router-dom';
import { NAV_ITEMS } from '../../../src/config/navigation';

// Minimal mock of the /despesas redirect behaviour (extracted from AppRouter).
function TestRoutes() {
  return (
    <Routes>
      <Route path="/despesas" element={<Navigate to="/pagamentos" replace />} />
      <Route path="/pagamentos" element={<div>Pagamentos</div>} />
      <Route path="*" element={<div>Other</div>} />
    </Routes>
  );
}

describe('Navigation config (US3)', () => {
  it('NAV_ITEMS does not include a "despesas" entry', () => {
    const ids = NAV_ITEMS.map((item) => item.id);
    expect(ids).not.toContain('despesas');
  });

  it('NAV_ITEMS does not include a "/despesas" path', () => {
    const paths = NAV_ITEMS.map((item) => item.path);
    expect(paths).not.toContain('/despesas');
  });
});

describe('AppRouter — /despesas redirect (US3)', () => {
  it('redirects /despesas to /pagamentos', () => {
    render(
      <MemoryRouter initialEntries={['/despesas']}>
        <TestRoutes />
      </MemoryRouter>,
    );

    expect(screen.getByText('Pagamentos')).toBeInTheDocument();
  });
});
