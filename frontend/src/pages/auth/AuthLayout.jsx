import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { CalendarCheck2, CheckCircle2 } from 'lucide-react';
import { Logo } from '@/components/common/Logo';
import { ThemeToggle } from '@/components/common/ThemeToggle';

export function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="flex flex-col px-6 py-6 sm:px-12">
        <div className="flex items-center justify-between">
          <Link to="/" aria-label="EventFlow home">
            <Logo />
          </Link>
          <ThemeToggle />
        </div>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-12"
        >
          <h1 className="text-3xl font-extrabold">{title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
          <div className="mt-8">{children}</div>
          <p className="mt-8 text-center text-sm text-muted-foreground">{footer}</p>
        </motion.div>
      </div>
      <div className="relative hidden overflow-hidden bg-gradient-to-br from-indigo-600 via-indigo-500 to-sky-500 lg:block">
        <div className="grid-bg absolute inset-0 opacity-20" />
        <div className="relative flex h-full flex-col justify-center p-16 text-white">
          <CalendarCheck2 className="mb-6 h-12 w-12 opacity-90" />
          <h2 className="max-w-md text-4xl font-extrabold leading-tight">Plan with clarity. Run with confidence.</h2>
          <ul className="mt-8 space-y-4 text-white/90">
            {['Drag-and-drop scheduling with conflict alerts', 'Real-time chat and task boards per event', 'Resource tracking that never over-allocates'].map(
              (t) => (
                <li key={t} className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 shrink-0" /> {t}
                </li>
              ),
            )}
          </ul>
          <div className="mt-12 max-w-sm rounded-2xl border border-white/20 bg-white/10 p-5 backdrop-blur">
            <p className="text-sm text-white/80">Next up · Main Hall</p>
            <p className="mt-1 font-semibold">Opening Keynote — 9:00 AM</p>
            <div className="mt-3 h-1.5 rounded-full bg-white/20">
              <div className="h-full w-2/3 rounded-full bg-white" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
