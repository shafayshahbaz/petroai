import { useCloudData } from '@/contexts/CloudDataContext';
import { WifiOff, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

export function OfflineBanner() {
  const { isOnline, isSyncing } = useCloudData();

  if (isOnline && !isSyncing) return null;

  return (
    <div 
      className={cn(
        "fixed top-0 left-0 right-0 z-50 py-2 px-4 text-center text-sm font-medium transition-all",
        !isOnline 
          ? "bg-destructive text-destructive-foreground" 
          : "bg-primary text-primary-foreground"
      )}
    >
      {!isOnline ? (
        <div className="flex items-center justify-center gap-2">
          <WifiOff className="h-4 w-4" />
          <span>Offline - Reconnecting...</span>
        </div>
      ) : (
        <div className="flex items-center justify-center gap-2">
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span>Syncing...</span>
        </div>
      )}
    </div>
  );
}
