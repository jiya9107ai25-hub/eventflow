import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle } from 'lucide-react';
import { AuthLayout } from './AuthLayout';
import { Button, FormField, Input } from '@/components/ui';
import { PasswordInput } from '@/components/common/PasswordInput';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { signupSchema } from '@/schemas';
import { cn } from '@/lib/utils';

function strength(pw) {
  let s = 0;
  if (pw.length >= 8) s++;
  if (/[A-Z]/.test(pw)) s++;
  if (/\d/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw) || pw.length >= 12) s++;
  return s;
}

export default function Signup() {
  const { signUp } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [formError, setFormError] = useState(null);
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(signupSchema), defaultValues: { name: '', email: '', password: '', confirm: '' } });

  const pw = watch('password');
  const score = strength(pw);

  const onSubmit = async (v) => {
    setFormError(null);
    try {
      await signUp(v.name, v.email, v.password);
      toast.success('Account created', 'Let’s set up your first event.');
      navigate('/app', { replace: true });
    } catch (e) {
      setFormError(e.message);
    }
  };

  const err = (k) => ({ 'aria-invalid': !!errors[k], 'aria-describedby': errors[k] ? `${k}-error` : undefined });

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Start planning events in minutes."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-primary hover:underline">
            Log in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        {formError && (
          <div role="alert" className="flex items-start gap-2 rounded-lg border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {formError}
          </div>
        )}
        <FormField label="Full name" htmlFor="name" error={errors.name?.message}>
          <Input id="name" autoComplete="name" placeholder="Alex Johnson" {...err('name')} {...register('name')} />
        </FormField>
        <FormField label="Email" htmlFor="email" error={errors.email?.message}>
          <Input id="email" type="email" autoComplete="email" placeholder="you@example.com" {...err('email')} {...register('email')} />
        </FormField>
        <FormField label="Password" htmlFor="password" error={errors.password?.message}>
          <PasswordInput id="password" autoComplete="new-password" placeholder="At least 8 characters" {...err('password')} {...register('password')} />
          <div className="mt-2 flex gap-1" aria-hidden>
            {[0, 1, 2, 3].map((i) => (
              <span
                key={i}
                className={cn(
                  'h-1 flex-1 rounded-full bg-muted transition-colors',
                  i < score && ['bg-danger', 'bg-warning', 'bg-sky-500', 'bg-success'][score - 1],
                )}
              />
            ))}
          </div>
          <span className="sr-only" aria-live="polite">
            Password strength {score} of 4
          </span>
        </FormField>
        <FormField label="Confirm password" htmlFor="confirm" error={errors.confirm?.message}>
          <PasswordInput id="confirm" autoComplete="new-password" placeholder="Repeat password" {...err('confirm')} {...register('confirm')} />
        </FormField>
        <Button type="submit" className="w-full" size="lg" loading={isSubmitting}>
          Create account
        </Button>
      </form>
    </AuthLayout>
  );
}
