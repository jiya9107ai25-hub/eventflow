import { forwardRef } from 'react';
import { cn, colorFor, initials } from '@/lib/utils';

/* ---------- Card ---------- */
export function Card({ className, ...p }) {
  return <div className={cn('rounded-xl border bg-card text-card-foreground shadow-soft', className)} {...p} />;
}
export function CardHeader({ className, ...p }) {
  return <div className={cn('flex items-start justify-between gap-4 p-5 pb-3', className)} {...p} />;
}
export function CardTitle({ className, ...p }) {
  return <h3 className={cn('text-base font-semibold', className)} {...p} />;
}
export function CardDescription({ className, ...p }) {
  return <p className={cn('text-sm text-muted-foreground', className)} {...p} />;
}
export function CardContent({ className, ...p }) {
  return <div className={cn('p-5 pt-0', className)} {...p} />;
}

/* ---------- Inputs ---------- */
const field =
  'w-full rounded-md border border-input bg-surface px-3 text-sm text-foreground shadow-sm transition-colors placeholder:text-muted-foreground/70 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60 aria-[invalid=true]:border-danger aria-[invalid=true]:focus:ring-danger/20';

export const Input = forwardRef(({ className, ...p }, ref) => <input ref={ref} className={cn(field, 'h-10', className)} {...p} />);
Input.displayName = 'Input';

export const Textarea = forwardRef(({ className, ...p }, ref) => <textarea ref={ref} className={cn(field, 'min-h-[96px] py-2.5', className)} {...p} />);
Textarea.displayName = 'Textarea';

export const Select = forwardRef(({ className, children, ...p }, ref) => (
  <select ref={ref} className={cn(field, 'h-10 cursor-pointer pr-8', className)} {...p}>
    {children}
  </select>
));
Select.displayName = 'Select';

export function Label({ className, ...p }) {
  return <label className={cn('mb-1.5 block text-sm font-medium', className)} {...p} />;
}

/** Label + control + error message, wired up for screen readers. */
export function FormField({ label, htmlFor, error, hint, children, className }) {
  return (
    <div className={className}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} role="alert" className="mt-1.5 text-xs font-medium text-danger">
          {error}
        </p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

/* ---------- Badge ---------- */
const tones = {
  default: 'bg-primary/10 text-primary',
  muted: 'bg-muted text-muted-foreground',
  info: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
  success: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  warning: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
  danger: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
};

export function Badge({ tone = 'default', className, ...p }) {
  return (
    <span
      className={cn('inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold', tones[tone], className)}
      {...p}
    />
  );
}

/* ---------- Progress ---------- */
export function Progress({ value, className, tone = 'primary', label }) {
  const color = { primary: 'bg-primary', success: 'bg-success', warning: 'bg-warning', danger: 'bg-danger' }[tone];
  return (
    <div
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className={cn('h-2 w-full overflow-hidden rounded-full bg-muted', className)}
    >
      <div className={cn('h-full rounded-full transition-[width] duration-700 ease-out', color)} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}

/* ---------- Avatar ---------- */
export function Avatar({ name, size = 32, className }) {
  return (
    <span
      title={name}
      className={cn('inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white ring-2 ring-card', className)}
      style={{ width: size, height: size, background: colorFor(name), fontSize: size * 0.38 }}
      aria-hidden
    >
      {initials(name) || '?'}
    </span>
  );
}

/* ---------- Skeleton ---------- */
export function Skeleton({ className }) {
  return (
    <div className={cn('relative overflow-hidden rounded-md bg-muted', className)} aria-hidden>
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/40 to-transparent dark:via-white/5" />
    </div>
  );
}

/* ---------- Empty state ---------- */
export function EmptyState({ icon, title, description, action, className }) {
  return (
    <div className={cn('flex flex-col items-center justify-center rounded-xl border border-dashed px-6 py-14 text-center', className)}>
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">{icon}</div>
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      {action && <div className="mt-5 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  );
}

/* ---------- Page header ---------- */
export function PageHeader({ title, description, actions }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold sm:text-[28px]">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

/* ---------- Kbd ---------- */
export function Kbd({ children }) {
  return <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">{children}</kbd>;
}
