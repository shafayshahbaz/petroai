import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, FileText, ClipboardList, Fuel, Menu, X, BookOpen, Users, Truck, Database, Settings, LogOut, PlayCircle } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useSettingsStore } from '@/store/settings-store';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { LanguageToggle } from './LanguageToggle';
const getNavItems = (t: (key: string) => string) => [{
  to: '/',
  icon: LayoutDashboard,
  label: t('dashboard')
}, {
  to: '/daily-entry',
  icon: FileText,
  label: t('dailyEntry')
}, {
  to: '/purchase',
  icon: Truck,
  label: t('purchase')
}, {
  to: '/stock',
  icon: Database,
  label: t('stock')
}, {
  to: '/sales-report',
  icon: ClipboardList,
  label: t('salesReport')
}, {
  to: '/ledger',
  icon: BookOpen,
  label: t('ledger')
}, {
  to: '/debtors',
  icon: Users,
  label: t('debtors')
}, {
  to: '/settings',
  icon: Settings,
  label: t('settings')
}, {
  to: '/how-to-use',
  icon: PlayCircle,
  label: t('howToUse')
}];
export function AppSidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const {
    businessProfile
  } = useSettingsStore();
  const {
    signOut
  } = useAuth();
  const {
    t
  } = useLanguage();

  // Get nav items with translations
  const navItems = getNavItems(t);

  // Use business name from settings, fallback to generic name
  const companyName = businessProfile.companyName || 'Fuel Management';
  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await signOut();
      // Replace the current history entry to prevent back navigation
      navigate('/login', {
        replace: true
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setIsLoggingOut(false);
    }
  };
  return <>
      {/* Mobile overlay */}
      {!isCollapsed && <div className="fixed inset-0 bg-foreground/50 z-40 lg:hidden" onClick={() => setIsCollapsed(true)} />}

      {/* Sidebar */}
      <aside className={cn("fixed lg:sticky top-0 left-0 z-50 h-screen bg-sidebar transition-all duration-300 flex flex-col", isCollapsed ? "w-0 lg:w-20 overflow-hidden" : "w-64")}>
        {/* Header */}
        <div className="flex items-center gap-2 p-4 border-b border-sidebar-border">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-sidebar-primary shrink-0">
            <Fuel className="w-6 h-6 text-sidebar-primary-foreground" />
          </div>
          {!isCollapsed && <>
              <div className="flex-1 min-w-0">
                <h1 className="font-bold text-sidebar-foreground text-sm leading-tight line-clamp-2 whitespace-normal">{companyName}</h1>
                <p className="text-xs text-sidebar-foreground/70 text-justify">{t('managementSystem')}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <LanguageToggle />
                <Button variant="ghost" size="icon" className="text-sidebar-foreground hover:bg-sidebar-accent lg:hidden min-w-[44px] min-h-[44px]" onClick={() => setIsCollapsed(true)}>
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </>}
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map(item => {
          const isActive = location.pathname === item.to;
          return <NavLink key={item.to} to={item.to} className={cn("flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all", "hover:bg-sidebar-accent", isActive ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium" : "text-sidebar-foreground")}>
                <item.icon className="w-5 h-5 shrink-0" />
                {!isCollapsed && <span>{item.label}</span>}
              </NavLink>;
        })}
        </nav>

        {/* Logout Button */}
        <div className="p-3 border-t border-sidebar-border">
          <button onClick={handleLogout} disabled={isLoggingOut} className={cn("flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all w-full", "text-sidebar-foreground/80 hover:bg-destructive/10 hover:text-destructive", "disabled:opacity-50 disabled:cursor-not-allowed")}>
            <LogOut className="w-5 h-5 shrink-0" />
            {!isCollapsed && <span>{isLoggingOut ? t('loggingOut') : t('logOut')}</span>}
          </button>
        </div>

        {/* Footer */}
        <div className="p-4 pt-2 border-t border-sidebar-border">
          {!isCollapsed && <p className="text-xs text-sidebar-foreground/50 text-left">© 2026 Created by Shafay Shahbaz</p>}
        </div>
      </aside>

      {/* Mobile toggle button - Higher z-index, larger touch target */}
      <Button variant="outline" size="icon" className={cn("fixed top-3 left-3 z-50 lg:hidden bg-background shadow-lg border-border", "min-w-[44px] min-h-[44px] w-11 h-11",
    // 44px touch target
    !isCollapsed && "opacity-0 pointer-events-none")} onClick={() => setIsCollapsed(false)}>
        <Menu className="w-5 h-5" />
      </Button>

      {/* Desktop toggle button - Always visible */}
      <Button variant="ghost" size="icon" className={cn("fixed top-4 z-30 hidden lg:flex text-muted-foreground hover:text-foreground transition-all duration-300", isCollapsed ? "left-24" : "left-[270px]")} onClick={() => setIsCollapsed(!isCollapsed)}>
        <Menu className="w-5 h-5" />
      </Button>
    </>;
}