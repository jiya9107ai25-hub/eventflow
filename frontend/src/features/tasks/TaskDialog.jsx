import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Mail, Trash2 } from 'lucide-react';
import { Button, Dialog, FormField, Input, Select, Textarea } from '@/components/ui';
import { PRIORITY_META, TASK_STATUS } from '@/lib/constants';
import { taskSchema } from '@/schemas';

export function TaskDialog({ state, team, onClose, onSave, onDelete }) {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(taskSchema) });
  const [notify, setNotify] = useState(true);
  const assigneeId = watch('assigneeId');
  const assignee = team.find((m) => m.id === assigneeId);
  const assigneeChanged = !!assignee && assignee.id !== state.editing?.assigneeId;

  useEffect(() => {
    if (!state.open) return;
    const t = state.editing;
    reset(
      t
        ? { title: t.title, description: t.description, status: t.status, priority: t.priority, assigneeId: t.assigneeId ?? '', dueDate: t.dueDate ?? '' }
        : { title: '', description: '', status: state.status ?? 'todo', priority: 'medium', assigneeId: '', dueDate: '' },
    );
  }, [state, reset]);

  const submit = handleSubmit((v) =>
    onSave({ ...v, assigneeId: v.assigneeId || null, dueDate: v.dueDate || null }, state.editing?.id, notify && assigneeChanged),
  );

  return (
    <Dialog
      open={state.open}
      onClose={onClose}
      title={state.editing ? 'Edit task' : 'New task'}
      footer={
        <>
          {state.editing && (
            <Button variant="ghost" className="mr-auto text-danger hover:bg-danger/10" onClick={() => onDelete(state.editing)}>
              <Trash2 className="h-4 w-4" /> Delete
            </Button>
          )}
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} loading={isSubmitting}>
            {state.editing ? 'Save' : 'Create task'}
          </Button>
        </>
      }
    >
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2" noValidate>
        <FormField label="Title" htmlFor="t-title" error={errors.title?.message} className="sm:col-span-2">
          <Input id="t-title" aria-invalid={!!errors.title} {...register('title')} placeholder="e.g. Confirm catering vendor" />
        </FormField>
        <FormField label="Description" htmlFor="t-desc" className="sm:col-span-2">
          <Textarea id="t-desc" rows={3} {...register('description')} />
        </FormField>
        <FormField label="Status" htmlFor="t-status">
          <Select id="t-status" {...register('status')}>
            {Object.entries(TASK_STATUS).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Priority" htmlFor="t-priority">
          <Select id="t-priority" {...register('priority')}>
            {Object.entries(PRIORITY_META).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Assignee" htmlFor="t-assignee" hint={team.length === 0 ? 'Add team members in the Team tab to assign tasks.' : undefined}>
          <Select id="t-assignee" {...register('assigneeId')}>
            <option value="">Unassigned</option>
            {team.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} — {m.role}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Deadline" htmlFor="t-due">
          <Input id="t-due" type="date" {...register('dueDate')} />
        </FormField>
        {assigneeChanged && (
          <label className="flex cursor-pointer items-center gap-2 rounded-lg bg-primary/5 px-3 py-2.5 text-sm sm:col-span-2">
            <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} className="accent-[hsl(var(--primary))]" />
            <Mail className="h-4 w-4 text-primary" /> Email {assignee.name} ({assignee.email}) about this task
          </label>
        )}
        <button type="submit" hidden />
      </form>
    </Dialog>
  );
}
