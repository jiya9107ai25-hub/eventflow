import { memo, useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AnimatePresence, motion } from 'motion/react';
import { Boxes, Hand, MoreHorizontal, Package, Pencil, Plus, Search, Trash2, UserPlus, Users, X } from 'lucide-react';
import { Avatar, Badge, Button, Card, ConfirmDialog, Dialog, Dropdown, EmptyState, FormField, Input, Progress, Select, Skeleton } from '@/components/ui';
import { StatCard } from '@/components/common/StatCard';
import { useWorkspace, useWorkspaceEvent } from '@/features/workspace/WorkspaceContext';
import { useUser } from '@/context/AuthContext';
import { useEvents } from '@/context/EventsContext';
import { useToast } from '@/context/ToastContext';
import { REQUIREMENT_META, RESOURCE_CATEGORY_LABEL } from '@/lib/constants';
import { cn, pct } from '@/lib/utils';
import { resourceSchema } from '@/schemas';
import { backend } from '@/services';

function statusOf(r) {
  const p = pct(r.allocated, r.required);
  if (r.allocated >= r.required) return { label: 'Fully allocated', tone: 'success', bar: 'success' };
  if (p < 50) return { label: 'Critical shortage', tone: 'danger', bar: 'danger' };
  return { label: 'Partially allocated', tone: 'warning', bar: 'warning' };
}

