import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronDown, LayoutDashboard, LogOut, Settings } from 'lucide-react';
import { Avatar } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { cn } from '@/lib/utils';

/**
 * Account button for a signed-in user: shows their name (and email on wide
 * screens). Opens a menu with who is signed in, Dashboard, Settings and Log out.
 */
export function UserMenu({ showDashboard = true, compact = false }) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => !ref.current?.contains(e.target) && setOpen(false);
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!user) return null;
  const name = user.displayName || user.email?.split('@')[0] || 'Account';

  const go = (path) => {
    setOpen(false);
    navigate(path);
  };
  const logOut = async () => {
    setOpen(false);
    navigate('/', { replace: true }); // leave the protected pages first
    await new Promise((r) => setTimeout(r, 50));
    await signOut();
    toast.info('Logged out', 'See you soon!');
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Account menu for ${name}`}
        className="flex items-center gap-2 rounded-full border border-transparent p-1 pr-2 text-left transition hover:border-border hover:bg-muted"
      >
        <Avatar name={name} size={30} className="ring-0" />
        {!compact && (
          <span className="hidden min-w-0 leading-tight sm:block">
            <span className="block max-w-[10rem] truncate text-sm font-medium">{name}</span>
            <span className="block max-w-[10rem] truncate text-[11px] text-muted-foreground">{user.email}</span>
          </span>
        )}
        <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition', open && 'rotate-180')} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.14 }}
            className="absolute right-0 z-50 mt-2 w-64 origin-top-right overflow-hidden rounded-xl border bg-card shadow-lift"
          >
            <div className="flex items-center gap-3 border-b px-4 py-3">
              <Avatar name={name} size={36} className="ring-0" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{name}</p>
                <p className="truncate text-xs text-muted-foreground">{user.email}</p>
              </div>
            </div>
            <div className="p-1.5">
              {showDashboard && (
                <MenuItem icon={LayoutDashboard} onClick={() => go('/app')}>
                  Dashboard
                </MenuItem>
              )}
              <MenuItem icon={Settings} onClick={() => go('/app/settings')}>
                Profile & settings
              </MenuItem>
              <div className="my-1 border-t" />
              <MenuItem icon={LogOut} onClick={logOut} danger>
                Log out
              </MenuItem>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MenuItem({ icon: Icon, children, onClick, danger }) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition hover:bg-muted',
        danger ? 'text-red-600 dark:text-red-400' : 'text-foreground',
      )}
    >
      <Icon className="h-4 w-4" /> {children}
    </button>
  );
}
