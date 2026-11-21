import { useEffect, useState } from 'react';
import { api } from '@/services/api';
import { Cloud, FlaskConical, Monitor, Moon, Sun, Trash2 } from 'lucide-react';
import { Avatar, Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, ConfirmDialog, PageHeader } from '@/components/ui';
import { useUser } from '@/context/AuthContext';
import { useEvents } from '@/context/EventsContext';
import { useTheme } from '@/context/ThemeContext';
import { useToast } from '@/context/ToastContext';
import { backend, dataMode } from '@/services';
import { cn } from '@/lib/utils';

export default function Settings() {
  const user = useUser();
  const { theme, setTheme } = useTheme();
  const { events } = useEvents();
  const toast = useToast();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const samples = events.filter((e) => e.isSample && e.ownerId === user.uid);
  const [health, setHealth] = useState(null);
  useEffect(() => {
    api
      .health()
      .then(setHealth)
      .catch(() => setHealth('offline'));
  }, []);

  const removeSamples = async () => {
    setBusy(true);
    try {
      for (const e of samples) await backend.deleteEvent(e.id);
      toast.success('Sample events removed');
      setConfirm(false);
    } catch (e) {
      toast.error('Could not remove sample events', e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title="Settings" description="Your profile, appearance and data." />
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Profile</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="flex items-center gap-4">
          <Avatar name={user.displayName} size={56} />
          <div>
            <p className="font-semibold">{user.displayName}</p>
            <p className="text-sm text-muted-foreground">{user.email}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Appearance</CardTitle>
            <CardDescription>Choose light or dark mode. Saved on this device.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-3 gap-3">
          {[
            ['light', Sun, 'Light'],
            ['dark', Moon, 'Dark'],
            ['system', Monitor, 'System'],
          ].map(([k, Icon, label]) => {
            const active = k === theme;
            return (
              <button
                key={k}
                onClick={() => setTheme(k === 'system' ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : k)}
                className={cn(
                  'flex flex-col items-center gap-2 rounded-xl border p-4 text-sm font-medium transition hover:border-primary/40',
                  active && 'border-primary bg-primary/5 ring-2 ring-primary/20',
                )}
                aria-pressed={active}
              >
                <Icon className="h-5 w-5" /> {label}
              </button>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Data</CardTitle>
            <CardDescription>Where your events are stored.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3 rounded-xl border p-4">
            {dataMode === 'firebase' ? <Cloud className="h-5 w-5 text-primary" /> : <FlaskConical className="h-5 w-5 text-warning" />}
            <div className="flex-1">
              <p className="text-sm font-medium">{dataMode === 'firebase' ? 'Cloud Firestore' : 'Sample data mode (local browser storage)'}</p>
              <p className="text-xs text-muted-foreground">
                {dataMode === 'firebase'
                  ? 'Synced in real time and protected by Firestore security rules.'
                  : 'Add Firebase keys to frontend/.env to switch to Firestore.'}
              </p>
            </div>
            <Badge tone={dataMode === 'firebase' ? 'success' : 'warning'}>{dataMode === 'firebase' ? 'Connected' : 'Local'}</Badge>
          </div>
          {samples.length > 0 && (
            <div className="flex items-center justify-between gap-3 rounded-xl border p-4">
              <div>
                <p className="text-sm font-medium">Sample events</p>
                <p className="text-xs text-muted-foreground">{samples.length} sample event(s) in your account.</p>
              </div>
              <Button variant="outline" size="sm" disabled={!samples.length} onClick={() => setConfirm(true)}>
                <Trash2 className="h-4 w-4" /> Remove samples
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Backend services</CardTitle>
            <CardDescription>Status of the EventFlow API (backend folder).</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {health === null ? (
            <p className="text-sm text-muted-foreground">Checking…</p>
          ) : health === 'offline' ? (
            <p className="rounded-lg bg-danger/10 p-3 text-sm text-danger">
              Backend not reachable. Start it with <code className="font-mono">cd backend &amp;&amp; npm run dev</code> (or{' '}
              <code className="font-mono">npm run dev</code> in the project root).
            </p>
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2">
              {[
                ['Gemini AI', health.features.ai === 'gemini' ? 'Connected' : 'Not set up — add GEMINI_API_KEY', health.features.ai === 'gemini'],
                ['Mailgun email', health.features.email === 'mailgun' ? 'Sending real emails' : 'Preview mode', health.features.email === 'mailgun'],
                ['Firebase Admin', health.features.firebaseAdmin ? 'Verifying logins' : 'Dev mode', health.features.firebaseAdmin],
              ].map(([label, value, on]) => (
                <li key={label} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                  <span className="font-medium">{label}</span>
                  <Badge tone={on ? 'success' : 'warning'}>{value}</Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        onConfirm={removeSamples}
        loading={busy}
        title="Remove all sample events?"
        description={`This deletes ${samples.length} sample event(s) and all of their data. Your own events are not affected.`}
        confirmLabel="Remove"
      />
    </div>
  );
}
