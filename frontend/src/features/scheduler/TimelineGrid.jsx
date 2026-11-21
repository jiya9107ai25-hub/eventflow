import { memo, useMemo, useState } from 'react';
import { DndContext, DragOverlay, KeyboardSensor, PointerSensor, useDraggable, useDroppable, useSensor, useSensors } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { AlertTriangle, GripVertical, Mic2, Plus } from 'lucide-react';
import { SESSION_TYPE_META } from '@/lib/constants';
import { formatTime, fromMinutes, toMinutes } from '@/lib/time';
import { cn } from '@/lib/utils';

const PPM = 1.4; // pixels per minute → 84px per hour
const SNAP = 15; // minutes
const UNASSIGNED = '__unassigned__';

export function TimelineGrid({ event, rooms, speakers, sessions, conflictsById, onMove, onEdit, onCreateAt, readOnly = false }) {
  const [activeId, setActiveId] = useState(null);
  // Small activation distance so a simple click still opens the editor.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { keyboardCodes: { start: ['Space'], cancel: ['Escape'], end: ['Space'] } }),
  );

  // Grid spans event hours with 1h padding, widened to include any out-of-hours sessions.
  const { gridStart, gridEnd } = useMemo(() => {
    let s = toMinutes(event.dailyStart) - 60;
    let e = toMinutes(event.dailyEnd) + 60;
    for (const x of sessions) {
      s = Math.min(s, toMinutes(x.start));
      e = Math.max(e, toMinutes(x.end));
    }
    return { gridStart: Math.max(0, Math.floor(s / 60) * 60), gridEnd: Math.min(24 * 60, Math.ceil(e / 60) * 60) };
  }, [event.dailyStart, event.dailyEnd, sessions]);

  const hours = useMemo(() => Array.from({ length: (gridEnd - gridStart) / 60 }, (_, i) => gridStart + i * 60), [gridStart, gridEnd]);
  const height = (gridEnd - gridStart) * PPM;
  const columns = [
    ...rooms.map((r) => ({ id: r.id, name: r.name, sub: `Capacity ${r.capacity}` })),
    { id: UNASSIGNED, name: 'Unassigned', sub: 'No room yet' },
  ];
  const speakerName = useMemo(() => new Map(speakers.map((s) => [s.id, s.name])), [speakers]);

  const onDragStart = (e) => setActiveId(String(e.active.id));
  const onDragEnd = (e) => {
    setActiveId(null);
    const s = sessions.find((x) => x.id === e.active.id);
    if (!s) return;
    const deltaMin = Math.round(e.delta.y / PPM / SNAP) * SNAP;
    const duration = toMinutes(s.end) - toMinutes(s.start);
    let start = toMinutes(s.start) + deltaMin;
    start = Math.max(gridStart, Math.min(gridEnd - duration, start));
    const overRoom = e.over ? (e.over.id === UNASSIGNED ? null : String(e.over.id)) : s.roomId;
    const patch = { start: fromMinutes(start), end: fromMinutes(start + duration), roomId: overRoom };
    if (patch.start !== s.start || patch.roomId !== s.roomId) onMove(s.id, patch);
  };

  const active = sessions.find((s) => s.id === activeId);
  const open = toMinutes(event.dailyStart);
  const close = toMinutes(event.dailyEnd);

  return (
    <DndContext sensors={readOnly ? [] : sensors} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={() => setActiveId(null)}>
      <div className="scrollbar-thin overflow-x-auto rounded-xl border bg-card">
        <div className="flex" style={{ minWidth: 72 + columns.length * 200 }}>
          {/* time gutter */}
          <div className="sticky left-0 z-10 w-[72px] shrink-0 border-r bg-card">
            <div className="h-14 border-b" />
            <div className="relative" style={{ height }}>
              {hours.map((h) => (
                <span key={h} className="absolute right-2 -translate-y-2 text-[11px] font-medium text-muted-foreground" style={{ top: (h - gridStart) * PPM }}>
                  {formatTime(fromMinutes(h))}
                </span>
              ))}
            </div>
          </div>

          {columns.map((col) => (
            <RoomColumn
              key={col.id}
              id={col.id}
              name={col.name}
              sub={col.sub}
              height={height}
              hours={hours}
              gridStart={gridStart}
              open={open}
              close={close}
              onCreateAt={(mins) => onCreateAt(col.id === UNASSIGNED ? null : col.id, fromMinutes(mins))}
            >
              {sessions
                .filter((s) => (s.roomId ?? UNASSIGNED) === col.id || (col.id === UNASSIGNED && s.roomId && !rooms.some((r) => r.id === s.roomId)))
                .map((s) => (
                  <SessionBlock
                    key={s.id}
                    session={s}
                    gridStart={gridStart}
                    conflicts={conflictsById.get(s.id)}
                    speakerNames={s.speakerIds.map((id) => speakerName.get(id) ?? '?')}
                    onEdit={onEdit}
                    hidden={s.id === activeId}
                  />
                ))}
            </RoomColumn>
          ))}
        </div>
      </div>
      <DragOverlay dropAnimation={null}>
        {active && (
          <div
            className={cn('rounded-lg border-l-4 bg-card p-2 text-xs shadow-lift ring-2 ring-primary', SESSION_TYPE_META[active.type].color)}
            style={{ height: (toMinutes(active.end) - toMinutes(active.start)) * PPM, width: 188 }}
          >
            <p className="font-semibold">{active.title}</p>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}

function RoomColumn({ id, name, sub, height, hours, gridStart, open, close, onCreateAt, children }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div className="w-[200px] flex-1 shrink-0 border-r last:border-r-0">
      <div className="sticky top-0 flex h-14 flex-col justify-center border-b bg-muted/40 px-3">
        <p className="truncate text-sm font-semibold">{name}</p>
        <p className="truncate text-[11px] text-muted-foreground">{sub}</p>
      </div>
      <div
        ref={setNodeRef}
        className={cn('group/col relative transition-colors', isOver && 'bg-primary/5')}
        style={{ height }}
        onDoubleClick={(e) => {
          const y = e.clientY - e.currentTarget.getBoundingClientRect().top;
          onCreateAt(gridStart + Math.floor(y / PPM / 30) * 30);
        }}
      >
        {/* out-of-hours shading */}
        <div
          className="pointer-events-none absolute inset-x-0 top-0 bg-[repeating-linear-gradient(135deg,transparent,transparent_6px,hsl(var(--muted))_6px,hsl(var(--muted))_12px)] opacity-70"
          style={{ height: Math.max(0, (open - gridStart) * PPM) }}
        />
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 bg-[repeating-linear-gradient(135deg,transparent,transparent_6px,hsl(var(--muted))_6px,hsl(var(--muted))_12px)] opacity-70"
          style={{ top: (close - gridStart) * PPM }}
        />
        {hours.map((h) => (
          <div key={h} className="pointer-events-none absolute inset-x-0 border-t border-dashed border-border/70" style={{ top: (h - gridStart) * PPM }} />
        ))}
        <button
          className="absolute bottom-2 right-2 z-[1] flex h-7 w-7 items-center justify-center rounded-md border bg-card text-muted-foreground opacity-0 shadow-sm transition hover:text-primary focus:opacity-100 group-hover/col:opacity-100"
          onClick={() => onCreateAt(open)}
          aria-label={`Add session in ${name}`}
        >
          <Plus className="h-4 w-4" />
        </button>
        {children}
      </div>
    </div>
  );
}

const SessionBlock = memo(function SessionBlock({ session: s, gridStart, conflicts, speakerNames, onEdit, hidden }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: s.id });
  const top = (toMinutes(s.start) - gridStart) * PPM;
  const h = Math.max(24, (toMinutes(s.end) - toMinutes(s.start)) * PPM);
  const hasConflict = !!conflicts?.length;

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      role="button"
      aria-roledescription="draggable session"
      aria-label={`${s.title}, ${formatTime(s.start)} to ${formatTime(s.end)}${hasConflict ? ', has conflicts' : ''}. Press space to pick up, arrows to move.`}
      onClick={() => onEdit(s)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onEdit(s);
        listeners?.onKeyDown?.(e);
      }}
      title={hasConflict ? conflicts.map((c) => c.message).join('\n') : s.description || s.title}
      className={cn(
        'absolute inset-x-1.5 z-[2] cursor-grab touch-none select-none overflow-hidden rounded-lg border border-l-4 bg-card px-2 py-1.5 text-xs shadow-sm transition-shadow hover:shadow-md active:cursor-grabbing',
        SESSION_TYPE_META[s.type].color,
        hasConflict && 'ring-2 ring-danger ring-offset-1 ring-offset-card',
        hidden && 'opacity-30',
      )}
      style={{ top, height: h, transform: CSS.Translate.toString(transform) }}
    >
      <div className="flex items-start gap-1">
        <p className="line-clamp-2 flex-1 font-semibold leading-tight">{s.title}</p>
        {hasConflict ? (
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-danger" />
        ) : (
          <GripVertical className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
        )}
      </div>
      {h > 40 && (
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          {formatTime(s.start)} – {formatTime(s.end)}
        </p>
      )}
      {h > 62 && speakerNames.length > 0 && (
        <p className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-muted-foreground">
          <Mic2 className="h-3 w-3" /> {speakerNames.join(', ')}
        </p>
      )}
    </div>
  );
});
