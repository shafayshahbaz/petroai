import { ReactNode, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { AppSidebar } from './AppSidebar';
import { MandatoryBackupModal } from '@/components/backup/BackupManager';
import { PageTransition } from './PageTransition';

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const location = useLocation();
  const mainContentRef = useRef<HTMLDivElement>(null);

  // Scroll to top on every route change - handles both window and container scroll
  useEffect(() => {
    // Scroll the window
    window.scrollTo({ top: 0, behavior: 'instant' });
    // Also scroll the main content container if it has its own scrollbar
    if (mainContentRef.current) {
      mainContentRef.current.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen w-full bg-background">
      <MandatoryBackupModal />
      <AppSidebar />
      <main 
        ref={mainContentRef}
        id="main-content"
        className="flex-1 overflow-x-hidden overflow-y-auto scroll-smooth"
      >
        {/* Safe area padding for mobile: pt-16 for header space, pb-24 for bottom nav */}
        <div className="p-4 pt-16 pb-24 lg:p-6 lg:pt-6 lg:pb-6 lg:pl-20">
          <PageTransition>
            {children}
          </PageTransition>
        </div>
      </main>
    </div>
  );
}
