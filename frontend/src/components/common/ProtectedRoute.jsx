import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { PageLoader } from './PageLoader';

/** Redirects to /login (remembering where the user was going) when signed out. */
export function ProtectedRoute() {
  const { user, initializing } = useAuth();
  const location = useLocation();
  if (initializing) return <PageLoader fullscreen />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <Outlet />;
}

/** Keeps signed-in users out of /login and /signup. */
export function PublicOnlyRoute() {
  const { user, initializing } = useAuth();
  if (initializing) return <PageLoader fullscreen />;
  if (user) return <Navigate to="/app" replace />;
  return <Outlet />;
}
