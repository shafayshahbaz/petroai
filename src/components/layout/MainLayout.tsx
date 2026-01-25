import { ReactNode } from 'react';
import { AppSidebar } from './AppSidebar';
import { MandatoryBackupModal } from '@/components/backup/BackupManager';

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
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
