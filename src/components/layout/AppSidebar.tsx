import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  FileText, 
  ClipboardList, 
  Fuel,
  Menu,
  X,
  BookOpen,
  Users,
  Truck,
  Database,
  Settings,
  LogOut
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useSettingsStore } from '@/store/settings-store';
import { useAuth } from '@/contexts/AuthContext';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/daily-entry', icon: FileText, label: 'Daily Entry' },
  { to: '/purchase', icon: Truck, label: 'Purchase' },
  { to: '/stock', icon: Database, label: 'Stock' },
  { to: '/sales-report', icon: ClipboardList, label: 'Sales Report' },
  { to: '/ledger', icon: BookOpen, label: 'Ledger' },
  { to: '/debtors', icon: Users, label: 'Debtors' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export function AppSidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { businessProfile } = useSettingsStore();
  const { signOut } = useAuth();

  // Use business name from settings, fallback to generic name
  const companyName = businessProfile.companyName || 'Fuel Management';

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await signOut();
      // Replace the current history entry to prevent back navigation
      navigate('/login', { replace: true });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <>
      {/* Mobile overlay */}
      {!isCollapsed && (
        <div 
          className="fixed inset-0 bg-foreground/50 z-40 lg:hidden"
          onClick={() => setIsCollapsed(true)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed lg:sticky top-0 left-0 z-50 h-screen bg-sidebar transition-all duration-300 flex flex-col",
          isCollapsed ? "w-0 lg:w-20 overflow-hidden" : "w-64"
        )}
      >
        {/* Header */}
        <div className="flex items-center gap-3 p-4 border-b border-sidebar-border">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-sidebar-primary shrink-0">
            <Fuel className="w-6 h-6 text-sidebar-primary-foreground" />
          </div>
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <h1 className="font-bold text-sidebar-foreground truncate">{companyName}</h1>
              <p className="text-xs text-sidebar-foreground/70">Management System</p>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 text-sidebar-foreground hover:bg-sidebar-accent lg:hidden"
            onClick={() => setIsCollapsed(true)}
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.to;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all",
                  "hover:bg-sidebar-accent",
                  isActive
                    ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium"
                    : "text-sidebar-foreground"
                )}
              >
                <item.icon className="w-5 h-5 shrink-0" />
                {!isCollapsed && <span>{item.label}</span>}
              </NavLink>
            );
          })}
        </nav>

        {/* Logout Button */}
        <div className="p-3 border-t border-sidebar-border">
          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all w-full",
              "text-sidebar-foreground/80 hover:bg-destructive/10 hover:text-destructive",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            <LogOut className="w-5 h-5 shrink-0" />
            {!isCollapsed && <span>{isLoggingOut ? 'Logging out...' : 'Log Out'}</span>}
          </button>
        </div>

        {/* Footer */}
        <div className="p-4 pt-2 border-t border-sidebar-border">
          {!isCollapsed && (
            <p className="text-xs text-sidebar-foreground/50 text-center">
              © 2025 Petrol Pump Management
            </p>
          )}
        </div>
      </aside>

      {/* Mobile toggle button */}
      <Button
        variant="outline"
        size="icon"
        className={cn(
          "fixed top-4 left-4 z-30 lg:hidden",
          !isCollapsed && "opacity-0 pointer-events-none"
        )}
        onClick={() => setIsCollapsed(false)}
      >
        <Menu className="w-5 h-5" />
      </Button>

      {/* Desktop toggle button - Always visible */}
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          "fixed top-4 z-30 hidden lg:flex text-muted-foreground hover:text-foreground transition-all duration-300",
          isCollapsed ? "left-24" : "left-[270px]"
        )}
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <Menu className="w-5 h-5" />
      </Button>
    </>
  );
}