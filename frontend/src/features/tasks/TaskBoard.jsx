import { useEffect, useMemo, useRef, useState } from 'react';
import { closestCorners, DndContext, DragOverlay, KeyboardSensor, PointerSensor, useDroppable, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CheckCircle2, Clock, KanbanSquare, ListTodo, Plus, Search, Timer, X } from 'lucide-react';
import { Button, ConfirmDialog, EmptyState, Input, Progress, Select, Skeleton } from '@/components/ui';
import { useWorkspace } from '@/features/workspace/WorkspaceContext';
import { useToast } from '@/context/ToastContext';
import { useDebounce } from '@/hooks/useDebounce';
import { PRIORITY_META, TASK_STATUS } from '@/lib/constants';
import { todayISO } from '@/lib/time';
import { cn, pct } from '@/lib/utils';
import { SortableTaskCard, TaskCardView } from './TaskCard';
import { TaskDialog } from './TaskDialog';
import { useEmail } from '@/features/alerts/useEmail';
import { useUser } from '@/context/AuthContext';

const COLUMNS = ['todo', 'in_progress', 'done'];

function buildBoard(tasks) {
  const b = { todo: [], in_progress: [], done: [] };
  [...tasks].sort((a, c) => a.order - c.order || a.createdAt - c.createdAt).forEach((t) => b[t.status].push(t.id));
  return b;
}

