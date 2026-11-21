import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AlertTriangle, ArrowRight, CheckCircle2, Loader2, RefreshCw, Sparkles } from 'lucide-react';
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui';
import { useWorkspace, useWorkspaceEvent } from '@/features/workspace/WorkspaceContext';
import { useEventAlerts } from '@/features/alerts/useEventAlerts';
import { useToast } from '@/context/ToastContext';
import { api } from '@/services/api';
import { daysUntil, todayISO } from '@/lib/time';
import { pct } from '@/lib/utils';

/** "Explain this event" — an AI briefing of status, risks and next steps. */
export function AiBriefing() {
  const event = useWorkspaceEvent();
  const { sessions, rooms, speakers, tasks, resources, attendees, team } = useWorkspace();
  const alerts = useEventAlerts();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const explain = async () => {
    setLoading(true);
    const done = tasks.filter((t) => t.status === 'done').length;
    const req = resources.reduce((s, r) => s + r.required, 0);
    const alloc = resources.reduce((s, r) => s + Math.min(r.allocated, r.required), 0);
    const taskPct = pct(done, tasks.length);
    const resPct = pct(alloc, req);
    try {
      const r = await api.explainEvent(event, {
        daysUntil: daysUntil(event.startDate),
        isOver: event.endDate < todayISO(),
        registered: attendees.length,
        sessions: sessions.length,
        rooms: rooms.length,
        speakers: speakers.length,
        team: team.length,
        tasksTotal: tasks.length,
        tasksDone: done,
        resourcePct: resPct,
        readiness: tasks.length && req ? Math.round(taskPct * 0.6 + resPct * 0.4) : tasks.length ? taskPct : resPct,
        conflicts: alerts.conflicts.length,
        dateClashes: alerts.clashes.length,
        shortages: alerts.shortages.length,
        topShortage: alerts.shortages[0]?.name,
        overdue: alerts.overdue.length,
      });
      setResult(r);
    } catch (e) {
      toast.error('Could not explain the event', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="relative overflow-hidden border-primary/25 lg:col-span-3">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-primary/[0.06] via-transparent to-accent/[0.06]" />
      <CardHeader className="relative">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-sky-500 text-white">
            <Sparkles className="h-4 w-4" />
          </span>
          <div>
            <CardTitle>AI event briefing</CardTitle>
            <CardDescription>A plain-English explanation of where this event stands and what to do next.</CardDescription>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {result && <Badge tone="default">✨ Gemini</Badge>}
          <Button size="sm" onClick={explain} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : result ? <RefreshCw className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}{' '}
            {result ? 'Refresh' : 'Explain this event'}
          </Button>
        </div>
      </CardHeader>
      <AnimatePresence>
        {result && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="relative overflow-hidden">
            <CardContent className="space-y-4">
              <p className="text-[15px] leading-relaxed">{result.briefing.summary}</p>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-xl border bg-card p-4">
                  <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-success">
                    <CheckCircle2 className="h-4 w-4" /> Highlights
                  </p>
                  <ul className="space-y-1.5 text-sm text-muted-foreground">
                    {result.briefing.highlights.map((h) => (
                      <li key={h}>{h}</li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-xl border bg-card p-4">
                  <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-danger">
                    <AlertTriangle className="h-4 w-4" /> Risks
                  </p>
                  {result.briefing.risks.length ? (
                    <ul className="space-y-1.5 text-sm text-muted-foreground">
                      {result.briefing.risks.map((h) => (
                        <li key={h}>{h}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">No major risks found.</p>
                  )}
                </div>
                <div className="rounded-xl border bg-card p-4">
                  <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-primary">
                    <ArrowRight className="h-4 w-4" /> Next steps
                  </p>
                  <ol className="list-decimal space-y-1.5 pl-4 text-sm text-muted-foreground">
                    {result.briefing.nextSteps.map((h) => (
                      <li key={h}>{h}</li>
                    ))}
                  </ol>
                </div>
              </div>
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}
