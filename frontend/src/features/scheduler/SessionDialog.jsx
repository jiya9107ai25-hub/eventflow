import { useEffect, useMemo } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertTriangle, CalendarPlus, CheckCircle2, Trash2 } from 'lucide-react';
import { sessionGoogleUrl } from '@/lib/calendar';
import { Button, Dialog, FormField, Input, Select, Textarea } from '@/components/ui';
import { detectConflicts } from '@/lib/conflicts';
import { SESSION_TYPE_META } from '@/lib/constants';
import { eventDays, prettyDate } from '@/lib/time';
import { cn } from '@/lib/utils';
import { sessionSchema } from '@/schemas';

export function SessionDialog({ open, onClose, event, rooms, speakers, sessions, editing, defaults, onSave, onDelete }) {
  const days = eventDays(event);
  const blank = {
    title: '',
    description: '',
    type: 'talk',
    customType: '',
    day: days[0] ?? event.startDate,
    start: event.dailyStart,
    end: addHour(event.dailyStart),
    roomId: rooms[0]?.id ?? null,
    speakerIds: [],
  };

  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(sessionSchema), defaultValues: blank });

  useEffect(() => {
    if (!open) return;
    reset(
      editing
        ? {
            title: editing.title,
            description: editing.description,
            type: editing.type,
            customType: editing.customType ?? '',
            day: editing.day,
            start: editing.start,
            end: editing.end,
            roomId: editing.roomId,
            speakerIds: editing.speakerIds,
          }
        : { ...blank, ...defaults },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing]);

  const draft = watch();
  /** Live conflict preview for the session being edited. */
  const preview = useMemo(() => {
    if (!draft.title || !draft.start || !draft.end) return [];
    const id = editing?.id ?? '__draft__';
    const s = {
      id,
      title: draft.title,
      description: '',
      type: draft.type,
      day: draft.day,
      start: draft.start,
      end: draft.end,
      roomId: draft.roomId || null,
      speakerIds: draft.speakerIds ?? [],
    };
    return detectConflicts([...sessions.filter((x) => x.id !== id), s], event, rooms, speakers).filter((c) => c.sessionIds.includes(id));
  }, [draft.title, draft.start, draft.end, draft.day, draft.roomId, draft.speakerIds, draft.type, sessions, editing, event, rooms, speakers]);

  const submit = handleSubmit(async (v) => {
    await onSave({ ...v, customType: v.type === 'other' ? v.customType : '', roomId: v.roomId || null }, editing?.id);
  });

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="lg"
      title={editing ? 'Edit session' : 'New session'}
      description="Sessions are checked for room, speaker and time conflicts as you type."
      footer={
        <>
          {editing && (
            <div className="mr-auto flex gap-1">
              <Button variant="ghost" className="text-danger hover:bg-danger/10" onClick={() => onDelete(editing.id)}>
                <Trash2 className="h-4 w-4" /> Delete
              </Button>
              <a
                href={sessionGoogleUrl(
                  event,
                  editing,
                  rooms.find((r) => r.id === editing.roomId),
                )}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-10 items-center gap-2 rounded-md px-3 text-sm font-medium hover:bg-muted"
                title="Add this session to Google Calendar"
              >
                <CalendarPlus className="h-4 w-4" /> <span className="hidden sm:inline">Google Calendar</span>
              </a>
            </div>
          )}
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} loading={isSubmitting}>
            {editing ? 'Save session' : 'Add session'}
          </Button>
        </>
      }
    >
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2" noValidate>
        <FormField label="Title" htmlFor="s-title" error={errors.title?.message} className="sm:col-span-2">
          <Input id="s-title" aria-invalid={!!errors.title} {...register('title')} placeholder="e.g. Opening keynote" />
        </FormField>
        <FormField label="Type" htmlFor="s-type">
          <Select id="s-type" {...register('type')}>
            {Object.keys(SESSION_TYPE_META).map((t) => (
              <option key={t} value={t}>
                {SESSION_TYPE_META[t].label}
              </option>
            ))}
          </Select>
        </FormField>
        {draft.type === 'other' ? (
          <FormField label="Your session type" htmlFor="s-custom-type" error={errors.customType?.message}>
            <Input
              id="s-custom-type"
              aria-invalid={!!errors.customType}
              {...register('customType')}
              placeholder="e.g. Registration, Attendance, Lunch"
              list="s-custom-type-ideas"
              autoFocus
            />
            <datalist id="s-custom-type-ideas">
              {['Registration', 'Attendance', 'Lunch', 'Tea break', 'Campus tour', 'Ice-breaker', 'Cultural performance', 'Prize distribution'].map((x) => (
                <option key={x} value={x} />
              ))}
            </datalist>
          </FormField>
        ) : null}
        <FormField label="Day" htmlFor="s-day" error={errors.day?.message}>
          <Select id="s-day" {...register('day')}>
            {days.map((d, i) => (
              <option key={d} value={d}>
                Day {i + 1} · {prettyDate(d, 'EEE, MMM d')}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Starts" htmlFor="s-start" error={errors.start?.message}>
          <Input id="s-start" type="time" step={300} {...register('start')} />
        </FormField>
        <FormField label="Ends" htmlFor="s-end" error={errors.end?.message}>
          <Input id="s-end" type="time" step={300} aria-invalid={!!errors.end} {...register('end')} />
        </FormField>
        <FormField
          label="Room"
          htmlFor="s-room"
          className="sm:col-span-2"
          hint={rooms.length === 0 ? 'No rooms yet — add them in “Speakers & Rooms”.' : undefined}
        >
          <Select id="s-room" {...register('roomId')}>
            <option value="">Unassigned</option>
            {rooms.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} (cap. {r.capacity})
              </option>
            ))}
          </Select>
        </FormField>
        <div className="sm:col-span-2">
          <p className="mb-1.5 text-sm font-medium">Speakers</p>
          {speakers.length === 0 ? (
            <p className="text-xs text-muted-foreground">No speakers yet — add them in “Speakers & Rooms”.</p>
          ) : (
            <Controller
              control={control}
              name="speakerIds"
              render={({ field }) => (
                <div className="flex flex-wrap gap-2" role="group" aria-label="Assign speakers">
                  {speakers.map((sp) => {
                    const on = field.value.includes(sp.id);
                    return (
                      <button
                        type="button"
                        key={sp.id}
                        aria-pressed={on}
                        onClick={() => field.onChange(on ? field.value.filter((x) => x !== sp.id) : [...field.value, sp.id])}
                        className={cn(
                          'rounded-full border px-3 py-1 text-xs font-medium transition',
                          on ? 'border-primary bg-primary text-primary-foreground' : 'hover:bg-muted',
                        )}
                      >
                        {sp.name}
                      </button>
                    );
                  })}
                </div>
              )}
            />
          )}
        </div>
        <FormField label="Description" htmlFor="s-desc" className="sm:col-span-2">
          <Textarea id="s-desc" rows={3} {...register('description')} placeholder="Optional details for organizers" />
        </FormField>

        <div className="sm:col-span-2" aria-live="polite">
          {preview.length > 0 ? (
            <div className="space-y-1.5 rounded-xl border border-danger/30 bg-danger/5 p-3">
              {preview.map((c, i) => (
                <p key={i} className="flex items-start gap-2 text-sm text-danger">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {c.message}
                </p>
              ))}
              <p className="text-xs text-muted-foreground">You can still save — the conflict will stay flagged on the timeline.</p>
            </div>
          ) : draft.title ? (
            <p className="flex items-center gap-2 rounded-xl bg-success/10 p-3 text-sm text-success">
              <CheckCircle2 className="h-4 w-4" /> No conflicts detected.
            </p>
          ) : null}
        </div>
        <button type="submit" hidden />
      </form>
    </Dialog>
  );
}

function addHour(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return `${String(Math.min(23, (h ?? 0) + 1)).padStart(2, '0')}:${String(m ?? 0).padStart(2, '0')}`;
}
