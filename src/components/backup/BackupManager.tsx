import { useState, useEffect } from 'react';
import { Download, Cloud, Calendar, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useCloudData } from '@/contexts/CloudDataContext';
import { useSettingsStore } from '@/store/settings-store';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface BackupManagerProps {
  onBackupComplete?: () => void;
}

export function BackupManager({ onBackupComplete }: BackupManagerProps) {
  const { toast } = useToast();
  const { businessProfile, setLastBackupDate } = useSettingsStore();
  const { tanks, nozzles, purchases, dailyEntries, debtors, clientSettings } = useCloudData();
  
  const createFullBackup = () => {
    try {
      // Export cloud data
      const backup = {
        version: '3.0',
        exportedAt: new Date().toISOString(),
        businessProfile,
        cloudData: {
          tanks,
          nozzles,
          purchases,
          dailyEntries,
          debtors,
          clientSettings,
        },
      };

      const jsonString = JSON.stringify(backup, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const companySlug = businessProfile.companyName?.replace(/\s+/g, '-') || 'backup';
      const a = document.createElement('a');
      a.href = url;
      a.download = `cloud-backup-${companySlug}-${format(new Date(), 'yyyy-MM-dd-HHmm')}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Update last backup date
      setLastBackupDate(new Date().toISOString());
      
      toast({
        title: 'Backup Created',
        description: 'Your cloud data has been exported successfully.',
      });

      onBackupComplete?.();
      return true;
    } catch (error) {
      console.error('Backup failed:', error);
      toast({
        title: 'Backup Failed',
        description: 'Could not create backup. Please try again.',
        variant: 'destructive',
      });
      return false;
    }
  };

  return { createFullBackup };
}

export function BackupRestoreSection() {
  const { toast } = useToast();
  const { businessProfile, lastBackupDate, setLastBackupDate } = useSettingsStore();
  const { tanks, nozzles, purchases, dailyEntries, debtors, clientSettings, isOnline } = useCloudData();

  const handleBackup = () => {
    try {
      // Export cloud data
      const backup = {
        version: '3.0',
        exportedAt: new Date().toISOString(),
        businessProfile,
        cloudData: {
          tanks,
          nozzles,
          purchases,
          dailyEntries,
          debtors,
          clientSettings,
        },
      };

      const jsonString = JSON.stringify(backup, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const companySlug = businessProfile.companyName?.replace(/\s+/g, '-') || 'backup';
      const a = document.createElement('a');
      a.href = url;
      a.download = `cloud-backup-${companySlug}-${format(new Date(), 'yyyy-MM-dd-HHmm')}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setLastBackupDate(new Date().toISOString());
      
      toast({
        title: 'Backup Created',
        description: 'Your cloud data has been exported successfully.',
      });
    } catch (error) {
      toast({
        title: 'Backup Failed',
        description: 'Could not create backup.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        <div className="flex items-center gap-3 mb-4">
          <Cloud className="w-6 h-6 text-primary" />
          <div>
            <h3 className="font-semibold">Cloud Sync & Backup</h3>
            <p className="text-sm text-muted-foreground">
              Your data syncs automatically across all devices
            </p>
          </div>
        </div>

        {/* Cloud Sync Status */}
        <div className="flex items-center gap-2 text-sm bg-green-500/10 text-green-700 p-3 rounded-lg">
          <CheckCircle2 className="w-4 h-4" />
          {isOnline ? 'All data is synced to cloud' : 'Offline - will sync when online'}
        </div>

        {lastBackupDate && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
            <Calendar className="w-4 h-4" />
            Last exported: {format(new Date(lastBackupDate), 'dd MMM yyyy, hh:mm a')}
          </div>
        )}

        <div className="flex gap-3">
          <Button onClick={handleBackup} className="flex-1" disabled={!isOnline}>
            <Download className="w-4 h-4 mr-2" />
            Export Backup (Archive)
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          ✓ Data is automatically saved to the cloud. Export backups are for archival purposes only.
        </p>
      </CardContent>
    </Card>
  );
}

// MandatoryBackupModal is no longer needed since data syncs to cloud automatically
export function MandatoryBackupModal() {
  // Cloud-first: No mandatory local backup needed
  return null;
}
