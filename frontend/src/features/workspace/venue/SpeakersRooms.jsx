import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Building2, DoorOpen, Mail, Mic2, MoreHorizontal, Pencil, Plus, Trash2, Users } from 'lucide-react';
import {
  Avatar,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  ConfirmDialog,
  Dialog,
  Dropdown,
  EmptyState,
  FormField,
  Input,
  Skeleton,
  Textarea,
} from '@/components/ui';
import { useWorkspace } from '../WorkspaceContext';
import { useToast } from '@/context/ToastContext';
import { roomSchema, speakerSchema } from '@/schemas';

export default function SpeakersRooms() {
  const { rooms, speakers, sessions, loading, add, update, remove, canEdit } = useWorkspace();
  const toast = useToast();
  const [roomDlg, setRoomDlg] = useState({ open: false, editing: null });
  const [spDlg, setSpDlg] = useState({ open: false, editing: null });
  const [del, setDel] = useState(null);

  const sessionsIn = (roomId) => sessions.filter((s) => s.roomId === roomId).length;
  const sessionsBy = (spId) => sessions.filter((s) => s.speakerIds.includes(spId)).length;

  const confirmDelete = async () => {
    if (!del) return;
    if (del.kind === 'rooms') {
      // Unassign sessions that used this room so they surface in "Unassigned".
      await Promise.all(sessions.filter((s) => s.roomId === del.id).map((s) => update('sessions', s.id, { roomId: null })));
    } else {
      await Promise.all(
        sessions.filter((s) => s.speakerIds.includes(del.id)).map((s) => update('sessions', s.id, { speakerIds: s.speakerIds.filter((x) => x !== del.id) })),
      );
    }
    if (await remove(del.kind, del.id, `Removed ${del.kind === 'rooms' ? 'room' : 'speaker'} ${del.name}`)) toast.success(`${del.name} removed`);
    setDel(null);
  };

  return (
    <div className="grid gap-6 xl:grid-cols-5">
      <Card className="xl:col-span-2">
        <CardHeader>
          <div>
            <CardTitle className="flex items-center gap-2">
              <DoorOpen className="h-4 w-4 text-primary" /> Rooms & halls
            </CardTitle>
            <CardDescription>Spaces sessions can be scheduled into</CardDescription>
          </div>
          {canEdit && (
            <Button size="sm" onClick={() => setRoomDlg({ open: true, editing: null })}>
              <Plus className="h-4 w-4" /> Room
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {loading.rooms ? (
            <Skeleton className="h-40" />
          ) : rooms.length === 0 ? (
            <EmptyState
              icon={<Building2 className="h-6 w-6" />}
              title="No rooms yet"
              description="Add the halls, labs or stages available at your venue."
              action={
                canEdit && (
                  <Button size="sm" onClick={() => setRoomDlg({ open: true, editing: null })}>
                    <Plus className="h-4 w-4" /> Add room
                  </Button>
                )
              }
            />
          ) : (
            <ul className="divide-y">
              {rooms.map((r) => (
                <li key={r.id} className="flex items-center gap-3 py-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <DoorOpen className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{r.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {r.location || 'No location'} · {sessionsIn(r.id)} session(s)
                    </p>
                  </div>
                  <Badge tone="muted">
                    <Users className="h-3 w-3" /> {r.capacity}
                  </Badge>
                  {canEdit && (
                    <Dropdown
                      label={`Actions for ${r.name}`}
                      trigger={
                        <span className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-muted">
                          <MoreHorizontal className="h-4 w-4" />
                        </span>
                      }
                      items={[
                        { label: 'Edit', icon: <Pencil className="h-4 w-4" />, onSelect: () => setRoomDlg({ open: true, editing: r }) },
                        {
                          label: 'Delete',
                          icon: <Trash2 className="h-4 w-4" />,
                          danger: true,
                          onSelect: () => setDel({ kind: 'rooms', id: r.id, name: r.name }),
                        },
                      ]}
                    />
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card className="xl:col-span-3">
        <CardHeader>
          <div>
            <CardTitle className="flex items-center gap-2">
              <Mic2 className="h-4 w-4 text-primary" /> Speakers
            </CardTitle>
            <CardDescription>Assign them to sessions in the scheduler</CardDescription>
          </div>
          {canEdit && (
            <Button size="sm" onClick={() => setSpDlg({ open: true, editing: null })}>
              <Plus className="h-4 w-4" /> Speaker
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {loading.speakers ? (
            <Skeleton className="h-40" />
          ) : speakers.length === 0 ? (
            <EmptyState
              icon={<Mic2 className="h-6 w-6" />}
              title="No speakers yet"
              description="Add speakers, trainers or mentors who will run sessions."
              action={
                canEdit && (
                  <Button size="sm" onClick={() => setSpDlg({ open: true, editing: null })}>
                    <Plus className="h-4 w-4" /> Add speaker
                  </Button>
                )
              }
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {speakers.map((s) => (
                <div key={s.id} className="group rounded-xl border p-4 transition hover:border-primary/30 hover:shadow-soft">
                  <div className="flex items-start gap-3">
                    <Avatar name={s.name} size={44} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{s.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {s.title}
                        {s.company && ` · ${s.company}`}
                      </p>
                    </div>
                    {canEdit && (
                      <Dropdown
                        label={`Actions for ${s.name}`}
                        trigger={
                          <span className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-muted">
                            <MoreHorizontal className="h-4 w-4" />
                          </span>
                        }
                        items={[
                          { label: 'Edit', icon: <Pencil className="h-4 w-4" />, onSelect: () => setSpDlg({ open: true, editing: s }) },
                          {
                            label: 'Delete',
                            icon: <Trash2 className="h-4 w-4" />,
                            danger: true,
                            onSelect: () => setDel({ kind: 'speakers', id: s.id, name: s.name }),
                          },
                        ]}
                      />
                    )}
                  </div>
                  {s.bio && <p className="mt-3 line-clamp-2 text-xs text-muted-foreground">{s.bio}</p>}
                  <div className="mt-3 flex items-center justify-between text-xs">
                    <Badge tone={sessionsBy(s.id) ? 'default' : 'muted'}>{sessionsBy(s.id)} session(s)</Badge>
                    {s.email && (
                      <a href={`mailto:${s.email}`} className="flex items-center gap-1 text-muted-foreground hover:text-primary">
                        <Mail className="h-3.5 w-3.5" /> Email
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <RoomDialog
        state={roomDlg}
        onClose={() => setRoomDlg({ open: false, editing: null })}
        onSave={async (v) => {
          const ok = roomDlg.editing
            ? await update('rooms', roomDlg.editing.id, v, `Updated room ${v.name}`)
            : !!(await add('rooms', v, `Added room ${v.name}`));
          if (ok) {
            toast.success(roomDlg.editing ? 'Room updated' : 'Room added', v.name);
            setRoomDlg({ open: false, editing: null });
          }
        }}
      />
      <SpeakerDialog
        state={spDlg}
        onClose={() => setSpDlg({ open: false, editing: null })}
        onSave={async (v) => {
          const ok = spDlg.editing
            ? await update('speakers', spDlg.editing.id, v, `Updated speaker ${v.name}`)
            : !!(await add('speakers', v, `Added speaker ${v.name}`));
          if (ok) {
            toast.success(spDlg.editing ? 'Speaker updated' : 'Speaker added', v.name);
            setSpDlg({ open: false, editing: null });
          }
        }}
      />
      <ConfirmDialog
        open={!!del}
        onClose={() => setDel(null)}
        onConfirm={confirmDelete}
        title={`Delete ${del?.name}?`}
        description={del?.kind === 'rooms' ? 'Sessions in this room will become unassigned.' : 'This speaker will be removed from all sessions.'}
      />
    </div>
  );
}

function RoomDialog({ state, onClose, onSave }) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(roomSchema) });
  useEffect(() => {
    if (state.open)
      reset(
        state.editing
          ? { name: state.editing.name, capacity: state.editing.capacity, location: state.editing.location }
          : { name: '', capacity: 50, location: '' },
      );
  }, [state, reset]);
  const submit = handleSubmit(onSave);
  return (
    <Dialog
      open={state.open}
      onClose={onClose}
      title={state.editing ? 'Edit room' : 'Add room'}
      size="sm"
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
      <form onSubmit={submit} className="space-y-4" noValidate>
        <FormField label="Name" htmlFor="r-name" error={errors.name?.message}>
          <Input id="r-name" {...register('name')} placeholder="e.g. Main Hall" />
        </FormField>
        <FormField label="Capacity" htmlFor="r-cap" error={errors.capacity?.message}>
          <Input id="r-cap" type="number" min={1} {...register('capacity')} />
        </FormField>
        <FormField label="Location" htmlFor="r-loc">
          <Input id="r-loc" {...register('location')} placeholder="e.g. 2nd floor, East wing" />
        </FormField>
        <button type="submit" hidden />
      </form>
    </Dialog>
  );
}

function SpeakerDialog({ state, onClose, onSave }) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(speakerSchema) });
  useEffect(() => {
    if (state.open) {
      const e = state.editing;
      reset(e ? { name: e.name, title: e.title, company: e.company, email: e.email, bio: e.bio } : { name: '', title: '', company: '', email: '', bio: '' });
    }
  }, [state, reset]);
  const submit = handleSubmit(onSave);
  return (
    <Dialog
      open={state.open}
      onClose={onClose}
      title={state.editing ? 'Edit speaker' : 'Add speaker'}
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
        <FormField label="Name" htmlFor="sp-name" error={errors.name?.message}>
          <Input id="sp-name" {...register('name')} />
        </FormField>
        <FormField label="Title / role" htmlFor="sp-title" error={errors.title?.message}>
          <Input id="sp-title" {...register('title')} placeholder="e.g. Staff Engineer" />
        </FormField>
        <FormField label="Company" htmlFor="sp-co">
          <Input id="sp-co" {...register('company')} />
        </FormField>
        <FormField label="Email" htmlFor="sp-email" error={errors.email?.message}>
          <Input id="sp-email" type="email" {...register('email')} />
        </FormField>
        <FormField label="Short bio" htmlFor="sp-bio" className="sm:col-span-2">
          <Textarea id="sp-bio" rows={3} {...register('bio')} />
        </FormField>
        <button type="submit" hidden />
      </form>
    </Dialog>
  );
}
