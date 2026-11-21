import { cn } from '@/lib/utils';

export function LogoMark({ className }) {
  return (
    <span
      className={cn(
        'relative inline-flex h-8 w-8 items-center justify-center rounded-[10px] bg-gradient-to-br from-indigo-500 to-sky-500 shadow-md shadow-indigo-500/30',
        className,
      )}
    >
      <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="white" strokeWidth={2.6} strokeLinecap="round" aria-hidden>
        <path d="M5 7h14M5 12h9M5 17h11" />
      </svg>
    </span>
  );
}

export function Logo({ className, collapsed }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <LogoMark />
      {!collapsed && <span className="font-display text-lg font-extrabold tracking-tight">EventFlow</span>}
    </span>
  );
}
