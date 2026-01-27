import { ReactNode, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { AppSidebar } from './AppSidebar';
import { MandatoryBackupModal } from '@/components/backup/BackupManager';

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const location = useLocation();

  // Scroll to top on every route change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen w-full bg-background">
      <MandatoryBackupModal />
      <AppSidebar />
      <main className="flex-1 overflow-x-hidden">
        <div className="p-4 lg:p-6 lg:pl-20">
          {children}
        </div>
      </main>
    </div>
  );
}
