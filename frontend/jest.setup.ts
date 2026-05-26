import '@testing-library/jest-dom';

// Mock auth flag — always disabled in tests
(globalThis as Record<string, unknown>).__MOCK_AUTH__ = false;
