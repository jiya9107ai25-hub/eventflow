import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ArrowUpDown, Download, FileUp, GraduationCap, Search, Trash2, UserPlus, Users, UsersRound } from 'lucide-react';
import { Avatar, Badge, Button, ConfirmDialog, Dialog, EmptyState, FormField, Input, Progress, Select, Skeleton } from '@/components/ui';
import { StatCard } from '@/components/common/StatCard';
import { useWorkspace, useWorkspaceEvent } from '@/features/workspace/WorkspaceContext';
import { useToast } from '@/context/ToastContext';
import { useDebounce } from '@/hooks/useDebounce';
import { backend } from '@/services';
import { TICKET_LABEL } from '@/lib/constants';
import { cn, pct } from '@/lib/utils';
import { attendeeSchema } from '@/schemas';
import { CsvImportDialog } from './CsvImportDialog';

const ROW_H = 60;

export default function Attendees() {
  const event = useWorkspaceEvent();
  const { attendees, loading, add, remove } = useWorkspace();
  const toast = useToast();
  const [q, setQ] = useState('');
  const [ticket, setTicket] = useState('all');
  const [sort, setSort] = useState({ key: 'createdAt', dir: -1 });
  const [addOpen, setAddOpen] = useState(false);
  const [csvOpen, setCsvOpen] = useState(false);
  const [del, setDel] = useState(null);

  // Debounce keystrokes, then defer the heavy filter so typing stays responsive with thousands of rows.
  const debounced = useDebounce(q, 200);
  const deferredQ = useDeferredValue(debounced);
  const stale = deferredQ !== q;

  const rows = useMemo(() => {
    const term = deferredQ.trim().toLowerCase();
    return attendees
      .filter((a) => ticket === 'all' || a.ticketType === ticket)
      .filter((a) => !term || `${a.name} ${a.email} ${a.organization}`.toLowerCase().includes(term))
      .sort((a, b) => {
        const av = a[sort.key];
        const bv = b[sort.key];
        return (av < bv ? -1 : av > bv ? 1 : 0) * sort.dir;
      });
  }, [attendees, deferredQ, ticket, sort]);

  const stats = useMemo(() => {
    const by = (t) => attendees.filter((a) => a.ticketType === t).length;
    const students = by('student');
    const parents = by('parent');
    return { total: attendees.length, students, parents, others: attendees.length - students - parents };
  }, [attendees]);

  // Virtualised list: only the visible rows are in the DOM.
  const parentRef = useRef(null);
  const virtualizer = useVirtualizer({ count: rows.length, getScrollElement: () => parentRef.current, estimateSize: () => ROW_H, overscan: 8 });

  const existingEmails = useMemo(() => new Set(attendees.map((a) => a.email.toLowerCase())), [attendees]);

  const exportCsv = () => {
    const esc = (v) => `"${v.replace(/"/g, '""')}"`;
    const csv = ['name,email,department,type', ...rows.map((a) => [a.name, a.email, a.organization ?? '', a.ticketType ?? ''].map(esc).join(','))].join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `${event.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-attendees.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const toggleSort = (key) => setSort((s) => ({ key, dir: s.key === key ? s.dir * -1 : 1 }));

  if (loading.attendees) return <Skeleton className="h-[520px]" />;

  const active = stats.total;

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total attendees"
          value={active}
          icon={<Users className="h-[18px] w-[18px]" />}
          hint={`${pct(active, event.expectedAttendees)}% of ${event.expectedAttendees} expected`}
        />
        <StatCard label="Students" value={stats.students} icon={<GraduationCap className="h-[18px] w-[18px]" />} tone="accent" hint="Type: student" />
        <StatCard label="Parents" value={stats.parents} icon={<UsersRound className="h-[18px] w-[18px]" />} tone="success" hint="Type: parent" />
        <StatCard label="Others" value={stats.others} icon={<Users className="h-[18px] w-[18px]" />} tone="warning" hint="Faculty, guests, speakers" />
      </div>
      <div className="rounded-xl border bg-card p-4">
        <div className="mb-2 flex justify-between text-sm">
          <span className="font-medium">Capacity</span>
          <span className="text-muted-foreground">
            {active} / {event.expectedAttendees}
          </span>
        </div>
        <Progress value={pct(active, event.expectedAttendees)} tone={active > event.expectedAttendees ? 'danger' : 'primary'} label="Registration capacity" />
      </div>

      <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
        <div className="relative lg:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, email, department" className="pl-9" aria-label="Search attendees" />
        </div>
        <Select value={ticket} onChange={(e) => setTicket(e.target.value)} className="lg:w-44" aria-label="Filter by type">
          <option value="all">All types</option>
          {Object.entries(TICKET_LABEL).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </Select>
        <div className="flex gap-2 lg:ml-auto">
          <Button variant="outline" onClick={exportCsv} disabled={!rows.length}>
            <Download className="h-4 w-4" /> Export
          </Button>
          <Button variant="outline" onClick={() => setCsvOpen(true)}>
            <FileUp className="h-4 w-4" /> Import CSV
          </Button>
          <Button onClick={() => setAddOpen(true)}>
            <UserPlus className="h-4 w-4" /> Add
          </Button>
        </div>
      </div>

      {attendees.length === 0 ? (
        <EmptyState
          icon={<Users className="h-7 w-7" />}
          title="No attendees yet"
          description="Import a CSV of students and parents (from Google Forms or Excel), or add people one by one."
          action={
            <>
              <Button onClick={() => setAddOpen(true)}>
                <UserPlus className="h-4 w-4" /> Add attendee
              </Button>
              <Button variant="outline" onClick={() => setCsvOpen(true)}>
                <FileUp className="h-4 w-4" /> Import CSV
              </Button>
            </>
          }
        />
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card shadow-soft">
          <div
            role="row"
            className="grid grid-cols-[1fr_auto] gap-4 border-b bg-muted/50 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground md:grid-cols-[2fr_1.4fr_1fr_40px]"
          >
            <button className="flex items-center gap-1 text-left" onClick={() => toggleSort('name')}>
              Attendee <ArrowUpDown className="h-3 w-3" />
            </button>
            <span className="hidden md:block">Department</span>
            <button className="flex items-center gap-1 text-left" onClick={() => toggleSort('ticketType')}>
              Type <ArrowUpDown className="h-3 w-3" />
            </button>
            <span className="sr-only">Actions</span>
          </div>
          <div
            ref={parentRef}
            className={cn('scrollbar-thin h-[480px] overflow-y-auto transition-opacity', stale && 'opacity-60')}
            role="rowgroup"
            aria-label={`${rows.length} attendees`}
          >
            {rows.length === 0 ? (
              <p className="py-16 text-center text-sm text-muted-foreground">No attendees match these filters.</p>
            ) : (
              <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
                {virtualizer.getVirtualItems().map((v) => {
                  const a = rows[v.index];
                  return (
                    <div
                      key={a.id}
                      role="row"
                      className="absolute inset-x-0 grid grid-cols-[1fr_auto] items-center gap-4 border-b px-4 transition-colors hover:bg-muted/40 md:grid-cols-[2fr_1.4fr_1fr_40px]"
                      style={{ height: ROW_H, transform: `translateY(${v.start}px)` }}
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <Avatar name={a.name} size={32} />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{a.name}</p>
                          <p className="truncate text-xs text-muted-foreground">{a.email}</p>
                        </div>
                      </div>
                      <p className="hidden truncate text-sm text-muted-foreground md:block">{a.organization || '—'}</p>
                      <div>
                        <Badge tone={a.ticketType === 'parent' ? 'success' : a.ticketType === 'student' ? 'default' : 'muted'}>
                          {TICKET_LABEL[a.ticketType] ?? 'General'}
                        </Badge>
                      </div>
                      <button
                        onClick={() => setDel(a)}
                        className="hidden h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-danger/10 hover:text-danger md:flex"
                        aria-label={`Remove ${a.name}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <div className="border-t px-4 py-2 text-xs text-muted-foreground">
            Showing {rows.length} of {attendees.length} · virtualised list renders only visible rows
          </div>
        </div>
      )}

      <AttendeeDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        existingEmails={existingEmails}
        onSave={async (v) => {
          if (await add('attendees', { ...v, email: v.email.toLowerCase(), createdAt: Date.now() }, `Added attendee ${v.name}`)) {
            toast.success('Attendee added', v.name);
            setAddOpen(false);
          }
        }}
      />
      <CsvImportDialog
        open={csvOpen}
        onClose={() => setCsvOpen(false)}
        existingEmails={existingEmails}
        onImport={async (list) => {
          try {
            const now = Date.now();
            await backend.addSubBatch(
              event.id,
              'attendees',
              list.map((r, i) => ({ ...r, createdAt: now + i })),
            );
            toast.success(`Imported ${list.length} attendee(s)`);
          } catch (e) {
            toast.error('Import failed', e.message);
            throw e;
          }
        }}
      />
      <ConfirmDialog
        open={!!del}
        onClose={() => setDel(null)}
        title={`Remove ${del?.name}?`}
        description="They will be removed from this event's attendee list."
        confirmLabel="Remove"
        onConfirm={async () => {
          if (del && (await remove('attendees', del.id))) toast.success('Attendee removed');
          setDel(null);
        }}
      />
    </div>
  );
}

