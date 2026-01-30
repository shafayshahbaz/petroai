import { Skeleton } from '@/components/ui/skeleton';
import { Fuel } from 'lucide-react';

export function LoadingScreen() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header skeleton */}
      <div className="h-16 border-b bg-card flex items-center px-4 gap-4">
        <div className="flex items-center gap-2">
          <Fuel className="h-8 w-8 text-primary animate-pulse" />
          <Skeleton className="h-6 w-32" />
        </div>
      </div>
      
      {/* Content skeleton */}
      <div className="flex-1 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Welcome section */}
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
          
          {/* Stats cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-card rounded-lg p-4 border space-y-3">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-8 w-8 rounded-full" />
                </div>
                <Skeleton className="h-8 w-24" />
                <Skeleton className="h-3 w-32" />
              </div>
            ))}
          </div>
          
          {/* Main content area */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-card rounded-lg p-6 border space-y-4">
              <Skeleton className="h-6 w-32" />
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-3 w-2/3" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="bg-card rounded-lg p-6 border space-y-4">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-48 w-full rounded-lg" />
            </div>
          </div>
          
          {/* Loading message */}
          <div className="flex items-center justify-center gap-3 text-muted-foreground py-8">
            <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            <span className="text-sm">Loading your data from the cloud...</span>
          </div>
        </div>
      </div>
    </div>
  );
}
