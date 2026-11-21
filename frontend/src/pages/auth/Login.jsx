import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, FlaskConical } from 'lucide-react';
import { AuthLayout } from './AuthLayout';
import { Button, FormField, Input } from '@/components/ui';
import { PasswordInput } from '@/components/common/PasswordInput';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { loginSchema } from '@/schemas';
import { backend, dataMode } from '@/services';
import { DEMO_EMAIL, DEMO_PASSWORD } from '@/services/auth';
import { seedSampleEvents } from '@/services/sampleData';

export default function Login() {
  const { signIn } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from ?? '/app';
  const [formError, setFormError] = useState(null);
  const [demoLoading, setDemoLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(loginSchema), defaultValues: { email: '', password: '' } });

  const onSubmit = async (v) => {
    setFormError(null);
    try {
      const u = await signIn(v.email, v.password);
      toast.success(`Welcome back, ${u.displayName.split(' ')[0]}!`);
      navigate(from, { replace: true });
    } catch (e) {
      setFormError(e.message);
    }
  };

  /** Sample-mode only: signs into a local demo account pre-filled with sample events. */
  const tryDemo = async () => {
    setDemoLoading(true);
    try {
      const u = await signIn(DEMO_EMAIL, DEMO_PASSWORD);
      const key = `eventflow-demo-seeded-${u.uid}`;
      if (!localStorage.getItem(key)) {
        await seedSampleEvents(backend, u.uid);
        localStorage.setItem(key, '1');
      }
      toast.success('Signed in to the demo account', 'Sample events are clearly labelled.');
      navigate('/app', { replace: true });
    } catch (e) {
      setFormError(e.message);
    } finally {
      setDemoLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Log in to manage your events."
      footer={
        <>
          New to EventFlow?{' '}
          <Link to="/signup" className="font-medium text-primary hover:underline">
            Create an account
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
        <FormField label="Email" htmlFor="email" error={errors.email?.message}>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? 'email-error' : undefined}
            {...register('email')}
          />
        </FormField>
        <FormField label="Password" htmlFor="password" error={errors.password?.message}>
          <PasswordInput
            id="password"
            autoComplete="current-password"
            placeholder="••••••••"
            aria-invalid={!!errors.password}
            aria-describedby={errors.password ? 'password-error' : undefined}
            {...register('password')}
          />
        </FormField>
        <Button type="submit" className="w-full" size="lg" loading={isSubmitting}>
          Log in
        </Button>
      </form>

      {dataMode === 'sample' && (
        <div className="mt-6 rounded-xl border border-dashed p-4">
          <p className="flex items-center gap-2 text-sm font-medium">
            <FlaskConical className="h-4 w-4 text-warning" /> Sample data mode
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Firebase isn't configured. Explore with a local demo account pre-loaded with clearly-labelled sample events.
          </p>
          <Button variant="outline" className="mt-3 w-full" onClick={tryDemo} loading={demoLoading}>
            Try the demo account
          </Button>
        </div>
      )}
    </AuthLayout>
  );
}