export default function Resources() {
  const event = useWorkspaceEvent();
  const { resources, allocations, loading, add, update, remove, canEdit } = useWorkspace();
  const toast = useToast();
  const [dlg, setDlg] = useState({ open: false, editing: null });
  const [del, setDel] = useState(null);
  const [filter, setFilter] = useState('all');
  const [q, setQ] = useState('');

  const totals = useMemo(() => {
    const required = resources.reduce((s, r) => s + r.required, 0);
    const allocated = resources.reduce((s, r) => s + Math.min(r.allocated, r.required), 0);
    return { required, allocated, short: resources.filter((r) => r.allocated < r.required).length };
  }, [resources]);

  // Suggest resource modules chosen in the creation wizard that don't exist yet.
  const suggestions = event.requirements.filter(
    (k) => REQUIREMENT_META[k].resource && !resources.some((r) => r.name.toLowerCase() === REQUIREMENT_META[k].label.toLowerCase()),
  );

  const visible = resources
    .filter((r) => (filter === 'all' ? true : filter === 'short' ? r.allocated < r.required : r.category === filter))
    .filter((r) => r.name.toLowerCase().includes(q.trim().toLowerCase()))
    .sort((a, b) => pct(a.allocated, a.required) - pct(b.allocated, b.required));

  if (loading.resources) return <Skeleton className="h-96" />;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Overall allocation"
          value={`${pct(totals.allocated, totals.required)}%`}
          icon={<Boxes className="h-[18px] w-[18px]" />}
          hint={`${totals.allocated} of ${totals.required} units`}
        />
        <StatCard
          label="Resources tracked"
          value={resources.length}
          icon={<Package className="h-[18px] w-[18px]" />}
          tone="accent"
          hint={`${resources.filter((r) => r.category === 'people').length} people roles`}
        />
        <StatCard
          label="Shortages"
          value={totals.short}
          icon={<Hand className="h-[18px] w-[18px]" />}
          tone="warning"
          hint={totals.short ? 'Need attention' : 'All covered'}
        />
      </div>

      {canEdit && suggestions.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-dashed p-3">
          <span className="text-sm text-muted-foreground">Suggested for this event:</span>
          {suggestions.map((k) => (
            <Button
              key={k}
              size="sm"
              variant="outline"
              onClick={() =>
                setDlg({
                  open: true,
                  editing: null,
                  preset: { name: REQUIREMENT_META[k].label, category: REQUIREMENT_META[k].resource.category, unit: REQUIREMENT_META[k].resource.unit },
                })
              }
            >
              <Plus className="h-3.5 w-3.5" /> {REQUIREMENT_META[k].label}
            </Button>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative sm:w-56">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search resources" className="pl-9" aria-label="Search resources" />
          </div>
          <Select value={filter} onChange={(e) => setFilter(e.target.value)} className="sm:w-44" aria-label="Filter resources">
            <option value="all">All categories</option>
            <option value="short">Only shortages</option>
            {Object.entries(RESOURCE_CATEGORY_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </Select>
        </div>
        {canEdit && (
          <Button onClick={() => setDlg({ open: true, editing: null })}>
            <Plus className="h-4 w-4" /> Add resource
          </Button>
        )}
      </div>

      {resources.length === 0 ? (
        <EmptyState
          icon={<Boxes className="h-7 w-7" />}
          title="No resources yet"
          description="Track anything this event needs — volunteers, mentors, judges, chairs, projectors, laptops, catering…"
          action={
            canEdit && (
              <Button onClick={() => setDlg({ open: true, editing: null })}>
                <Plus className="h-4 w-4" /> Add first resource
              </Button>
            )
          }
        />
      ) : visible.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">No resources match this filter.</p>
      ) : (
        <motion.div layout className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          <AnimatePresence>
            {visible.map((r) => (
              <motion.div key={r.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }}>
                <ResourceCard
                  resource={r}
                  allocations={allocations.filter((a) => a.resourceId === r.id)}
                  eventId={event.id}
                  eventTitle={event.title}
                  onEdit={() => setDlg({ open: true, editing: r })}
                  onDelete={() => setDel(r)}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      <ResourceDialog
        state={dlg}
        onClose={() => setDlg({ open: false, editing: null })}
        onSave={async (v) => {
          const ok = dlg.editing
            ? await update('resources', dlg.editing.id, v, `Updated resource ${v.name}`)
            : !!(await add('resources', v, `Added resource ${v.name}`));
          if (ok) {
            toast.success(dlg.editing ? 'Resource updated' : 'Resource added', v.name);
            setDlg({ open: false, editing: null });
          }
        }}
      />
      <ConfirmDialog
        open={!!del}
        onClose={() => setDel(null)}
        title={`Delete ${del?.name}?`}
        description="The resource and its allocation records will be removed."
        onConfirm={async () => {
          if (!del) return;
          await Promise.all(allocations.filter((a) => a.resourceId === del.id).map((a) => remove('allocations', a.id)));
          if (await remove('resources', del.id, `Deleted resource ${del.name}`)) toast.success('Resource deleted');
          setDel(null);
        }}
      />
    </div>
  );
}

const ResourceCard = memo(function ResourceCard({ resource: r, allocations, eventId, eventTitle, onEdit, onDelete }) {
  const user = useUser();
  const { log } = useEvents();
  const toast = useToast();
  const { team, canEdit } = useWorkspace();
  const [assignee, setAssignee] = useState('');
  const [qty, setQty] = useState(1);
  const [busy, setBusy] = useState(false);
  const s = statusOf(r);
  const remaining = Math.max(0, r.required - r.allocated);
  const tracked = allocations.reduce((n, a) => n + a.quantity, 0);
  const isPeople = r.category === 'people';

  /** Uses a Firestore transaction — safe even if two organizers claim the last slot at once. */
  const claim = async (who, quantity) => {
    if (!who.trim()) return toast.warning('Enter who or what is being allocated');
    setBusy(true);
    try {
      await backend.claimResource(eventId, r.id, who.trim(), quantity);
      log({ eventId, eventTitle, text: `Allocated ${quantity} ${r.name} to ${who.trim()}`, kind: 'resource' });
      toast.success(`${r.name} allocated`, `${who.trim()} · ${quantity} ${r.unit}`);
      setAssignee('');
      setQty(1);
    } catch (e) {
      toast.error('Allocation failed', e.message);
    } finally {
      setBusy(false);
    }
  };

  const release = async (a) => {
    try {
      await backend.releaseAllocation(eventId, a);
      toast.info('Allocation released', `${a.assignee} · ${a.quantity} ${r.unit}`);
    } catch (e) {
      toast.error('Could not release', e.message);
    }
  };

  return (
    <Card className="flex h-full flex-col p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className={cn(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
              isPeople ? 'bg-sky-500/10 text-sky-500' : 'bg-primary/10 text-primary',
            )}
          >
            {isPeople ? <Users className="h-[18px] w-[18px]" /> : <Package className="h-[18px] w-[18px]" />}
          </span>
          <div className="min-w-0">
            <p className="truncate font-semibold">{r.name}</p>
            <p className="text-xs text-muted-foreground">{RESOURCE_CATEGORY_LABEL[r.category]}</p>
          </div>
        </div>
        {canEdit && (
          <Dropdown
            label={`Actions for ${r.name}`}
            trigger={
              <span className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-muted">
                <MoreHorizontal className="h-4 w-4" />
              </span>
            }
            items={[
              { label: 'Edit', icon: <Pencil className="h-4 w-4" />, onSelect: onEdit },
              { label: 'Delete', icon: <Trash2 className="h-4 w-4" />, danger: true, onSelect: onDelete },
            ]}
          />
        )}
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        {[
          ['Required', r.required],
          ['Allocated', r.allocated],
          ['Remaining', remaining],
        ].map(([l, v]) => (
          <div key={l} className="rounded-lg bg-muted/60 py-2">
            <p className="font-display text-lg font-bold">{v}</p>
            <p className="text-[11px] text-muted-foreground">{l}</p>
          </div>
        ))}
      </div>

      <div className="mt-4">
        <div className="mb-1.5 flex items-center justify-between">
          <Badge tone={s.tone}>{s.label}</Badge>
          <span className="text-xs font-medium text-muted-foreground">{pct(r.allocated, r.required)}%</span>
        </div>
        <Progress value={pct(r.allocated, r.required)} tone={s.bar} label={`${r.name} allocation`} />
      </div>

      {allocations.length > 0 && (
        <ul className="mt-4 max-h-32 space-y-1 overflow-y-auto scrollbar-thin">
          {[...allocations]
            .sort((a, b) => b.createdAt - a.createdAt)
            .map((a) => (
              <li key={a.id} className="group flex items-center gap-2 rounded-md px-1.5 py-1 text-sm hover:bg-muted/60">
                <Avatar name={a.assignee} size={22} />
                <span className="flex-1 truncate">{a.assignee}</span>
                {!isPeople && <span className="text-xs text-muted-foreground">×{a.quantity}</span>}
                {canEdit && (
                  <button
                    onClick={() => release(a)}
                    className="rounded p-0.5 text-muted-foreground opacity-0 transition hover:bg-danger/10 hover:text-danger focus:opacity-100 group-hover:opacity-100"
                    aria-label={`Release ${a.assignee}`}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </li>
            ))}
        </ul>
      )}
      {r.allocated > tracked && (
        <p className="mt-2 text-[11px] text-muted-foreground">
          {r.allocated - tracked} {r.unit} allocated without individual records.
        </p>
      )}

      <div className="mt-auto pt-4">
        {!canEdit ? (
          <p className={cn('text-center text-xs font-medium', remaining > 0 ? 'text-muted-foreground' : 'text-success')}>
            {remaining > 0 ? `${remaining} ${r.unit} still needed` : '✓ Requirement met'}
          </p>
        ) : remaining > 0 ? (
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void claim(assignee, isPeople ? 1 : qty);
            }}
          >
            <Input
              list={isPeople ? `team-${r.id}` : undefined}
              value={assignee}
              onChange={(e) => setAssignee(e.target.value)}
              placeholder={isPeople ? 'Assign a person…' : 'Source / vendor…'}
              className="h-9"
              aria-label={`Allocate ${r.name}`}
            />
            {isPeople && (
              <datalist id={`team-${r.id}`}>
                {team.map((t) => (
                  <option key={t.id} value={t.name} />
                ))}
              </datalist>
            )}
            {!isPeople && (
              <Input
                type="number"
                min={1}
                max={remaining}
                value={qty}
                onChange={(e) => setQty(Math.max(1, Number(e.target.value)))}
                className="h-9 w-20"
                aria-label="Quantity"
              />
            )}
            <Button type="submit" size="sm" className="h-9" loading={busy} aria-label="Allocate">
              <UserPlus className="h-4 w-4" />
            </Button>
          </form>
        ) : (
          <p className="text-center text-xs font-medium text-success">✓ Requirement met</p>
        )}
        {canEdit && isPeople && remaining > 0 && (
          <Button variant="ghost" size="sm" className="mt-2 w-full" onClick={() => claim(user.displayName, 1)} disabled={busy}>
            <Hand className="h-4 w-4" /> Claim a slot for myself ({remaining} left)
          </Button>
        )}
      </div>
    </Card>
  );
});

function ResourceDialog({ state, onClose, onSave }) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(resourceSchema) });
  useEffect(() => {
    if (!state.open) return;
    const e = state.editing;
    reset(
      e
        ? { name: e.name, category: e.category, unit: e.unit, required: e.required, allocated: e.allocated }
        : { name: '', category: 'equipment', unit: 'units', required: 10, allocated: 0, ...state.preset },
    );
  }, [state, reset]);
  const submit = handleSubmit(onSave);
  return (
    <Dialog
      open={state.open}
      onClose={onClose}
      title={state.editing ? 'Edit resource' : 'Add resource'}
      description="Anything this event needs: people, equipment, catering…"
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
        <FormField label="Name" htmlFor="res-name" error={errors.name?.message} className="sm:col-span-2">
          <Input id="res-name" {...register('name')} placeholder="e.g. Projectors, Volunteers, Lunch boxes" />
        </FormField>
        <FormField label="Category" htmlFor="res-cat">
          <Select id="res-cat" {...register('category')}>
            {Object.entries(RESOURCE_CATEGORY_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Unit" htmlFor="res-unit" error={errors.unit?.message}>
          <Input id="res-unit" {...register('unit')} placeholder="people, units, meals" />
        </FormField>
        <FormField label="Required quantity" htmlFor="res-req" error={errors.required?.message}>
          <Input id="res-req" type="number" min={1} {...register('required')} />
        </FormField>
        <FormField
          label="Already allocated"
          htmlFor="res-alloc"
          error={errors.allocated?.message}
          hint="Use the card controls to allocate to specific people or vendors."
        >
          <Input id="res-alloc" type="number" min={0} {...register('allocated')} />
        </FormField>
        <button type="submit" hidden />
      </form>
    </Dialog>
  );
}
