import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { ProtectedRoute, PublicOnlyRoute } from './components/common/ProtectedRoute';
import { PageLoader } from './components/common/PageLoader';
import { ErrorBoundary } from './components/common/ErrorBoundary';

/* Route-based code splitting: each page is its own chunk, loaded on demand. */
const Landing = lazy(() => import('./pages/Landing'));
const Login = lazy(() => import('./pages/auth/Login'));
const Signup = lazy(() => import('./pages/auth/Signup'));
const AppLayout = lazy(() => import('./components/layout/AppLayout'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const EventsList = lazy(() => import('./pages/EventsList'));
const CreateEvent = lazy(() => import('./pages/CreateEvent'));
const EditEvent = lazy(() => import('./pages/EditEvent'));
const EventWorkspace = lazy(() => import('./pages/EventWorkspace'));
const CalendarPage = lazy(() => import('./pages/CalendarPage'));
const Analytics = lazy(() => import('./pages/Analytics'));
const Settings = lazy(() => import('./pages/Settings'));
const BrowseEvents = lazy(() => import('./pages/BrowseEvents'));
const NotFound = lazy(() => import('./pages/NotFound'));

export default function App() {
  const location = useLocation();

  return (
    <Suspense fallback={<PageLoader fullscreen />}>
      {/* No AnimatePresence "wait" wrapper here: it could keep the old page on screen
          after the URL changed. Each page animates itself in instead. */}
      <Routes location={location}>
        <Route path="/" element={<Landing />} />
        <Route element={<PublicOnlyRoute />}>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route path="/app" element={<AppLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="events" element={<EventsList />} />
            <Route path="browse" element={<BrowseEvents />} />
            <Route path="events/new" element={<CreateEvent />} />
            <Route path="events/:eventId/edit" element={<EditEvent />} />
            <Route
              path="events/:eventId/*"
              element={
                <ErrorBoundary>
                  <EventWorkspace />
                </ErrorBoundary>
              }
            />
            <Route path="calendar" element={<CalendarPage />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/app" replace />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}