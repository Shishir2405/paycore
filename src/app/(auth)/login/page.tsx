'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'motion/react';
import { Buildings, Lock, EnvelopeSimple } from '@phosphor-icons/react';
import { loginSchema, type LoginInput } from '@/lib/validators/auth';
import { useAuth } from '@/store/auth';
import { ApiError } from '@/lib/api/client';
import { Button, Field, Input } from '@/components/ui';

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-bg" />}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const login = useAuth((s) => s.login);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  async function onSubmit(values: LoginInput) {
    setFormError(null);
    try {
      await login(values.email, values.password);
      router.replace(params.get('next') || '/dashboard');
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Unable to sign in');
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg p-4">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-sm"
      >
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-brand text-brand-fg">
            <Buildings size={26} weight="fill" />
          </div>
          <h1 className="text-xl font-semibold text-fg">Welcome to PayCore</h1>
          <p className="mt-1 text-sm text-muted">Sign in to your payroll workspace</p>
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-4 rounded-xl border border-border bg-surface p-6 shadow-card"
        >
          {formError && (
            <div className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
              {formError}
            </div>
          )}

          <Field label="Email" htmlFor="email" error={errors.email?.message} required>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@company.com"
              leadingIcon={<EnvelopeSimple size={16} />}
              invalid={!!errors.email}
              {...register('email')}
            />
          </Field>

          <Field label="Password" htmlFor="password" error={errors.password?.message} required>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              leadingIcon={<Lock size={16} />}
              invalid={!!errors.password}
              {...register('password')}
            />
          </Field>

          <Button type="submit" fullWidth loading={isSubmitting}>
            Sign in
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-muted">
          PayCore — India-compliant payroll &amp; HR
        </p>
      </motion.div>
    </div>
  );
}
