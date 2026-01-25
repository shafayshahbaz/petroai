import { NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  FileText, 
  ClipboardList, 
  Fuel,
  Menu,
  X,
  BookOpen,
  Users,
  Truck
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/purchase', icon: Truck, label: 'Purchase' },
  { to: '/daily-entry', icon: FileText, label: 'Daily Entry' },
  { to: '/sales-report', icon: ClipboardList, label: 'Sales Report' },
  { to: '/ledger', icon: BookOpen, label: 'Ledger' },
  { to: '/debtors', icon: Users, label: 'Debtors' },
];

export function AppSidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const location = useLocation();

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
          isCollapsed ? "w-0 lg:w-16 overflow-hidden" : "w-64"
        )}
      >
        {/* Header */}
        <div className="flex items-center gap-3 p-4 border-b border-sidebar-border">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-sidebar-primary">
            <Fuel className="w-6 h-6 text-sidebar-primary-foreground" />
          </div>
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <h1 className="font-bold text-sidebar-foreground truncate">KGN Fuel Centre</h1>
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

        {/* Footer */}
        <div className="p-4 border-t border-sidebar-border">
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

      {/* Desktop toggle button */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 left-4 z-30 hidden lg:flex text-muted-foreground hover:text-foreground"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <Menu className="w-5 h-5" />
      </Button>
    </>
  );
}
