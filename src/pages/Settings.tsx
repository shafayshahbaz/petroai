import { useState } from 'react';
import { Building2, Save, AlertTriangle, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useSettingsStore } from '@/store/settings-store';
import { usePurchaseStore } from '@/store/purchase-store';
import { usePetrolPumpStore } from '@/store/petrol-pump-store';
import { BackupRestoreSection } from '@/components/backup/BackupManager';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export default function Settings() {
  const { toast } = useToast();
  const { businessProfile, updateBusinessProfile, clearAllData: clearSettings } = useSettingsStore();
  const { clearAllData: clearPurchases } = usePurchaseStore();
  const { clearAllData: clearPetrolPump } = usePetrolPumpStore();
  
  const [formData, setFormData] = useState({ ...businessProfile });

  const handleSave = () => {
    updateBusinessProfile(formData);
    toast({
      title: 'Settings Saved',
      description: 'Your business profile has been updated.',
    });
  };

  const handleClearAllData = () => {
    // Clear all Zustand persisted stores
    clearSettings();
    clearPurchases();
    clearPetrolPump();
    
    // Clear any other localStorage keys
    localStorage.removeItem('settings-storage');
    localStorage.removeItem('purchase-storage');
    localStorage.removeItem('petrol-pump-storage');
    
    toast({
      title: 'All Local Data Cleared',
      description: 'Your application has been reset to a fresh state. Please refresh the page.',
      variant: 'destructive',
    });
    
    // Reload after a short delay
    setTimeout(() => {
      window.location.reload();
    }, 1500);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground">
          Manage your business profile and application settings
        </p>
      </div>

      {/* Business Profile */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Building2 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle>Business Profile</CardTitle>
              <CardDescription>
                This information appears on all printed reports
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Company Name *</Label>
              <Input
                value={formData.companyName}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                placeholder="Enter your company name"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Customer ID (Display ID)</Label>
              <Input
                value={formData.customerId}
                onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
                placeholder="e.g., CUST-001"
              />
              <p className="text-xs text-muted-foreground">
                A custom identifier for your records
              </p>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>Address</Label>
              <Input
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="123 Main Road, City"
              />
            </div>

            <div className="space-y-2">
              <Label>GST Number</Label>
              <Input
                value={formData.gstNumber}
                onChange={(e) => setFormData({ ...formData, gstNumber: e.target.value })}
                placeholder="22AAAAA0000A1Z5"
              />
            </div>

            <div className="space-y-2">
              <Label>Phone</Label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+91 9876543210"
              />
            </div>
          </div>

          <Button onClick={handleSave} className="mt-4">
            <Save className="w-4 h-4 mr-2" />
            Save Changes
          </Button>
        </CardContent>
      </Card>

      <Separator />

      {/* Backup & Restore */}
      <BackupRestoreSection />

      <Separator />

      {/* Danger Zone */}
      <Card className="border-destructive/50">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-destructive/10">
              <AlertTriangle className="w-5 h-5 text-destructive" />
            </div>
            <div>
              <CardTitle className="text-destructive">Danger Zone</CardTitle>
              <CardDescription>
                Irreversible actions that affect your data
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border border-destructive/30 rounded-lg bg-destructive/5">
            <div>
              <h4 className="font-medium">Clear All Local Data</h4>
              <p className="text-sm text-muted-foreground">
                Wipe all tanks, sales, purchases, and settings stored in this browser. This cannot be undone.
              </p>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Clear Data
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                    <AlertTriangle className="w-5 h-5" />
                    Are you absolutely sure?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    This action is <strong>irreversible</strong>. All your local data including:
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      <li>Tanks and stock levels</li>
                      <li>Purchase invoices</li>
                      <li>Daily sales entries</li>
                      <li>Debtors and ledger</li>
                      <li>Business profile settings</li>
                    </ul>
                    <span className="block mt-2">will be permanently deleted from this browser.</span>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleClearAllData}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Yes, Clear Everything
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
