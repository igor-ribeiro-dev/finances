// Isolation: This test file has no dependency on the backend/ directory.
import React from 'react';
import { render } from '@testing-library/react';
import App from '../../src/App';

describe('App', () => {
  it('renders without throwing', () => {
    expect(() => render(<App />)).not.toThrow();
  });

  it('renders the root element with expected content', () => {
    const { container } = render(<App />);
    expect(container.textContent).toBe('Finances');
  });
});