function AttendeeDialog({ open, onClose, onSave, existingEmails }) {
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(attendeeSchema) });
  useEffect(() => {
    if (open) reset({ name: '', email: '', organization: '', ticketType: 'student' });
  }, [open, reset]);
  const submit = handleSubmit(async (v) => {
    if (existingEmails.has(v.email.toLowerCase())) return setError('email', { message: 'This email is already registered' });
    await onSave(v);
  });
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Add attendee"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} loading={isSubmitting}>
            Add attendee
          </Button>
        </>
      }
    >
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2" noValidate>
        <FormField label="Full name" htmlFor="a-name" error={errors.name?.message}>
          <Input id="a-name" {...register('name')} />
        </FormField>
        <FormField label="Email" htmlFor="a-email" error={errors.email?.message}>
          <Input id="a-email" type="email" {...register('email')} />
        </FormField>
        <FormField label="Department / organization" htmlFor="a-org">
          <Input id="a-org" placeholder="e.g. CSE" {...register('organization')} />
        </FormField>
        <FormField label="Type" htmlFor="a-ticket">
          <Select id="a-ticket" {...register('ticketType')}>
            {Object.entries(TICKET_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </Select>
        </FormField>
        <button type="submit" hidden />
      </form>
    </Dialog>
  );
}
