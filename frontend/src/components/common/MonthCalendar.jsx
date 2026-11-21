import { useMemo, useState } from 'react';
import { addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format, isSameMonth, startOfMonth, startOfWeek } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui';
import { cn } from '@/lib/utils';
import { todayISO } from '@/lib/time';

/** Month grid with keyboard-reachable day cells. `compact` shows dots instead of labels. */
export function MonthCalendar({ items, compact, onSelectDay, selectedDay }) {
  const [cursor, setCursor] = useState(() => new Date());
  const today = todayISO();

  const days = useMemo(() => eachDayOfInterval({ start: startOfWeek(startOfMonth(cursor)), end: endOfWeek(endOfMonth(cursor)) }), [cursor]);

  const byDay = useMemo(() => {
    const m = new Map();
    for (const it of items) m.set(it.day, [...(m.get(it.day) ?? []), it]);
    return m;
  }, [items]);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-semibold" aria-live="polite">
          {format(cursor, 'MMMM yyyy')}
        </h3>
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={() => setCursor(new Date())}>
            Today
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setCursor((c) => addMonths(c, -1))} aria-label="Previous month">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setCursor((c) => addMonths(c, 1))} aria-label="Next month">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg border bg-border text-xs">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
          <div key={d} className="bg-muted/60 py-2 text-center font-medium text-muted-foreground">
            {compact ? d[0] : d}
          </div>
        ))}
        {days.map((d) => {
          const iso = format(d, 'yyyy-MM-dd');
          const list = byDay.get(iso) ?? [];
          const inMonth = isSameMonth(d, cursor);
          return (
            <button
              key={iso}
              onClick={() => onSelectDay?.(iso)}
              aria-label={`${format(d, 'EEEE, MMMM d')}${list.length ? `, ${list.length} item${list.length > 1 ? 's' : ''}` : ''}`}
              className={cn(
                'relative flex flex-col bg-card p-1.5 text-left transition hover:bg-muted/60',
                compact ? 'h-11 items-center' : 'min-h-[96px]',
                !inMonth && 'bg-card/60 text-muted-foreground/50',
                selectedDay === iso && 'ring-2 ring-inset ring-primary',
              )}
            >
              <span
                className={cn(
                  'flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium',
                  iso === today && 'bg-primary text-primary-foreground',
                )}
              >
                {format(d, 'd')}
              </span>
              {compact ? (
                <span className="mt-0.5 flex gap-0.5">
                  {list.slice(0, 3).map((it) => (
                    <span key={it.id} className="h-1.5 w-1.5 rounded-full" style={{ background: it.color }} />
                  ))}
                </span>
              ) : (
                <span className="mt-1 w-full space-y-0.5">
                  {list.slice(0, 3).map((it) => (
                    <span
                      key={it.id}
                      onClick={(e) => {
                        if (it.onClick) {
                          e.stopPropagation();
                          it.onClick();
                        }
                      }}
                      className={cn(
                        'block truncate rounded px-1.5 py-0.5 text-[11px] font-medium',
                        it.kind === 'deadline' ? 'border border-dashed' : 'text-white',
                      )}
                      style={it.kind === 'deadline' ? { borderColor: it.color, color: it.color } : { background: it.color }}
                    >
                      {it.label}
                    </span>
                  ))}
                  {list.length > 3 && <span className="block px-1 text-[10px] text-muted-foreground">+{list.length - 3} more</span>}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