export default function TaskBoard() {
  const { tasks, team, loading, add, update, remove, event, canEdit } = useWorkspace();
  const { send } = useEmail();
  const user = useUser();
  const toast = useToast();
  const [q, setQ] = useState('');
  const [priority, setPriority] = useState('all');
  const [assignee, setAssignee] = useState('all');
  const [dlg, setDlg] = useState({ open: false, editing: null });
  const [del, setDel] = useState(null);
  const debounced = useDebounce(q, 200);

  /**
   * Optimistic board: while dragging (and until writes settle) we render from
   * local `board` state instead of the live listener so cards never jump back.
   */
  const [board, setBoard] = useState(() => buildBoard(tasks));
  const [activeId, setActiveId] = useState(null);
  const pendingWrites = useRef(0);
  useEffect(() => {
    if (!activeId && pendingWrites.current === 0) setBoard(buildBoard(tasks));
  }, [tasks, activeId]);

  const byId = useMemo(() => new Map(tasks.map((t) => [t.id, t])), [tasks]);
  const teamById = useMemo(() => new Map(team.map((m) => [m.id, m])), [team]);

  const matches = (t) =>
    (priority === 'all' || t.priority === priority) &&
    (assignee === 'all' || (assignee === 'none' ? !t.assigneeId : t.assigneeId === assignee)) &&
    (!debounced.trim() || `${t.title} ${t.description}`.toLowerCase().includes(debounced.trim().toLowerCase()));
  const filtering = priority !== 'all' || assignee !== 'all' || !!debounced.trim();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const findColumn = (id) => (COLUMNS.includes(id) ? id : COLUMNS.find((c) => board[c].includes(id)));

  const onDragStart = (e) => setActiveId(String(e.active.id));

  // Move cards between columns live while hovering.
  const onDragOver = ({ active, over }) => {
    if (!over) return;
    const from = findColumn(String(active.id));
    const to = findColumn(String(over.id));
    if (!from || !to || from === to) return;
    setBoard((b) => {
      const fromItems = b[from].filter((x) => x !== active.id);
      const overIndex = b[to].indexOf(String(over.id));
      const toItems = [...b[to]];
      toItems.splice(overIndex >= 0 ? overIndex : toItems.length, 0, String(active.id));
      return { ...b, [from]: fromItems, [to]: toItems };
    });
  };

  const onDragEnd = async ({ active, over }) => {
    const id = String(active.id);
    setActiveId(null);
    if (!over) return setBoard(buildBoard(tasks));
    const col = findColumn(id);
    let next = board;
    const overCol = findColumn(String(over.id));
    if (overCol === col) {
      const oldIndex = board[col].indexOf(id);
      const newIndex = board[col].indexOf(String(over.id));
      if (newIndex >= 0 && oldIndex !== newIndex) next = { ...board, [col]: arrayMove(board[col], oldIndex, newIndex) };
    }
    setBoard(next);

    // Persist only what changed (status and/or order).
    const writes = [];
    for (const c of COLUMNS) {
      next[c].forEach((tid, index) => {
        const t = byId.get(tid);
        if (t && (t.status !== c || t.order !== index)) {
          const statusChanged = t.status !== c;
          writes.push(
            update('tasks', tid, { status: c, order: index }, statusChanged && tid === id ? `Moved “${t.title}” to ${TASK_STATUS[c].label}` : undefined),
          );
        }
      });
    }
    if (!writes.length) return;
    pendingWrites.current++;
    const results = await Promise.all(writes);
    pendingWrites.current--;
    if (results.some((r) => !r)) {
      toast.error('Some changes could not be saved', 'The board was restored.');
      setBoard(buildBoard(tasks));
    } else if (byId.get(id)?.status !== col) {
      toast.success(`Moved to ${TASK_STATUS[col].label}`, byId.get(id)?.title);
    }
  };

  const save = async (v, id, notifyAssignee) => {
    const ok = id
      ? await update('tasks', id, v, `Updated task “${v.title}”`)
      : !!(await add('tasks', { ...v, order: board[v.status].length, createdAt: Date.now() }, `Created task “${v.title}”`));
    if (ok) {
      toast.success(id ? 'Task updated' : 'Task created', v.title);
      setDlg({ open: false, editing: null });
      const member = team.find((m) => m.id === v.assigneeId);
      if (notifyAssignee && member && event) {
        void send({ event, to: [member.email], template: 'task-assigned', data: { task: v, assigneeName: member.name, assignedBy: user.displayName } });
      }
    }
  };

  const total = tasks.length;
  const doneCount = tasks.filter((t) => t.status === 'done').length;
  const overdue = tasks.filter((t) => t.status !== 'done' && t.dueDate && t.dueDate < todayISO()).length;
  const activeTask = activeId ? byId.get(activeId) : undefined;

  if (loading.tasks) return <Skeleton className="h-[480px]" />;

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border bg-card p-4 lg:col-span-2">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-medium">Completion</span>
            <span className="font-display text-lg font-bold">{pct(doneCount, total)}%</span>
          </div>
          <Progress value={pct(doneCount, total)} tone="success" label="Task completion" />
          <p className="mt-2 text-xs text-muted-foreground">
            {doneCount} of {total} tasks completed
          </p>
        </div>
        <div className="flex items-center gap-3 rounded-xl border bg-card p-4">
          <Timer className="h-5 w-5 text-sky-500" />
          <div>
            <p className="font-display text-xl font-bold">{tasks.filter((t) => t.status === 'in_progress').length}</p>
            <p className="text-xs text-muted-foreground">In progress</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border bg-card p-4">
          <Clock className={cn('h-5 w-5', overdue ? 'text-danger' : 'text-muted-foreground')} />
          <div>
            <p className="font-display text-xl font-bold">{overdue}</p>
            <p className="text-xs text-muted-foreground">Overdue</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative sm:w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search tasks" className="pl-9" aria-label="Search tasks" />
        </div>
        <Select value={priority} onChange={(e) => setPriority(e.target.value)} className="sm:w-40" aria-label="Filter by priority">
          <option value="all">All priorities</option>
          {Object.entries(PRIORITY_META).map(([k, v]) => (
            <option key={k} value={k}>
              {v.label}
            </option>
          ))}
        </Select>
        <Select value={assignee} onChange={(e) => setAssignee(e.target.value)} className="sm:w-44" aria-label="Filter by assignee">
          <option value="all">All members</option>
          <option value="none">Unassigned</option>
          {team.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </Select>
        {filtering && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setQ('');
              setPriority('all');
              setAssignee('all');
            }}
          >
            <X className="h-4 w-4" /> Clear
          </Button>
        )}
        {canEdit && (
          <Button className="sm:ml-auto" onClick={() => setDlg({ open: true, editing: null, status: 'todo' })}>
            <Plus className="h-4 w-4" /> New task
          </Button>
        )}
      </div>

      {total === 0 ? (
        <EmptyState
          icon={<KanbanSquare className="h-7 w-7" />}
          title="No tasks yet"
          description="Break the event into tasks, assign owners and deadlines, then drag cards across the board as work progresses."
          action={
            canEdit && (
              <Button onClick={() => setDlg({ open: true, editing: null, status: 'todo' })}>
                <Plus className="h-4 w-4" /> Create first task
              </Button>
            )
          }
        />
      ) : (
        <DndContext
          sensors={canEdit ? sensors : []}
          collisionDetection={closestCorners}
          onDragStart={onDragStart}
          onDragOver={onDragOver}
          onDragEnd={onDragEnd}
          onDragCancel={() => {
            setActiveId(null);
            setBoard(buildBoard(tasks));
          }}
        >
          <div className="grid gap-4 lg:grid-cols-3">
            {COLUMNS.map((c) => {
              const ids = board[c].filter((id) => byId.has(id) && matches(byId.get(id)));
              return (
                <Column key={c} status={c} count={ids.length} onAdd={canEdit ? () => setDlg({ open: true, editing: null, status: c }) : null}>
                  <SortableContext items={ids} strategy={verticalListSortingStrategy}>
                    {ids.map((id) => {
                      const t = byId.get(id);
                      return (
                        <SortableTaskCard
                          key={id}
                          task={t}
                          assignee={t.assigneeId ? teamById.get(t.assigneeId) : undefined}
                          onOpen={(task) => canEdit && setDlg({ open: true, editing: task })}
                        />
                      );
                    })}
                  </SortableContext>
                  {ids.length === 0 && (
                    <p className="rounded-lg border border-dashed py-8 text-center text-xs text-muted-foreground">
                      {filtering ? 'No matching tasks' : 'Drop tasks here'}
                    </p>
                  )}
                </Column>
              );
            })}
          </div>
          <DragOverlay>
            {activeTask && (
              <TaskCardView
                task={activeTask}
                assignee={activeTask.assigneeId ? teamById.get(activeTask.assigneeId) : undefined}
                onOpen={() => undefined}
                overlay
              />
            )}
          </DragOverlay>
        </DndContext>
      )}

      <TaskDialog state={dlg} team={team} onClose={() => setDlg({ open: false, editing: null })} onSave={save} onDelete={(t) => setDel(t)} />
      <ConfirmDialog
        open={!!del}
        onClose={() => setDel(null)}
        title="Delete task?"
        description={del ? `“${del.title}” will be permanently removed.` : ''}
        onConfirm={async () => {
          if (del && (await remove('tasks', del.id, `Deleted task “${del.title}”`))) toast.success('Task deleted');
          setDel(null);
          setDlg({ open: false, editing: null });
        }}
      />
    </div>
  );
}

const COLUMN_ICON = { todo: ListTodo, in_progress: Timer, done: CheckCircle2 };

function Column({ status, count, onAdd, children }) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const Icon = COLUMN_ICON[status];
  return (
    <section
      aria-label={`${TASK_STATUS[status].label} column`}
      className={cn('flex min-h-[320px] flex-col rounded-2xl border bg-muted/40 p-3 transition-colors', isOver && 'border-primary/40 bg-primary/5')}
    >
      <header className="mb-3 flex items-center gap-2 px-1">
        <span className={cn('h-2 w-2 rounded-full', TASK_STATUS[status].dot)} />
        <Icon className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold">{TASK_STATUS[status].label}</h3>
        <span className="rounded-full bg-card px-2 py-0.5 text-xs font-medium text-muted-foreground">{count}</span>
        {onAdd && (
          <Button variant="ghost" size="icon" className="ml-auto h-7 w-7" onClick={onAdd} aria-label={`Add task to ${TASK_STATUS[status].label}`}>
            <Plus className="h-4 w-4" />
          </Button>
        )}
      </header>
      <div ref={setNodeRef} className="flex flex-1 flex-col gap-2.5">
        {children}
      </div>
    </section>
  );
}
