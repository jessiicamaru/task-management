import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router';
import { z } from 'zod';

import { useAuth } from './session';
import { Button, Input } from '../../components/ui';
import { ApiError, toFormErrors } from '../../lib/api-client';

const registerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Name is required')
    .max(100, 'Name must be at most 100 characters'),
  email: z.string().trim().email('Please enter a valid email address').max(254),
  password: z
    .string()
    .min(12, 'Password must be at least 12 characters')
    .max(128, 'Password must be at most 128 characters'),
});

type RegisterFormData = z.infer<typeof registerSchema>;

export function RegisterScreen() {
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();
  const [generalError, setGeneralError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: RegisterFormData) => {
    setGeneralError(null);
    try {
      await registerUser(data);
      void navigate('/login', {
        state: { email: data.email, registered: true },
        replace: true,
      });
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        if (err.status === 409) {
          setError('email', {
            type: 'server',
            message: 'This email is already registered.',
          });
          return;
        }

        const mapped = toFormErrors(err, setError);
        if (!mapped) {
          setGeneralError(err.message || 'Failed to create account.');
        }
      } else {
        setGeneralError('Network error. Please try again.');
      }
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-bg">
      <div className="w-full max-w-md rounded-xl border border-border bg-surface p-8 shadow-sm">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-fg">Create an Account</h1>
          <p className="mt-1 text-sm text-fg-muted">Sign up to get started with TaskFlow</p>
        </div>

        {generalError && (
          <div
            role="alert"
            className="mb-4 rounded-md border border-danger/30 bg-danger-muted p-3 text-xs text-danger font-medium"
          >
            {generalError}
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
            label="Full Name"
            type="text"
            id="name"
            autoComplete="name"
            placeholder="Jane Doe"
            disabled={isSubmitting}
            error={errors.name?.message}
            {...register('name')}
          />

          <Input
            label="Email Address"
            type="email"
            id="email"
            autoComplete="email"
            placeholder="you@example.com"
            disabled={isSubmitting}
            error={errors.email?.message}
            {...register('email')}
          />

          <Input
            label="Password"
            type="password"
            id="password"
            autoComplete="new-password"
            placeholder="At least 12 characters"
            helperText="Must be between 12 and 128 characters long"
            disabled={isSubmitting}
            error={errors.password?.message}
            {...register('password')}
          />

          <Button type="submit" className="w-full mt-2" loading={isSubmitting}>
            Create Account
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-fg-muted">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-accent hover:underline">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}
