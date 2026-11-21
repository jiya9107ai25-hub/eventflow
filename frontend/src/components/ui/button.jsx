import { forwardRef } from 'react';
import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const variants = {
  primary: 'bg-primary text-primary-foreground shadow-sm shadow-primary/30 hover:bg-primary/90 hover:shadow-md hover:shadow-primary/30',
  secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/70',
  outline: 'border border-border bg-surface hover:bg-muted text-foreground',
  ghost: 'hover:bg-muted text-foreground',
  danger: 'bg-danger text-white hover:bg-danger/90 shadow-sm shadow-danger/30',
  link: 'text-primary underline-offset-4 hover:underline px-0 h-auto',
};

const sizes = {
  sm: 'h-8 px-3 text-xs gap-1.5 rounded-md',
  md: 'h-10 px-4 text-sm gap-2 rounded-md',
  lg: 'h-12 px-6 text-base gap-2 rounded-lg',
  icon: 'h-9 w-9 rounded-md',
};

const base =
  'inline-flex shrink-0 select-none items-center justify-center whitespace-nowrap font-medium transition-all duration-150 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50';

/** A link that looks like a Button (one clickable element — no <button> inside <a>). */
export const ButtonLink = forwardRef(({ className, variant = 'primary', size = 'md', children, ...props }, ref) => (
  <Link ref={ref} className={cn(base, variants[variant], sizes[size], className)} {...props}>
    {children}
  </Link>
));
ButtonLink.displayName = 'ButtonLink';

export const Button = forwardRef(({ className, variant = 'primary', size = 'md', loading, disabled, children, type = 'button', ...props }, ref) => (
  <button
    ref={ref}
    type={type}
    disabled={disabled || loading}
    aria-busy={loading || undefined}
    className={cn(base, variants[variant], sizes[size], className)}
    {...props}
  >
    {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
    {children}
  </button>
));
Button.displayName = 'Button';
