import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

if (!import.meta.env.VITE_API_URL) {
  Object.defineProperty(import.meta.env, 'VITE_API_URL', {
    value: 'http://localhost:3000',
    configurable: true,
  });
}

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});
