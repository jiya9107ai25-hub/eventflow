import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Crown, Hourglass, LogOut, MailPlus, ShieldCheck, UserMinus, X } from 'lucide-react';
import { Avatar, Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, ConfirmDialog, Input } from '@/components/ui';
import { useWorkspaceEvent } from '@/features/workspace/WorkspaceContext';
import { useEmail } from '@/features/alerts/useEmail';
import { useUser } from '@/context/AuthContext';
import { useEvents } from '@/context/EventsContext';
import { useToast } from '@/context/ToastContext';
import { backend } from '@/services';
import { relativeTime } from '@/lib/time';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Who can manage this event.
 *  - Admin (event owner): invite co-organizers by email, revoke invites, remove
 *    organizers, transfer the admin role, delete the event.
 *  - Organizers: full access to plan the event, can leave it.
 * Enforced server-side by firestore.rules, not just hidden in the UI.
 */
export function OrganizersCard() {
  const event = useWorkspaceEvent();
  const user = useUser();
  const { roleOf, log } = useEvents();
  const toast = useToast();
  const navigate = useNavigate();
  const { send } = useEmail();
  const [email, setEmail] = useState('');
  const [notify, setNotify] = useState(true);
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState(null);
  const isAdmin = roleOf(event) === 'admin';

  const members = event.memberIds.map((uid) => ({
    uid,
    name: event.members?.[uid]?.name ?? (uid === user.uid ? user.displayName : 'Organizer'),
    email: event.members?.[uid]?.email ?? (uid === user.uid ? user.email : ''),
    joinedAt: event.members?.[uid]?.joinedAt,
  }));
  members.sort((a, b) => (a.uid === event.ownerId ? -1 : b.uid === event.ownerId ? 1 : a.name.localeCompare(b.name)));
  const invites = event.invites ?? [];

  const invite = async () => {
    const e = email.trim().toLowerCase();
    if (!EMAIL_RE.test(e)) return toast.warning('Enter a valid email address');
    if (members.some((m) => m.email === e)) return toast.info('Already an organizer', e);
    if (invites.includes(e)) return toast.info('Already invited', e);
    setBusy(true);
    try {
      await backend.inviteOrganizer(event.id, e);
      log({ eventId: event.id, eventTitle: event.title, text: `Invited ${e} as co-organizer`, kind: 'team' });
      toast.success('Invitation created', `${e} will get access as soon as they log in or sign up with this email.`);
      if (notify) void send({ event, to: [e], template: 'organizer-invite', data: { inviterName: user.displayName, inviteeEmail: e }, quiet: false });
      setEmail('');
    } catch (err) {
      toast.error('Could not invite', err.message);
    } finally {
      setBusy(false);
    }
  };

  const confirm = async () => {
    if (!pending) return;
    setBusy(true);
    try {
      if (pending.kind === 'transfer') {
        await backend.transferOwnership(event.id, pending.uid);
        log({ eventId: event.id, eventTitle: event.title, text: `Made ${pending.name} the admin`, kind: 'team' });
        toast.success(`${pending.name} is now the admin`, 'You remain a co-organizer.');
      } else if (pending.kind === 'remove') {
        await backend.removeMember(event.id, pending.uid);
        log({ eventId: event.id, eventTitle: event.title, text: `Removed ${pending.name} from organizers`, kind: 'team' });
        toast.success(`${pending.name} removed`);
      } else {
        await backend.removeMember(event.id, user.uid);
        toast.info(`You left “${event.title}”`);
        navigate('/app/events');
      }
      setPending(null);
    } catch (err) {
      toast.error('Action failed', err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" /> Organizers &amp; access
          </CardTitle>
          <CardDescription>
            People who can log in and manage this event. {isAdmin ? 'You are the admin.' : 'Only the admin can invite or remove organizers.'}
          </CardDescription>
        </div>
        <Badge tone={isAdmin ? 'warning' : 'default'}>
          {isAdmin ? (
            <>
              <Crown className="h-3 w-3" /> You’re the admin
            </>
          ) : (
            'You’re an organizer'
          )}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <ul className="divide-y rounded-xl border">
          {members.map((m) => {
            const admin = m.uid === event.ownerId;
            const me = m.uid === user.uid;
            return (
              <li key={m.uid} className="flex flex-wrap items-center gap-3 p-3">
                <Avatar name={m.name} size={36} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {m.name}
                    {me && <span className="text-muted-foreground"> (you)</span>}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {m.email || 'Email appears when they next open the event'}
                    {m.joinedAt ? ` · joined ${relativeTime(m.joinedAt)}` : ''}
                  </p>
                </div>
                <Badge tone={admin ? 'warning' : 'muted'}>
                  {admin ? (
                    <>
                      <Crown className="h-3 w-3" /> Admin
                    </>
                  ) : (
                    'Organizer'
                  )}
                </Badge>
                {isAdmin && !admin && (
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => setPending({ kind: 'transfer', uid: m.uid, name: m.name })}>
                      <Crown className="h-3.5 w-3.5" /> Make admin
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-danger hover:bg-danger/10"
                      onClick={() => setPending({ kind: 'remove', uid: m.uid, name: m.name })}
                      aria-label={`Remove ${m.name}`}
                    >
                      <UserMinus className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
                {!isAdmin && me && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-danger hover:bg-danger/10"
                    onClick={() => setPending({ kind: 'leave', uid: m.uid, name: m.name })}
                  >
                    <LogOut className="h-3.5 w-3.5" /> Leave
                  </Button>
                )}
              </li>
            );
          })}
          {invites.map((e) => (
            <li key={e} className="flex flex-wrap items-center gap-3 bg-muted/30 p-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full border border-dashed text-muted-foreground">
                <Hourglass className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{e}</p>
                <p className="text-xs text-muted-foreground">Invited — joins automatically when they log in or sign up with this email</p>
              </div>
              <Badge tone="info">Pending</Badge>
              {isAdmin && (
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => send({ event, to: [e], template: 'organizer-invite', data: { inviterName: user.displayName, inviteeEmail: e } })}
                  >
                    Resend
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-label={`Revoke invite for ${e}`}
                    onClick={() => backend.revokeInvite(event.id, e).then(() => toast.info('Invitation revoked', e))}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>

        {isAdmin && (
          <form
            className="space-y-2"
            onSubmit={(ev) => {
              ev.preventDefault();
              void invite();
            }}
          >
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="co-organizer@example.com"
                aria-label="Invite co-organizer by email"
              />
              <Button type="submit" loading={busy}>
                <MailPlus className="h-4 w-4" /> Invite organizer
              </Button>
            </div>
            <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
              <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} className="accent-[hsl(var(--primary))]" />
              Send them an invitation email
            </label>
          </form>
        )}
      </CardContent>

      <ConfirmDialog
        open={!!pending}
        onClose={() => setPending(null)}
        onConfirm={confirm}
        loading={busy}
        title={pending?.kind === 'transfer' ? `Make ${pending.name} the admin?` : pending?.kind === 'remove' ? `Remove ${pending?.name}?` : 'Leave this event?'}
        description={
          pending?.kind === 'transfer'
            ? `${pending.name} will be able to invite and remove organizers and delete the event. You will stay on as a co-organizer.`
            : pending?.kind === 'remove'
              ? 'They will immediately lose access to this event and all of its data.'
              : 'You will lose access to this event. The admin can invite you again later.'
        }
        confirmLabel={pending?.kind === 'transfer' ? 'Make admin' : pending?.kind === 'remove' ? 'Remove' : 'Leave event'}
      />
    </Card>
  );
}
