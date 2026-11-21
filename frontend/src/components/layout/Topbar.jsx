import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarDays, Menu, Search } from 'lucide-react';
import { Button, Kbd } from '@/components/ui';
import { UserMenu } from '@/components/common/UserMenu';
import { ThemeToggle } from '@/components/common/ThemeToggle';
import { useEvents } from '@/context/EventsContext';
import { dateRange } from '@/lib/time';

/** Global event search with keyboard shortcut (Ctrl/⌘ + K) and arrow-key navigation. */
function EventSearch() {
  const { events } = useEvents();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef(null);
  const deferred = useDeferredValue(q);

  const results = useMemo(() => {
    const term = deferred.trim().toLowerCase();
    if (!term) return [];
    return events.filter((e) => `${e.title} ${e.city} ${e.venue} ${e.category}`.toLowerCase().includes(term)).slice(0, 6);
  }, [deferred, events]);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const go = (id) => {
    navigate(`/app/events/${id}`);
    setQ('');
    setOpen(false);
    inputRef.current?.blur();
  };

  return (
    <div className="relative w-full max-w-md">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        ref={inputRef}
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
          setActive(0);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') setActive((a) => Math.min(a + 1, results.length - 1));
          if (e.key === 'ArrowUp') setActive((a) => Math.max(a - 1, 0));
          if (e.key === 'Enter' && results[active]) go(results[active].id);
          if (e.key === 'Escape') inputRef.current?.blur();
        }}
        role="combobox"
        aria-expanded={open && results.length > 0}
        aria-controls="event-search-results"
        aria-label="Search events"
        placeholder="Search events…"
        className="h-10 w-full rounded-lg border bg-muted/50 pl-9 pr-14 text-sm outline-none transition focus:border-primary focus:bg-surface focus:ring-2 focus:ring-primary/20"
      />
      <span className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 sm:block">
        <Kbd>Ctrl K</Kbd>
      </span>
      {open && deferred.trim() && (
        <ul id="event-search-results" role="listbox" className="absolute left-0 right-0 top-12 z-50 overflow-hidden rounded-xl border bg-card p-1 shadow-lift">
          {results.length === 0 ? (
            <li className="px-3 py-4 text-center text-sm text-muted-foreground">No events match “{deferred}”.</li>
          ) : (
            results.map((e, i) => (
              <li key={e.id} role="option" aria-selected={i === active}>
                <button
                  onMouseDown={(ev) => ev.preventDefault()}
                  onClick={() => go(e.id)}
                  onMouseEnter={() => setActive(i)}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left ${i === active ? 'bg-muted' : ''}`}
                >
                  <CalendarDays className="h-4 w-4 text-primary" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{e.title}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {dateRange(e)} · {e.city}
                    </span>
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}

export function Topbar({ onMenu }) {
  return (
    <header className="glass sticky top-0 z-20 flex h-16 items-center gap-3 border-b px-4 sm:px-6 lg:px-8">
      <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenu} aria-label="Open menu">
        <Menu className="h-5 w-5" />
      </Button>
      <EventSearch />
      <div className="ml-auto flex items-center gap-1.5">
        <ThemeToggle />
        <UserMenu />
      </div>
    </header>
  );
}
