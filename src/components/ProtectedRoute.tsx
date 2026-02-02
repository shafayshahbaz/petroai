import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useCloudData } from '@/contexts/CloudDataContext';
import { LoadingScreen } from '@/components/layout/LoadingScreen';

interface ProtectedRouteProps {
  children: ReactNode;
  requireAdmin?: boolean;
}

export function ProtectedRoute({ children, requireAdmin = false }: ProtectedRouteProps) {
  const { user, role, isLoading: authLoading, isProfileLoaded } = useAuth();
  const { isLoading: dataLoading, isInitialLoad } = useCloudData();
  const location = useLocation();

  // Show loading screen during auth check OR profile loading
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
          <p className="text-muted-foreground">Authenticating...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Wait for profile to load before rendering (prevents blank company name)
  if (!isProfileLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
          <p className="text-muted-foreground">Loading your station...</p>
        </div>
      </div>
    );
  }

  if (requireAdmin && role !== 'super_admin') {
    // Redirect clients trying to access admin routes back to dashboard
    return <Navigate to="/" replace />;
  }

  // Show loading screen during initial cloud data fetch (only for non-admin routes)
  if (!requireAdmin && isInitialLoad && dataLoading) {
    return <LoadingScreen />;
  }

  return <>{children}</>;
}
