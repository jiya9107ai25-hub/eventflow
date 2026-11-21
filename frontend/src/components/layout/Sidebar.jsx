import { NavLink, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { BarChart3, Home, CalendarDays, ChevronsLeft, ChevronsRight, Eye, Globe, LayoutDashboard, ListChecks, Plus, Settings, X } from 'lucide-react';
import { Logo } from '@/components/common/Logo';
import { Button } from '@/components/ui';
import { useEvents } from '@/context/EventsContext';
import { THEMES } from '@/lib/constants';
import { eventStatus } from '@/lib/time';
import { cn } from '@/lib/utils';

const NAV = [
  { to: '/app', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/app/events', label: 'My events', icon: ListChecks, end: false },
  { to: '/app/browse', label: 'All events', icon: Globe, end: false },
  { to: '/app/calendar', label: 'Calendar', icon: CalendarDays, end: false },
  { to: '/app/analytics', label: 'Analytics', icon: BarChart3, end: false },
  { to: '/app/settings', label: 'Settings', icon: Settings, end: false },
  { to: '/', label: 'Home page', icon: Home, end: true },
];

function SidebarBody({ collapsed, onToggle, isDesktop, onMobileClose }) {
  const { events, viewing } = useEvents();
  const navigate = useNavigate();
  const live = events.filter((e) => eventStatus(e) !== 'completed').slice(0, 6);
  const viewingLive = viewing.filter((e) => eventStatus(e) !== 'completed').slice(0, 6);

  return (
    <div className="flex h-full flex-col">
      <div className={cn('flex h-16 items-center border-b px-4', collapsed ? 'justify-center' : 'justify-between')}>
        <NavLink to="/app" aria-label="EventFlow dashboard">
          <Logo collapsed={collapsed} />
        </NavLink>
        {!isDesktop && (
          <Button variant="ghost" size="icon" onClick={onMobileClose} aria-label="Close menu">
            <X className="h-5 w-5" />
          </Button>
        )}
      </div>

      <div className="p-3">
        <Button className={cn('w-full', collapsed && 'px-0')} onClick={() => navigate('/app/events/new')} aria-label="Create new event">
          <Plus className="h-4 w-4" />
          {!collapsed && 'New event'}
        </Button>
      </div>

      <nav aria-label="Main" className="space-y-0.5 px-3">
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            title={collapsed ? label : undefined}
            className={({ isActive }) =>
              cn(
                'group flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
                isActive && 'bg-primary/10 text-primary hover:bg-primary/10 hover:text-primary',
                collapsed && 'justify-center px-0',
              )
            }
          >
            <Icon className="h-[18px] w-[18px] shrink-0" />
            {!collapsed && label}
          </NavLink>
        ))}
      </nav>

      {!collapsed && (
        <div className="mt-6 min-h-0 flex-1 overflow-y-auto px-3 scrollbar-thin">
          <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Your events</p>
          {live.length === 0 ? (
            <p className="px-3 text-xs text-muted-foreground">No upcoming events yet.</p>
          ) : (
            <ul className="space-y-0.5">
              {live.map((e) => (
                <li key={e.id}>
                  <NavLink
                    to={`/app/events/${e.id}`}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-2.5 truncate rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground',
                        isActive && 'bg-muted text-foreground',
                      )
                    }
                  >
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: THEMES[e.theme].swatch }} />
                    <span className="truncate">{e.title}</span>
                  </NavLink>
                </li>
              ))}
            </ul>
          )}
          {viewingLive.length > 0 && (
            <>
              <p className="mt-5 flex items-center gap-1.5 px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                <Eye className="h-3 w-3" /> Viewing (read-only)
              </p>
              <ul className="space-y-0.5">
                {viewingLive.map((e) => (
                  <li key={e.id}>
                    <NavLink
                      to={`/app/events/${e.id}`}
                      className={({ isActive }) =>
                        cn(
                          'flex items-center gap-2.5 truncate rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground',
                          isActive && 'bg-muted text-foreground',
                        )
                      }
                    >
                      <span className="h-2 w-2 shrink-0 rounded-full border" style={{ borderColor: THEMES[e.theme].swatch }} />
                      <span className="truncate">{e.title}</span>
                    </NavLink>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
      {collapsed && <div className="flex-1" />}

      {isDesktop && (
        <div className="border-t p-3">
          <Button
            variant="ghost"
            className={cn('w-full justify-start text-muted-foreground', collapsed && 'justify-center px-0')}
            onClick={onToggle}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
            {!collapsed && 'Collapse'}
          </Button>
        </div>
      )}
    </div>
  );
}

export function Sidebar(props) {
  const { collapsed, mobileOpen, onMobileClose, isDesktop } = props;
  if (isDesktop) {
    return (
      <aside
        className={cn('fixed inset-y-0 left-0 z-30 hidden border-r bg-surface transition-[width] duration-200 lg:block', collapsed ? 'w-[76px]' : 'w-[264px]')}
      >
        <SidebarBody {...props} />
      </aside>
    );
  }
  return (
    <AnimatePresence>
      {mobileOpen && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onMobileClose}
          />
          <motion.aside
            className="fixed inset-y-0 left-0 z-50 w-[280px] border-r bg-surface shadow-lift"
            initial={{ x: -300 }}
            animate={{ x: 0 }}
            exit={{ x: -300 }}
            transition={{ type: 'spring', stiffness: 400, damping: 38 }}
          >
            <SidebarBody {...props} collapsed={false} />
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
