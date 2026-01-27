import { ReactNode, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useSettingsStore } from '@/store/settings-store';

interface ProtectedRouteProps {
  children: ReactNode;
  requireAdmin?: boolean;
}

export function ProtectedRoute({ children, requireAdmin = false }: ProtectedRouteProps) {
  const { user, role, isLoading } = useAuth();
  const location = useLocation();
  const { accountCreatedAt, setAccountCreatedAt } = useSettingsStore();

  // Set account creation date on first login
  useEffect(() => {
    if (user && !accountCreatedAt) {
      setAccountCreatedAt(new Date().toISOString());
    }
  }, [user, accountCreatedAt, setAccountCreatedAt]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requireAdmin && role !== 'super_admin') {
    // Redirect clients trying to access admin routes back to dashboard
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
