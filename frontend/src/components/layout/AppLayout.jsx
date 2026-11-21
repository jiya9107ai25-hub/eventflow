import { Suspense, useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { motion } from 'motion/react';
import { EventsProvider } from '@/context/EventsContext';
import { PageLoader } from '@/components/common/PageLoader';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { dataMode } from '@/services';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { FlaskConical } from 'lucide-react';
import { ChatBot } from '@/features/ai/ChatBot';

const COLLAPSE_KEY = 'eventflow-sidebar-collapsed';

export default function AppLayout() {
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(COLLAPSE_KEY) === '1');
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  useEffect(() => setMobileOpen(false), [location.pathname]);
  useEffect(() => localStorage.setItem(COLLAPSE_KEY, collapsed ? '1' : '0'), [collapsed]);

  // Only animate between top-level sections, not between workspace tabs.
  const sectionKey = location.pathname.split('/').slice(0, 4).join('/');

  return (
    <EventsProvider>
      <div className="min-h-screen bg-background">
        <Sidebar
          collapsed={isDesktop && collapsed}
          onToggle={() => setCollapsed((c) => !c)}
          mobileOpen={mobileOpen}
          onMobileClose={() => setMobileOpen(false)}
          isDesktop={isDesktop}
        />
        <div className={isDesktop ? (collapsed ? 'lg:pl-[76px]' : 'lg:pl-[264px]') : ''} style={{ transition: 'padding 200ms ease' }}>
          {dataMode === 'sample' && (
            <div className="flex items-center justify-center gap-2 border-b bg-amber-500/10 px-4 py-1.5 text-center text-xs font-medium text-amber-700 dark:text-amber-400">
              <FlaskConical className="h-3.5 w-3.5 shrink-0" />
              Sample data mode — Firebase isn't configured, so data is stored locally in this browser. Add your Firebase keys to frontend/.env to use Firestore.
            </div>
          )}
          <Topbar onMenu={() => setMobileOpen(true)} />
          <main id="main" className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            <Suspense fallback={<PageLoader />}>
              <motion.div key={sectionKey} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, ease: 'easeOut' }}>
                <Outlet />
              </motion.div>
            </Suspense>
          </main>
        </div>
      </div>
      <ChatBot />
    </EventsProvider>
  );
}
