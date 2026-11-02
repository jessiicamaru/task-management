import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useLocation, useNavigate } from 'react-router';
import { z } from 'zod';

import { useAuth } from './session';
import { Button, Input } from '../../components/ui';
import { ApiError } from '../../lib/api-client';

const loginSchema = z.object({
  email: z.string().trim().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormData = z.infer<typeof loginSchema>;

interface LocationState {
  from?: { pathname: string };
  email?: string;
  registered?: boolean;
}

export function LoginScreen() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state as LocationState | null) ?? null;

  const [serverError, setServerError] = useState<string | null>(null);
  const [isRateLimited, setIsRateLimited] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: state?.email || '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    setServerError(null);
    try {
      await login(data);
      const destination = state?.from?.pathname || '/projects';
      void navigate(destination, { replace: true });
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        if (err.status === 429) {
          setIsRateLimited(true);
          setServerError('Too many authentication attempts. Please try again later.');
          return;
        }
        if (err.status === 401) {
          setServerError('Invalid email or password.');
          return;
        }
        setServerError(err.message || 'An unexpected error occurred.');
      } else {
        setServerError('Network error. Please check your connection.');
      }
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-bg">
      <div className="w-full max-w-md rounded-xl border border-border bg-surface p-8 shadow-sm">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-fg">Sign In to TaskFlow</h1>
          <p className="mt-1 text-sm text-fg-muted">Enter your credentials to continue</p>
        </div>

        {state?.registered && (
          <div
            role="status"
            className="mb-4 rounded-md border border-success/30 bg-success-muted p-3 text-xs text-success-fg"
          >
            Account created successfully. Please sign in below.
          </div>
        )}

        {serverError && (
          <div
            role="alert"
            className="mb-4 rounded-md border border-danger/30 bg-danger-muted p-3 text-xs text-danger font-medium"
          >
            {serverError}
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void handleSubmit(onSubmit)(e);
          }}
          className="space-y-4"
          noValidate
        >
          <Input
            label="Email Address"
            type="email"
            id="email"
            autoComplete="email"
            placeholder="you@example.com"
            disabled={isSubmitting || isRateLimited}
            error={errors.email?.message}
            {...register('email')}
          />

          <Input
            label="Password"
            type="password"
            id="password"
            autoComplete="current-password"
            placeholder="••••••••••••"
            disabled={isSubmitting || isRateLimited}
            error={errors.password?.message}
            {...register('password')}
          />

          <Button
            type="submit"
            className="w-full mt-2"
            loading={isSubmitting}
            disabled={isRateLimited}
          >
            Sign In
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-fg-muted">
          Don&apos;t have an account?{' '}
          <Link to="/register" className="font-semibold text-accent hover:underline">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
