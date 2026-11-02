import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { LoginScreen } from './LoginScreen';
import { RegisterScreen } from './RegisterScreen';
import { Providers } from '../../app/providers';

describe('Auth Screens', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe('LoginScreen', () => {
    it('renders login form and shows error on invalid credentials', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            error: {
              code: 'invalid_credentials',
              message: 'Invalid email or password',
              requestId: 'req_test',
            },
          }),
          { status: 401, headers: { 'Content-Type': 'application/json' } },
        ),
      );

      render(
        <Providers>
          <MemoryRouter>
            <LoginScreen />
          </MemoryRouter>
        </Providers>,
      );

      fireEvent.change(screen.getByLabelText(/email address/i), {
        target: { value: 'wrong@example.com' },
      });
      fireEvent.change(screen.getByLabelText(/password/i), {
        target: { value: 'secretpass123' },
      });

      fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(/invalid email or password/i);
      });
    });
  });

  describe('RegisterScreen', () => {
    it('enforces minimum 12 character password on client before submitting', async () => {
      render(
        <Providers>
          <MemoryRouter>
            <RegisterScreen />
          </MemoryRouter>
        </Providers>,
      );

      fireEvent.change(screen.getByLabelText(/full name/i), {
        target: { value: 'Alice' },
      });
      fireEvent.change(screen.getByLabelText(/email address/i), {
        target: { value: 'alice@example.com' },
      });
      fireEvent.change(screen.getByLabelText(/password/i), {
        target: { value: 'short' },
      });

      fireEvent.click(screen.getByRole('button', { name: /create account/i }));

      await waitFor(() => {
        expect(screen.getByText(/password must be at least 12 characters/i)).toBeInTheDocument();
      });
    });
  });
});
