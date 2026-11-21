import { memo, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface Props {
  label: string;
  value: ReactNode;
  icon: ReactNode;
  hint?: ReactNode;
  tone?: 'primary' | 'accent' | 'success' | 'warning';
  onClick?: () => void;
}

const toneCls = {
  primary: 'bg-primary/10 text-primary',
  accent: 'bg-sky-500/10 text-sky-500',
  success: 'bg-emerald-500/10 text-emerald-500',
  warning: 'bg-amber-500/10 text-amber-500',
};

/** Memoised: dashboards re-render often from live listeners; stat cards only re-render when their props change. */
export const StatCard = memo(function StatCard({ label, value, icon, hint, tone = 'primary', onClick }: Props) {
  const Comp = onClick ? 'button' : 'div';
  return (
    <Comp
      onClick={onClick}
      className={cn(
        'group relative w-full overflow-hidden rounded-xl border bg-card p-5 text-left shadow-soft transition duration-200',
        onClick && 'hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lift',
      )}
    >
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <span className={cn('flex h-9 w-9 items-center justify-center rounded-lg transition-transform group-hover:scale-110', toneCls[tone])}>{icon}</span>
      </div>
      <p className="mt-3 font-display text-3xl font-bold tracking-tight">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </Comp>
  );
});
