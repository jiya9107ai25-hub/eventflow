import { Fragment, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { format, isToday, isYesterday } from 'date-fns';
import { ArrowDown, Loader2, Megaphone, MessagesSquare, Pin, SendHorizonal } from 'lucide-react';
import { Avatar, Badge, Button, Card, EmptyState, Skeleton } from '@/components/ui';
import { useWorkspace, useWorkspaceEvent } from '@/features/workspace/WorkspaceContext';
import { useUnread } from '@/features/workspace/useUnread';
import { useUser } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { dataMode } from '@/services';
import { cn } from '@/lib/utils';

function dayLabel(ts) {
  if (isToday(ts)) return 'Today';
  if (isYesterday(ts)) return 'Yesterday';
  return format(ts, 'EEEE, MMM d');
}

export default function Chat() {
  const event = useWorkspaceEvent();
  const user = useUser();
  const toast = useToast();
  const { messages, loading, messageLimit, loadOlderMessages, add } = useWorkspace();
  const { lastRead, markRead } = useUnread(user.uid, event.id, messages);
  const [text, setText] = useState('');
  const [announce, setAnnounce] = useState(false);
  const [pending, setPending] = useState([]);
  const [atBottom, setAtBottom] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const scrollRef = useRef(null);
  const prevHeight = useRef(0);
  const initialLastRead = useRef(lastRead);
  const isOrganizer = event.ownerId === user.uid;

  // Optimistic messages disappear once the real one arrives from the listener.
  const all = useMemo(() => {
    const realKeys = new Set(messages.map((m) => `${m.authorId}|${m.text}|${m.createdAt}`));
    return [...messages, ...pending.filter((p) => !realKeys.has(`${p.authorId}|${p.text}|${p.createdAt}`))];
  }, [messages, pending]);
  const announcements = messages.filter((m) => m.isAnnouncement).slice(-1);
  const hasMore = messages.length >= messageLimit;

  // Mark as read while the chat is open.
  useEffect(() => {
    if (messages.length) markRead();
  }, [messages.length, markRead]);

  // Keep scroll position when older pages load; otherwise stick to bottom.
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (loadingOlder) {
      el.scrollTop = el.scrollHeight - prevHeight.current;
      setLoadingOlder(false);
    } else if (atBottom) {
      el.scrollTop = el.scrollHeight;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [all.length]);

  const onScroll = () => {
    const el = scrollRef.current;
    setAtBottom(el.scrollHeight - el.scrollTop - el.clientHeight < 60);
    // Infinite scroll upward: fetch older messages when near the top.
    if (el.scrollTop < 40 && hasMore && !loadingOlder && !loading.messages) {
      prevHeight.current = el.scrollHeight;
      setLoadingOlder(true);
      loadOlderMessages();
    }
  };

  const send = async () => {
    const body = text.trim();
    if (!body) return;
    const msg = { authorId: user.uid, authorName: user.displayName, text: body.slice(0, 2000), isAnnouncement: announce && isOrganizer, createdAt: Date.now() };
    const temp = { ...msg, id: `pending-${msg.createdAt}`, pending: true };
    setPending((p) => [...p, temp]);
    setText('');
    setAnnounce(false);
    setAtBottom(true);
    const id = await add('messages', msg, msg.isAnnouncement ? 'Posted an announcement' : undefined);
    setPending((p) => p.filter((x) => x.id !== temp.id));
    if (!id) {
      setText(body);
      toast.error('Message not sent', 'Your text was restored so you can retry.');
    }
  };

  if (loading.messages && !messages.length) return <Skeleton className="h-[560px]" />;

  let lastDay = '';
  let dividerShown = false;

  return (
    <Card className="flex h-[calc(100vh-330px)] min-h-[480px] flex-col overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b px-5 py-3">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <MessagesSquare className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-semibold">
              #
              {event.title
                .toLowerCase()
                .replace(/^sample:\s*/, '')
                .replace(/[^a-z0-9]+/g, '-')}
            </p>
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success" />{' '}
              {dataMode === 'firebase' ? 'Live via Firestore' : 'Live across browser tabs (sample mode)'}
            </p>
          </div>
        </div>
      </div>

      {announcements.map((a) => (
        <div key={a.id} className="flex items-start gap-3 border-b bg-amber-500/10 px-5 py-2.5 text-sm">
          <Pin className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <p className="min-w-0">
            <span className="font-semibold">{a.authorName}:</span> <span className="text-muted-foreground">{a.text}</span>
          </p>
        </div>
      ))}

      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="scrollbar-thin relative flex-1 space-y-1 overflow-y-auto px-4 py-4 sm:px-6"
        role="log"
        aria-live="polite"
        aria-label="Event messages"
      >
        {hasMore && (
          <div className="flex justify-center pb-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                prevHeight.current = scrollRef.current.scrollHeight;
                setLoadingOlder(true);
                loadOlderMessages();
              }}
            >
              {loadingOlder ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Load older messages
            </Button>
          </div>
        )}
        {all.length === 0 ? (
          <EmptyState
            className="border-0"
            icon={<MessagesSquare className="h-6 w-6" />}
            title="Start the conversation"
            description="Messages here are visible to everyone organizing this event."
          />
        ) : (
          all.map((m, i) => {
            const mine = m.authorId === user.uid;
            const prev = all[i - 1];
            const grouped = prev && prev.authorId === m.authorId && m.createdAt - prev.createdAt < 5 * 60_000 && !m.isAnnouncement && !prev.isAnnouncement;
            const day = dayLabel(m.createdAt);
            const showDay = day !== lastDay;
            lastDay = day;
            const showUnread = !dividerShown && !mine && m.createdAt > initialLastRead.current && initialLastRead.current > 0;
            if (showUnread) dividerShown = true;
            return (
              <Fragment key={m.id}>
                {showDay && (
                  <div className="flex items-center gap-3 py-3 text-[11px] font-medium text-muted-foreground">
                    <span className="h-px flex-1 bg-border" />
                    {day}
                    <span className="h-px flex-1 bg-border" />
                  </div>
                )}
                {showUnread && (
                  <div className="flex items-center gap-3 py-2 text-[11px] font-semibold text-danger">
                    <span className="h-px flex-1 bg-danger/40" />
                    New messages
                    <span className="h-px flex-1 bg-danger/40" />
                  </div>
                )}
                {m.isAnnouncement ? (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="my-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4"
                  >
                    <p className="mb-1 flex items-center gap-2 text-xs font-semibold text-amber-700 dark:text-amber-400">
                      <Megaphone className="h-3.5 w-3.5" /> Announcement · {m.authorName} · {format(m.createdAt, 'p')}
                    </p>
                    <p className="whitespace-pre-wrap text-sm">{m.text}</p>
                  </motion.div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn('flex items-end gap-2', mine && 'flex-row-reverse', !grouped && 'pt-2')}
                  >
                    <div className="w-8 shrink-0">{!grouped && !mine && <Avatar name={m.authorName} size={32} />}</div>
                    <div className={cn('flex max-w-[78%] flex-col', mine && 'items-end')}>
                      {!grouped && (
                        <p className={cn('mb-1 px-1 text-xs', mine && 'text-right')}>
                          <span className="font-semibold">{mine ? 'You' : m.authorName}</span>{' '}
                          <span className="text-muted-foreground">{format(m.createdAt, 'p')}</span>
                        </p>
                      )}
                      <div
                        className={cn(
                          'whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-sm',
                          mine ? 'rounded-br-md bg-primary text-primary-foreground' : 'rounded-bl-md bg-muted',
                          'pending' in m && 'opacity-60',
                        )}
                      >
                        {m.text}
                      </div>
                      {'pending' in m && <span className="mt-0.5 px-1 text-[10px] text-muted-foreground">Sending…</span>}
                    </div>
                  </motion.div>
                )}
              </Fragment>
            );
          })
        )}
      </div>

      {!atBottom && (
        <div className="relative">
          <Button
            size="sm"
            variant="outline"
            className="absolute -top-12 left-1/2 -translate-x-1/2 rounded-full shadow-lift"
            onClick={() => {
              const el = scrollRef.current;
              el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
            }}
          >
            <ArrowDown className="h-4 w-4" /> Latest
          </Button>
        </div>
      )}

      <form
        className="border-t p-3 sm:p-4"
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
      >
        <div
          className={cn(
            'flex items-end gap-2 rounded-xl border bg-surface p-2 transition focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20',
            announce && 'border-amber-500/60',
          )}
        >
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void send();
              }
            }}
            rows={1}
            maxLength={2000}
            placeholder={announce ? 'Write an announcement for the whole team…' : 'Message the team — Enter to send, Shift+Enter for a new line'}
            className="max-h-32 min-h-[40px] flex-1 resize-none bg-transparent px-2 py-2 text-sm outline-none"
            aria-label="Message"
          />
          {isOrganizer && (
            <Button
              type="button"
              variant={announce ? 'secondary' : 'ghost'}
              size="icon"
              onClick={() => setAnnounce((a) => !a)}
              aria-pressed={announce}
              aria-label="Post as announcement"
              title="Post as organizer announcement"
              className={cn(announce && 'bg-amber-500/15 text-amber-600')}
            >
              <Megaphone className="h-4 w-4" />
            </Button>
          )}
          <Button type="submit" size="icon" disabled={!text.trim()} aria-label="Send message">
            <SendHorizonal className="h-4 w-4" />
          </Button>
        </div>
        {announce && (
          <Badge tone="warning" className="mt-2">
            Posting as an organizer announcement
          </Badge>
        )}
      </form>
    </Card>
  );
}
