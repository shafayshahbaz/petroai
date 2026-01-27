import { useState } from 'react';
import { Building2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useSettingsStore } from '@/store/settings-store';
import { BackupRestoreSection } from '@/components/backup/BackupManager';
import { PasswordChangeSection } from '@/components/settings/PasswordChangeSection';
import { DataWipeSection } from '@/components/settings/DataWipeSection';
import { ConnectionIndicator } from '@/components/layout/ConnectionIndicator';
import { useToast } from '@/hooks/use-toast';

export default function Settings() {
  const { toast } = useToast();
  const { businessProfile, updateBusinessProfile } = useSettingsStore();
  
  const [formData, setFormData] = useState({ ...businessProfile });

  const handleSave = () => {
    updateBusinessProfile(formData);
    toast({
      title: 'Settings Saved',
      description: 'Your business profile has been updated.',
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header with Connection Status */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground">
            Manage your business profile and application settings
          </p>
        </div>
        <div className="flex-shrink-0">
          <ConnectionIndicator />
        </div>
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

      {/* Security - Password Change */}
      <PasswordChangeSection />

      <Separator />

      {/* Backup & Restore */}
      <BackupRestoreSection />

      <Separator />

      {/* Danger Zone - Using new secure component */}
      <DataWipeSection />
    </div>
  );
}
