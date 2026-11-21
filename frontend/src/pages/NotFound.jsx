import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { Button, ButtonLink } from '@/components/ui';
import { Logo } from '@/components/common/Logo';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <Logo className="mb-10" />
      <Compass className="mb-4 h-12 w-12 text-primary" />
      <h1 className="text-4xl font-extrabold">Page not found</h1>
      <p className="mt-2 text-muted-foreground">The page you’re looking for doesn’t exist or was moved.</p>
      <div className="mt-6 flex gap-2">
        <ButtonLink to="/" variant="outline">
          Home
        </ButtonLink>
        <ButtonLink to="/app">Dashboard</ButtonLink>
      </div>
    </div>
  );
}
