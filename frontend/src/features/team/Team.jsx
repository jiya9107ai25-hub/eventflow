import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Mail, MoreHorizontal, Pencil, Plus, Trash2, UserCog } from 'lucide-react';
import { Avatar, Badge, Button, Card, ConfirmDialog, Dialog, Dropdown, EmptyState, FormField, Input, Progress, Skeleton, Textarea } from '@/components/ui';
import { useWorkspace } from '@/features/workspace/WorkspaceContext';
import { useToast } from '@/context/ToastContext';
import { pct } from '@/lib/utils';
import { teamSchema } from '@/schemas';
import { OrganizersCard } from './OrganizersCard';
import { EventAccessCard } from './EventAccessCard';

export default function Team() {
  const { team, tasks, loading, add, update, remove } = useWorkspace();
  const toast = useToast();
  const [dlg, setDlg] = useState({ open: false, editing: null });
  const [del, setDel] = useState(null);

  const workload = useMemo(() => {
    const m = new Map();
    for (const t of tasks) {
      if (!t.assigneeId) continue;
      const w = m.get(t.assigneeId) ?? { total: 0, done: 0 };
      w.total++;
      if (t.status === 'done') w.done++;
      m.set(t.assigneeId, w);
    }
    return m;
  }, [tasks]);

  if (loading.team) return <Skeleton className="h-80" />;

  return (
    <div className="space-y-5">
      <OrganizersCard />
      <EventAccessCard />
      <div className="flex items-center justify-between pt-2">
        <div>
          <h3 className="font-semibold">Team directory</h3>
          <p className="text-sm text-muted-foreground">
            {team.length} member(s) · volunteers, leads and helpers you assign tasks to (they don’t need an account)
          </p>
        </div>
        <Button onClick={() => setDlg({ open: true, editing: null })}>
          <Plus className="h-4 w-4" /> Add member
        </Button>
      </div>

      {team.length === 0 ? (
        <EmptyState
          icon={<UserCog className="h-7 w-7" />}
          title="Build your organizing team"
          description="Add the people running this event, give them a role and responsibilities, then assign tasks to them on the board."
          action={
            <Button onClick={() => setDlg({ open: true, editing: null })}>
              <Plus className="h-4 w-4" /> Add first member
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {team.map((m) => {
            const w = workload.get(m.id) ?? { total: 0, done: 0 };
            return (
              <Card key={m.id} className="p-5 transition hover:shadow-lift">
                <div className="flex items-start gap-3">
                  <Avatar name={m.name} size={48} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{m.name}</p>
                    <Badge className="mt-1">{m.role}</Badge>
                  </div>
                  <Dropdown
                    label={`Actions for ${m.name}`}
                    trigger={
                      <span className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-muted">
                        <MoreHorizontal className="h-4 w-4" />
                      </span>
                    }
                    items={[
                      { label: 'Edit', icon: <Pencil className="h-4 w-4" />, onSelect: () => setDlg({ open: true, editing: m }) },
                      { label: 'Remove', icon: <Trash2 className="h-4 w-4" />, danger: true, onSelect: () => setDel(m) },
                    ]}
                  />
                </div>
                <p className="mt-4 min-h-[40px] text-sm text-muted-foreground">{m.responsibilities || 'No responsibilities assigned yet.'}</p>
                <div className="mt-4 border-t pt-4">
                  <div className="mb-1.5 flex justify-between text-xs">
                    <span className="font-medium">Tasks</span>
                    <span className="text-muted-foreground">
                      {w.done}/{w.total} done
                    </span>
                  </div>
                  <Progress value={pct(w.done, w.total)} tone="success" label={`${m.name} task progress`} />
                </div>
                <a href={`mailto:${m.email}`} className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary">
                  <Mail className="h-3.5 w-3.5" /> {m.email}
                </a>
              </Card>
            );
          })}
        </div>
      )}

      <TeamDialog
        state={dlg}
        onClose={() => setDlg({ open: false, editing: null })}
        onSave={async (v) => {
          const ok = dlg.editing
            ? await update('team', dlg.editing.id, v, `Updated team member ${v.name}`)
            : !!(await add('team', v, `Added ${v.name} to the team`));
          if (ok) {
            toast.success(dlg.editing ? 'Member updated' : 'Member added', v.name);
            setDlg({ open: false, editing: null });
          }
        }}
      />
      <ConfirmDialog
        open={!!del}
        onClose={() => setDel(null)}
        title={`Remove ${del?.name}?`}
        description="Their tasks will become unassigned."
        confirmLabel="Remove"
        onConfirm={async () => {
          if (!del) return;
          await Promise.all(tasks.filter((t) => t.assigneeId === del.id).map((t) => update('tasks', t.id, { assigneeId: null })));
          if (await remove('team', del.id, `Removed ${del.name} from the team`)) toast.success('Member removed');
          setDel(null);
        }}
      />
    </div>
  );
}

function TeamDialog({ state, onClose, onSave }) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(teamSchema) });
  useEffect(() => {
    if (!state.open) return;
    const e = state.editing;
    reset(e ? { name: e.name, email: e.email, role: e.role, responsibilities: e.responsibilities } : { name: '', email: '', role: '', responsibilities: '' });
  }, [state, reset]);
  const submit = handleSubmit(onSave);
  return (
    <Dialog
      open={state.open}
      onClose={onClose}
      title={state.editing ? 'Edit team member' : 'Add team member'}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} loading={isSubmitting}>
            Save
          </Button>
        </>
      }
    >
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2" noValidate>
        <FormField label="Name" htmlFor="tm-name" error={errors.name?.message}>
          <Input id="tm-name" {...register('name')} />
        </FormField>
        <FormField label="Email" htmlFor="tm-email" error={errors.email?.message}>
          <Input id="tm-email" type="email" {...register('email')} />
        </FormField>
        <FormField label="Role" htmlFor="tm-role" error={errors.role?.message} className="sm:col-span-2">
          <Input id="tm-role" {...register('role')} placeholder="e.g. Logistics lead" />
        </FormField>
        <FormField label="Responsibilities" htmlFor="tm-resp" className="sm:col-span-2">
          <Textarea id="tm-resp" rows={3} {...register('responsibilities')} placeholder="e.g. Venue booking, equipment, catering" />
        </FormField>
        <button type="submit" hidden />
      </form>
    </Dialog>
  );
}
