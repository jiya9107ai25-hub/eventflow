import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Bot, Loader2, MessageCircle, RotateCcw, Send, Sparkles, X } from 'lucide-react';
import { useEvents } from '@/context/EventsContext';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/services/api';
import { todayISO } from '@/lib/time';
import { cn } from '@/lib/utils';

const SUGGESTIONS = [
  'Make a checklist for my orientation day',
  'How many volunteers do I need for 460 people?',
  'Write a welcome email for parents',
  'How do I invite a co-organizer?',
];

const STORAGE_KEY = 'eventflow-chat';

/** Turns the assistant's simple markdown (**bold**, bullets, numbered lists) into JSX. */
function Formatted({ text }) {
  const bold = (line) =>
    line.split(/(\*\*[^*]+\*\*)/g).map((part, i) => (part.startsWith('**') && part.endsWith('**') ? <strong key={i}>{part.slice(2, -2)}</strong> : part));
  return (
    <div className="space-y-1.5">
      {text.split('\n').map((raw, i) => {
        const line = raw.trimEnd();
        if (!line.trim()) return null;
        const bullet = line.match(/^\s*[-*•]\s+(.*)/);
        const num = line.match(/^\s*(\d+)[.)]\s+(.*)/);
        if (bullet)
          return (
            <div key={i} className="flex gap-2 pl-1">
              <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-60" />
              <span>{bold(bullet[1])}</span>
            </div>
          );
        if (num)
          return (
            <div key={i} className="flex gap-2 pl-1">
              <span className="font-semibold opacity-70">{num[1]}.</span>
              <span>{bold(num[2])}</span>
            </div>
          );
        if (/^#{1,6}\s/.test(line))
          return (
            <p key={i} className="font-semibold">
              {bold(line.replace(/^#{1,6}\s/, ''))}
            </p>
          );
        return <p key={i}>{bold(line)}</p>;
      })}
    </div>
  );
}

/**
 * Floating "EventFlow Assistant" chatbot (bottom-right on every app page).
 * Your question goes to the backend → Gemini, using the prompt in
 * backend/lib/prompts.js and a short summary of your events.
 */
export function ChatBot() {
  const { user } = useAuth();
  const { events } = useEvents();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [messages, setMessages] = useState(() => {
    try {
      return JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? '[]');
    } catch {
      return [];
    }
  });
  const listRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-30)));
    } catch {
      /* storage unavailable — chat still works */
    }
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 150);
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const send = async (text) => {
    const question = (text ?? input).trim();
    if (!question || loading) return;
    const next = [...messages, { role: 'user', content: question }];
    setMessages(next);
    setInput('');
    setError('');
    setLoading(true);
    try {
      const { reply } = await api.chat(next.slice(-12), events, todayISO());
      setMessages((m) => [...m, { role: 'assistant', content: reply }]);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const firstName = (user?.displayName || '').split(' ')[0];

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.section
            role="dialog"
            aria-label="EventFlow Assistant"
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ duration: 0.18 }}
            className="fixed bottom-24 right-4 z-50 flex h-[min(560px,calc(100vh-8rem))] w-[min(380px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border bg-card shadow-lift sm:right-6"
          >
            <header className="flex items-center gap-3 border-b bg-gradient-to-r from-indigo-600 to-sky-500 px-4 py-3 text-white">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20">
                <Bot className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">EventFlow Assistant</p>
                <p className="text-[11px] text-white/80">Powered by Gemini · knows your events</p>
              </div>
              {messages.length > 0 && (
                <button
                  type="button"
                  onClick={() => setMessages([])}
                  className="rounded-lg p-1.5 hover:bg-white/15"
                  aria-label="Start a new chat"
                  title="New chat"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
              )}
              <button type="button" onClick={() => setOpen(false)} className="rounded-lg p-1.5 hover:bg-white/15" aria-label="Close chat">
                <X className="h-4 w-4" />
              </button>
            </header>

            <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto p-4 text-sm" aria-live="polite">
              {messages.length === 0 && (
                <div className="space-y-3">
                  <div className="rounded-2xl rounded-tl-sm bg-muted px-3.5 py-2.5">
                    Hi{firstName ? ` ${firstName}` : ''}! 👋 I can help you plan events, write emails, make checklists, or explain how EventFlow works. What do
                    you need?
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {SUGGESTIONS.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => send(s)}
                        className="rounded-full border px-2.5 py-1 text-xs text-muted-foreground transition hover:border-primary/50 hover:text-foreground"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {messages.map((m, i) => (
                <div key={i} className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
                  <div
                    className={cn(
                      'max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2.5 leading-relaxed',
                      m.role === 'user' ? 'rounded-br-sm bg-primary text-primary-foreground' : 'rounded-tl-sm bg-muted',
                    )}
                  >
                    {m.role === 'user' ? m.content : <Formatted text={m.content} />}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Thinking…
                </div>
              )}
              {error && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-700 dark:text-red-300">
                  {error}
                  <button
                    type="button"
                    className="ml-2 font-semibold underline"
                    onClick={() => send(messages.filter((m) => m.role === 'user').at(-1)?.content)}
                  >
                    Try again
                  </button>
                </div>
              )}
            </div>

            <form
              className="flex items-end gap-2 border-t p-3"
              onSubmit={(e) => {
                e.preventDefault();
                void send();
              }}
            >
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    void send();
                  }
                }}
                rows={1}
                maxLength={2000}
                placeholder="Ask anything about your events…"
                aria-label="Message"
                className="max-h-28 min-h-[40px] flex-1 resize-none rounded-xl border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
              <button
                type="submit"
                disabled={!input.trim() || loading}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground transition hover:opacity-90 disabled:opacity-40"
                aria-label="Send message"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </motion.section>
        )}
      </AnimatePresence>

      <motion.button
        type="button"
        onClick={() => setOpen((o) => !o)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="fixed bottom-6 right-4 z-50 flex h-14 items-center gap-2 rounded-full bg-gradient-to-r from-indigo-600 to-sky-500 pl-4 pr-5 text-sm font-semibold text-white shadow-lift sm:right-6"
        aria-label={open ? 'Close EventFlow Assistant' : 'Open EventFlow Assistant'}
        aria-expanded={open}
      >
        {open ? <X className="h-5 w-5" /> : <MessageCircle className="h-5 w-5" />}
        <span className="hidden sm:inline">{open ? 'Close' : 'Ask AI'}</span>
        {!open && <Sparkles className="h-3.5 w-3.5 opacity-80" />}
      </motion.button>
    </>
  );
}
