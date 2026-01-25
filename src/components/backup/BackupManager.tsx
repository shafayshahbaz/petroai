import { useState, useEffect } from 'react';
import { Download, Upload, AlertTriangle, Shield, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useSettingsStore } from '@/store/settings-store';
import { usePetrolPumpStore } from '@/store/petrol-pump-store';
import { usePurchaseStore } from '@/store/purchase-store';
import { useToast } from '@/hooks/use-toast';
import { format, differenceInDays } from 'date-fns';

interface BackupManagerProps {
  onBackupComplete?: () => void;
}

export function BackupManager({ onBackupComplete }: BackupManagerProps) {
  const { toast } = useToast();
  const { businessProfile, lastBackupDate, setLastBackupDate } = useSettingsStore();
  
  const createFullBackup = () => {
    try {
      // Get all data from localStorage stores
      const petrolPumpData = localStorage.getItem('petrol-pump-storage');
      const purchaseData = localStorage.getItem('purchase-storage');
      const settingsData = localStorage.getItem('settings-storage');

      const backup = {
        version: '2.0',
        exportedAt: new Date().toISOString(),
        businessProfile,
        stores: {
          'petrol-pump-storage': petrolPumpData ? JSON.parse(petrolPumpData) : null,
          'purchase-storage': purchaseData ? JSON.parse(purchaseData) : null,
          'settings-storage': settingsData ? JSON.parse(settingsData) : null,
        },
      };

      const jsonString = JSON.stringify(backup, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup-${businessProfile.companyName.replace(/\s+/g, '-')}-${format(new Date(), 'yyyy-MM-dd-HHmm')}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Update last backup date
      setLastBackupDate(new Date().toISOString());
      
      toast({
        title: 'Backup Created',
        description: 'Your data has been downloaded successfully.',
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
  const [isRestoring, setIsRestoring] = useState(false);

  const handleBackup = () => {
    try {
      const petrolPumpData = localStorage.getItem('petrol-pump-storage');
      const purchaseData = localStorage.getItem('purchase-storage');
      const settingsData = localStorage.getItem('settings-storage');

      const backup = {
        version: '2.0',
        exportedAt: new Date().toISOString(),
        businessProfile,
        stores: {
          'petrol-pump-storage': petrolPumpData ? JSON.parse(petrolPumpData) : null,
          'purchase-storage': purchaseData ? JSON.parse(purchaseData) : null,
          'settings-storage': settingsData ? JSON.parse(settingsData) : null,
        },
      };

      const jsonString = JSON.stringify(backup, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup-${businessProfile.companyName.replace(/\s+/g, '-')}-${format(new Date(), 'yyyy-MM-dd-HHmm')}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setLastBackupDate(new Date().toISOString());
      
      toast({
        title: 'Backup Created',
        description: 'Your data has been downloaded successfully.',
      });
    } catch (error) {
      toast({
        title: 'Backup Failed',
        description: 'Could not create backup.',
        variant: 'destructive',
      });
    }
  };

  const handleRestore = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsRestoring(true);
    try {
      const text = await file.text();
      const backup = JSON.parse(text);

      if (!backup.version || !backup.stores) {
        throw new Error('Invalid backup file format');
      }

      // Restore each store
      if (backup.stores['petrol-pump-storage']) {
        localStorage.setItem('petrol-pump-storage', JSON.stringify(backup.stores['petrol-pump-storage']));
      }
      if (backup.stores['purchase-storage']) {
        localStorage.setItem('purchase-storage', JSON.stringify(backup.stores['purchase-storage']));
      }
      if (backup.stores['settings-storage']) {
        localStorage.setItem('settings-storage', JSON.stringify(backup.stores['settings-storage']));
      }

      toast({
        title: 'Data Restored',
        description: 'Your data has been restored successfully. The page will reload.',
      });

      // Reload to apply restored data
      setTimeout(() => window.location.reload(), 1500);
    } catch (error) {
      console.error('Restore failed:', error);
      toast({
        title: 'Restore Failed',
        description: 'Invalid backup file. Please check the file and try again.',
        variant: 'destructive',
      });
    } finally {
      setIsRestoring(false);
      event.target.value = '';
    }
  };

  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        <div className="flex items-center gap-3 mb-4">
          <Shield className="w-6 h-6 text-primary" />
          <div>
            <h3 className="font-semibold">Data Backup & Restore</h3>
            <p className="text-sm text-muted-foreground">
              Keep your data safe by creating regular backups
            </p>
          </div>
        </div>

        {lastBackupDate && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
            <Calendar className="w-4 h-4" />
            Last backup: {format(new Date(lastBackupDate), 'dd MMM yyyy, hh:mm a')}
          </div>
        )}

        <div className="flex gap-3">
          <Button onClick={handleBackup} className="flex-1">
            <Download className="w-4 h-4 mr-2" />
            Download Backup
          </Button>
          
          <Label className="flex-1">
            <Button variant="outline" className="w-full" disabled={isRestoring} asChild>
              <span>
                <Upload className="w-4 h-4 mr-2" />
                {isRestoring ? 'Restoring...' : 'Restore Backup'}
              </span>
            </Button>
            <Input
              type="file"
              accept=".json"
              onChange={handleRestore}
              className="hidden"
              disabled={isRestoring}
            />
          </Label>
        </div>

        <p className="text-xs text-muted-foreground">
          ⚠️ Restoring a backup will replace all current data. Make sure to create a backup first.
        </p>
      </CardContent>
    </Card>
  );
}

export function MandatoryBackupModal() {
  const [isOpen, setIsOpen] = useState(false);
  const { lastBackupDate, setLastBackupDate, businessProfile } = useSettingsStore();

  useEffect(() => {
    // Check if backup is required (15+ days since last backup)
    if (!lastBackupDate) {
      setIsOpen(true);
      return;
    }

    const daysSinceBackup = differenceInDays(new Date(), new Date(lastBackupDate));
    if (daysSinceBackup >= 15) {
      setIsOpen(true);
    }
  }, [lastBackupDate]);

  const handleBackup = () => {
    try {
      const petrolPumpData = localStorage.getItem('petrol-pump-storage');
      const purchaseData = localStorage.getItem('purchase-storage');
      const settingsData = localStorage.getItem('settings-storage');

      const backup = {
        version: '2.0',
        exportedAt: new Date().toISOString(),
        businessProfile,
        stores: {
          'petrol-pump-storage': petrolPumpData ? JSON.parse(petrolPumpData) : null,
          'purchase-storage': purchaseData ? JSON.parse(purchaseData) : null,
          'settings-storage': settingsData ? JSON.parse(settingsData) : null,
        },
      };

      const jsonString = JSON.stringify(backup, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `mandatory-backup-${format(new Date(), 'yyyy-MM-dd')}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setLastBackupDate(new Date().toISOString());
      setIsOpen(false);
    } catch (error) {
      console.error('Backup failed:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 rounded-full bg-destructive/10">
              <AlertTriangle className="w-8 h-8 text-destructive" />
            </div>
            <DialogTitle className="text-xl">Mandatory Data Backup Required</DialogTitle>
          </div>
          <DialogDescription className="text-base">
            To keep your data safe, you must download a backup copy to continue.
            It has been {lastBackupDate ? `${differenceInDays(new Date(), new Date(lastBackupDate))} days` : 'too long'} since your last backup.
          </DialogDescription>
        </DialogHeader>

        <div className="bg-muted/50 p-4 rounded-lg my-4">
          <p className="text-sm text-muted-foreground">
            This backup contains all your:
          </p>
          <ul className="text-sm mt-2 space-y-1">
            <li>• Daily sales entries</li>
            <li>• Purchase invoices</li>
            <li>• Tank & stock data</li>
            <li>• Debtor records</li>
            <li>• Settings & configurations</li>
          </ul>
        </div>

        <Button onClick={handleBackup} size="lg" className="w-full">
          <Download className="w-5 h-5 mr-2" />
          Download Encrypted Backup (.json)
        </Button>
      </DialogContent>
    </Dialog>
  );
}
