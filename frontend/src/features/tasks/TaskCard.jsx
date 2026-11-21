import { memo } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { CalendarClock, GripVertical } from 'lucide-react';
import { Avatar, Badge } from '@/components/ui';
import { PRIORITY_META } from '@/lib/constants';
import { daysUntil, prettyDate } from '@/lib/time';
import { cn } from '@/lib/utils';

export function TaskCardView({ task, assignee, overlay, onOpen, dragHandle }) {
  const d = task.dueDate ? daysUntil(task.dueDate) : null;
  const overdue = d !== null && d < 0 && task.status !== 'done';
  return (
    <div
      className={cn(
        'group rounded-xl border bg-card p-3.5 shadow-sm transition hover:border-primary/30 hover:shadow-md',
        overlay && 'rotate-[1.5deg] cursor-grabbing shadow-lift ring-2 ring-primary',
        task.status === 'done' && 'opacity-75',
      )}
      onClick={() => onOpen(task)}
    >
      <div className="flex items-start gap-2">
        <p className={cn('flex-1 text-sm font-medium leading-snug', task.status === 'done' && 'line-through decoration-1')}>{task.title}</p>
        {dragHandle}
      </div>
      {task.description && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{task.description}</p>}
      <div className="mt-3 flex items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge tone={PRIORITY_META[task.priority].tone}>{PRIORITY_META[task.priority].label}</Badge>
          {task.dueDate && (
            <span
              className={cn(
                'flex items-center gap-1 text-[11px] font-medium',
                overdue ? 'text-danger' : d !== null && d <= 2 ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground',
              )}
            >
              <CalendarClock className="h-3 w-3" /> {overdue ? 'Overdue · ' : ''}
              {prettyDate(task.dueDate, 'MMM d')}
            </span>
          )}
        </div>
        {assignee ? <Avatar name={assignee.name} size={24} /> : <span className="h-6 w-6 rounded-full border border-dashed" title="Unassigned" />}
      </div>
    </div>
  );
}

/** Sortable wrapper — the whole card is draggable, with a visible grip for affordance. */
export const SortableTaskCard = memo(function SortableTaskCard(props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: props.task.id, data: { status: props.task.status } });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn('touch-none', isDragging && 'opacity-40')}
      {...attributes}
      {...listeners}
      aria-roledescription="draggable task"
      aria-label={`${props.task.title}. Press space to pick up, arrow keys to move.`}
      onKeyDown={(e) => {
        if (e.key === 'Enter') props.onOpen(props.task);
        listeners?.onKeyDown?.(e);
      }}
    >
      <TaskCardView
        {...props}
        dragHandle={<GripVertical className="h-4 w-4 shrink-0 cursor-grab text-muted-foreground/50 group-hover:text-muted-foreground" aria-hidden />}
      />
    </div>
  );
});
