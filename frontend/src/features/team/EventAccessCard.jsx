import { useEffect, useState } from 'react';
import { Eye, KeyRound, Lock, Trash2, X } from 'lucide-react';
import { Avatar, Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, FormField } from '@/components/ui';
import { PasswordInput } from '@/components/common/PasswordInput';
import { useWorkspace, useWorkspaceEvent } from '@/features/workspace/WorkspaceContext';
import { useToast } from '@/context/ToastContext';
import { backend } from '@/services';
import { relativeTime } from '@/lib/time';

/**
 * Role-based access, part 2: the event password.
 * - Admin: sets / changes / removes the password and can remove viewers.
 * - Organizers: see whether a password is set and who is viewing.
 * - Anyone with the password can open the event from "All events" — view only.
 */
export function EventAccessCard() {
  const event = useWorkspaceEvent();
  const { role } = useWorkspace();
  const isAdmin = role === 'admin';
  const toast = useToast();
  const [current, setCurrent] = useState(undefined); // undefined = loading, null = no password
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [viewers, setViewers] = useState([]);

  useEffect(() => backend.subscribeViewers(event.id, setViewers), [event.id]);
  useEffect(() => {
    if (!isAdmin) return;
    backend
      .getEventPassword(event.id)
      .then((p) => setCurrent(p ?? null))
      .catch(() => setCurrent(null));
  }, [event.id, isAdmin]);

  const save = async (value) => {
    if (value !== null && value.trim().length < 4) return toast.warning('Use at least 4 characters');
    setBusy(true);
    try {
      await backend.setEventPassword(event.id, value?.trim() ?? null);
      setCurrent(value?.trim() ?? null);
      setDraft('');
      toast.success(
        value ? 'Event password saved' : 'Password removed',
        value ? 'Share it with people who should see this event.' : 'Only you and your organizers can open the event now.',
      );
    } catch (e) {
      toast.error('Could not save the password', e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-primary" /> Event password & viewers
          </CardTitle>
          <CardDescription>
            Every signed-in user can see this event's name, date and venue in <b>All events</b>. To open it they need this password — and they can only view,
            not edit.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {isAdmin ? (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              {current === undefined ? (
                <span className="text-muted-foreground">Checking…</span>
              ) : current ? (
                <>
                  <Badge tone="success">
                    <Lock className="h-3 w-3" /> Password set
                  </Badge>
                  <span className="text-muted-foreground">
                    Current password: <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-foreground">{current}</code>
                  </span>
                  <Button variant="ghost" size="sm" className="text-danger" onClick={() => save(null)} disabled={busy}>
                    <X className="h-3.5 w-3.5" /> Remove
                  </Button>
                </>
              ) : (
                <Badge tone="muted">
                  <Lock className="h-3 w-3" /> No password — only you and your organizers can open it
                </Badge>
              )}
            </div>
            <form
              className="flex flex-col gap-2 sm:flex-row sm:items-end"
              onSubmit={(e) => {
                e.preventDefault();
                void save(draft);
              }}
            >
              <FormField label={current ? 'Change password' : 'Set a password'} htmlFor="ev-pw" className="flex-1">
                <PasswordInput
                  id="ev-pw"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="At least 4 characters"
                  autoComplete="new-password"
                />
              </FormField>
              <Button type="submit" loading={busy} disabled={!draft.trim()}>
                <KeyRound className="h-4 w-4" /> Save password
              </Button>
            </form>
          </div>
        ) : (
          <p className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">Only the admin can set or change the event password.</p>
        )}

        <div>
          <p className="mb-2 flex items-center gap-2 text-sm font-semibold">
            <Eye className="h-4 w-4 text-muted-foreground" /> People viewing with the password ({viewers.length})
          </p>
          {viewers.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nobody yet.</p>
          ) : (
            <ul className="divide-y rounded-xl border">
              {viewers.map((v) => (
                <li key={v.uid} className="flex items-center gap-3 px-3 py-2.5">
                  <Avatar name={v.name} size={30} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{v.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {v.email} · joined {relativeTime(v.joinedAt)}
                    </p>
                  </div>
                  <Badge tone="muted">View only</Badge>
                  {isAdmin && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-danger"
                      aria-label={`Remove ${v.name}`}
                      onClick={async () => {
                        try {
                          await backend.removeViewer(event.id, v.uid);
                          toast.success(`${v.name} can no longer view this event`);
                        } catch (e) {
                          toast.error('Could not remove', e.message);
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
