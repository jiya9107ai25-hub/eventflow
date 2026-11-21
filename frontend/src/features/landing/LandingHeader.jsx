import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowRight, LayoutDashboard, LogOut, Menu, X } from 'lucide-react';
import { Logo } from '@/components/common/Logo';
import { ThemeToggle } from '@/components/common/ThemeToggle';
import { Avatar, Button, ButtonLink } from '@/components/ui';
import { UserMenu } from '@/components/common/UserMenu';
import { useToast } from '@/context/ToastContext';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';

const LINKS = [
  { id: 'features', label: 'Features' },
  { id: 'how', label: 'How it works' },
  { id: 'about', label: 'About' },
  { id: 'reviews', label: 'Reviews' },
];

/**
 * Floating "pill" header for the landing page.
 *  - floats below the top edge with a glass background
 *  - becomes more compact and solid once you scroll
 *  - highlights the section currently on screen (IntersectionObserver)
 *  - collapses into a slide-down menu on mobile
 */
export function LandingHeader() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const name = user ? user.displayName || user.email?.split('@')[0] : '';
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const sections = LINKS.map((l) => document.getElementById(l.id)).filter(Boolean);
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setActive(visible.target.id);
        else if (window.scrollY < 300) setActive(null);
      },
      { rootMargin: '-40% 0px -50% 0px', threshold: [0, 0.25, 0.5] },
    );
    sections.forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-40 px-3 sm:px-6">
      <motion.div
        initial={{ y: -24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className={cn(
          'pointer-events-auto mx-auto mt-3 flex max-w-5xl items-center justify-between gap-3 rounded-2xl border px-3 transition-all duration-300 sm:mt-4 sm:pl-4',
          scrolled
            ? 'h-14 border-border/80 bg-surface/85 shadow-lift backdrop-blur-xl'
            : 'h-16 border-white/40 bg-surface/55 shadow-soft backdrop-blur-md dark:border-white/10',
        )}
      >
        <Link to="/" aria-label="EventFlow home" className="shrink-0" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <Logo />
        </Link>

        <nav aria-label="Primary" className="hidden items-center rounded-xl bg-muted/60 p-1 md:flex">
          {LINKS.map((l) => (
            <a
              key={l.id}
              href={`#${l.id}`}
              aria-current={active === l.id ? 'true' : undefined}
              className={cn(
                'relative rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors',
                active === l.id ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {active === l.id && (
                <motion.span
                  layoutId="nav-pill"
                  className="absolute inset-0 rounded-lg bg-card shadow-sm"
                  transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                />
              )}
              <span className="relative">{l.label}</span>
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-1.5">
          <ThemeToggle />
          {user ? (
            <div className="hidden items-center gap-1.5 sm:flex">
              <Button size="sm" className="rounded-xl" onClick={() => navigate('/app')}>
                <LayoutDashboard className="h-4 w-4" /> Dashboard
              </Button>
              <UserMenu showDashboard={false} />
            </div>
          ) : (
            <div className="hidden items-center gap-1.5 sm:flex">
              <ButtonLink to="/login" variant="ghost" size="sm" className="rounded-xl">
                Log in
              </ButtonLink>
              <ButtonLink to="/signup" size="sm" className="rounded-xl">
                Sign up <ArrowRight className="h-3.5 w-3.5" />
              </ButtonLink>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setOpen((o) => !o)}
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </motion.div>

      {/* Mobile menu */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            className="pointer-events-auto mx-auto mt-2 max-w-5xl rounded-2xl border bg-card p-3 shadow-lift md:hidden"
          >
            <nav aria-label="Mobile" className="flex flex-col">
              {LINKS.map((l) => (
                <a
                  key={l.id}
                  href={`#${l.id}`}
                  onClick={() => setOpen(false)}
                  className={cn('rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-muted', active === l.id && 'bg-muted')}
                >
                  {l.label}
                </a>
              ))}
            </nav>
            <div className="mt-2 grid gap-2 border-t pt-3">
              {user ? (
                <>
                  <div className="flex items-center gap-3 rounded-lg bg-muted/60 px-3 py-2.5">
                    <Avatar name={name} size={34} className="ring-0" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{name}</p>
                      <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                    </div>
                  </div>
                  <Button
                    className="w-full"
                    onClick={() => {
                      setOpen(false);
                      navigate('/app');
                    }}
                  >
                    <LayoutDashboard className="h-4 w-4" /> Open dashboard
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full text-red-600 dark:text-red-400"
                    onClick={async () => {
                      setOpen(false);
                      await signOut();
                      toast.info('Logged out', 'See you soon!');
                    }}
                  >
                    <LogOut className="h-4 w-4" /> Log out
                  </Button>
                </>
              ) : (
                <>
                  <ButtonLink to="/signup" onClick={() => setOpen(false)} className="w-full">
                    Sign up <ArrowRight className="h-4 w-4" />
                  </ButtonLink>
                  <ButtonLink to="/login" variant="outline" onClick={() => setOpen(false)} className="w-full">
                    Log in
                  </ButtonLink>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
