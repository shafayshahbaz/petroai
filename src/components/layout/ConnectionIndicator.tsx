import { useConnectionStatus } from '@/hooks/useCloudData';
import { Cloud, CloudOff } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export function ConnectionIndicator() {
  const { data: isConnected, isLoading } = useConnectionStatus();
  
  if (isLoading) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-muted/50">
              <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
              <span className="text-xs text-muted-foreground">Connecting...</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Checking cloud connection...</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
  
  if (isConnected) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-green-500/10 border border-green-500/20">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <Cloud className="w-3 h-3 text-green-600" />
              <span className="text-xs text-green-600 font-medium">Cloud</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Connected to Cloud Database</p>
            <p className="text-xs text-muted-foreground">Real-time sync enabled</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-red-500/10 border border-red-500/20">
            <div className="w-2 h-2 rounded-full bg-red-500" />
            <CloudOff className="w-3 h-3 text-red-600" />
            <span className="text-xs text-red-600 font-medium">Offline</span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>Not connected to Cloud</p>
          <p className="text-xs text-muted-foreground">Data sync unavailable</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
