import { motion } from 'motion/react';
import { AlertTriangle, CalendarDays, CheckCircle2, Users } from 'lucide-react';

/** Purely illustrative product preview built from real UI primitives (not a screenshot). */
export function HeroMockup() {
  const bars = [42, 58, 50, 72, 64, 86, 78];
  return (
    <motion.div
      initial={{ opacity: 0, y: 40, rotateX: 8 }}
      animate={{ opacity: 1, y: 0, rotateX: 0 }}
      transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className="relative mx-auto w-full max-w-5xl [perspective:1400px]"
      aria-label="Illustrative preview of the EventFlow dashboard"
      role="img"
    >
      <div className="absolute -inset-x-10 -top-10 bottom-0 -z-10 rounded-[40px] bg-gradient-to-tr from-primary/25 via-accent/15 to-transparent blur-3xl" />
      <div className="overflow-hidden rounded-2xl border bg-card shadow-lift">
        {/* window chrome */}
        <div className="flex items-center gap-2 border-b bg-muted/50 px-4 py-2.5">
          <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
          <span className="ml-3 rounded-md bg-background px-3 py-0.5 text-[11px] text-muted-foreground">app.eventflow.io/dashboard</span>
        </div>
        <div className="grid grid-cols-12 gap-0">
          <div className="col-span-3 hidden border-r p-4 md:block">
            {['Dashboard', 'Events', 'Calendar', 'Analytics'].map((l, i) => (
              <div key={l} className={`mb-1 rounded-md px-3 py-2 text-xs font-medium ${i === 0 ? 'bg-primary/10 text-primary' : 'text-muted-foreground'}`}>
                {l}
              </div>
            ))}
            <p className="mb-2 mt-5 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Events</p>
            {['HackSphere', 'DevSummit', 'Spring Fest'].map((l, i) => (
              <div key={l} className="flex items-center gap-2 px-3 py-1.5 text-xs text-muted-foreground">
                <span className={`h-1.5 w-1.5 rounded-full ${['bg-indigo-500', 'bg-sky-500', 'bg-rose-500'][i]}`} />
                {l}
              </div>
            ))}
          </div>
          <div className="col-span-12 space-y-4 p-4 sm:p-5 md:col-span-9">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { l: 'Total events', v: '12', i: CalendarDays },
                { l: 'Attendees', v: '1,284', i: Users },
                { l: 'Tasks done', v: '76%', i: CheckCircle2 },
                { l: 'Conflicts', v: '1', i: AlertTriangle },
              ].map(({ l, v, i: Icon }) => (
                <div key={l} className="rounded-xl border p-3">
                  <Icon className="mb-2 h-4 w-4 text-primary" />
                  <p className="text-lg font-bold leading-none">{v}</p>
                  <p className="mt-1 text-[10px] text-muted-foreground">{l}</p>
                </div>
              ))}
            </div>
            <div className="grid gap-3 sm:grid-cols-5">
              <div className="rounded-xl border p-3 sm:col-span-3">
                <p className="mb-3 text-xs font-semibold">Registrations</p>
                <div className="flex h-28 items-end gap-2">
                  {bars.map((h, i) => (
                    <motion.div
                      key={i}
                      initial={{ height: 0 }}
                      animate={{ height: `${h}%` }}
                      transition={{ delay: 0.6 + i * 0.06, duration: 0.6, ease: 'easeOut' }}
                      className="flex-1 rounded-t-md bg-gradient-to-t from-primary/60 to-primary"
                    />
                  ))}
                </div>
              </div>
              <div className="space-y-2 rounded-xl border p-3 sm:col-span-2">
                <p className="text-xs font-semibold">Schedule · Main Hall</p>
                {[
                  ['09:00', 'Opening Keynote', 'border-violet-500'],
                  ['10:15', 'Team Formation', 'border-sky-500'],
                  ['11:30', 'APIs that Scale', 'border-indigo-500'],
                ].map(([t, n, c]) => (
                  <div key={n} className={`rounded-md border-l-2 bg-muted/60 px-2 py-1.5 ${c}`}>
                    <p className="text-[10px] text-muted-foreground">{t}</p>
                    <p className="text-[11px] font-medium">{n}</p>
                  </div>
                ))}
                <div className="flex items-center gap-1.5 rounded-md bg-amber-500/10 px-2 py-1.5 text-[10px] font-medium text-amber-700 dark:text-amber-400">
                  <AlertTriangle className="h-3 w-3" /> Speaker double-booked at 3 PM
                </div>
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              {[
                ['Volunteers', 70],
                ['Projectors', 75],
                ['Meals', 90],
              ].map(([l, v]) => (
                <div key={l} className="rounded-xl border p-3">
                  <div className="mb-1.5 flex justify-between text-[11px]">
                    <span className="font-medium">{l}</span>
                    <span className="text-muted-foreground">{v}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${v}%` }}
                      transition={{ delay: 1, duration: 0.8 }}
                      className="h-full rounded-full bg-success"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
