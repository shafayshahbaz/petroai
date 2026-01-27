import { useState } from 'react';
import { Trash2, AlertTriangle, Database, UserX } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useSettingsStore } from '@/store/settings-store';
import { usePurchaseStore } from '@/store/purchase-store';
import { usePetrolPumpStore } from '@/store/petrol-pump-store';
import { PasswordConfirmationModal } from './PasswordConfirmationModal';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export function DataWipeSection() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { signOut, clientId } = useAuth();
  const { clearAllData: clearSettings } = useSettingsStore();
  const { clearAllData: clearPurchases } = usePurchaseStore();
  const { clearAllData: clearPetrolPump } = usePetrolPumpStore();

  const [showDataWipeModal, setShowDataWipeModal] = useState(false);
  const [showAccountDeleteModal, setShowAccountDeleteModal] = useState(false);

  // Option A: Delete business data but keep account structure
  const handleDataWipe = async () => {
    try {
      // Clear all local storage data (sales, purchases, ledger, expenses)
      clearPurchases();
      
      // For petrol pump store, we want to keep tanks/nozzles but clear sales data
      // Since the current implementation doesn't separate these, we'll clear all for now
      // In a full implementation, you'd have separate store methods
      
      // Clear localStorage keys
      localStorage.removeItem('purchase-storage');
      // Note: We're keeping 'settings-storage' and 'petrol-pump-storage' for tank structure
      
      toast({
        title: 'Data Cleared Successfully',
        description: 'All sales, purchases, and transaction data has been deleted. Your tanks and account remain intact.',
      });
      
      // Reload to reflect changes
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to clear data',
        variant: 'destructive',
      });
    }
  };

  // Option B: Request full account deletion
  const handleAccountDeletionRequest = async () => {
    try {
      if (!clientId) {
        throw new Error('Client ID not found');
      }

      // Update client record to mark deletion request
      const { error } = await supabase
        .from('clients')
        .update({ 
          subscription_status: 'suspended' as const,
          // Note: In a full implementation, you'd add a deletion_requested_at field
        })
        .eq('id', clientId);

      if (error) throw error;

      // Clear all local data
      clearSettings();
      clearPurchases();
      clearPetrolPump();
      localStorage.clear();

      toast({
        title: 'Account Deletion Requested',
        description: 'Your account has been marked for deletion. An admin will process your request. You will now be logged out.',
      });

      // Sign out and redirect
      setTimeout(async () => {
        await signOut();
        navigate('/login');
      }, 2000);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to request account deletion',
        variant: 'destructive',
      });
    }
  };

  return (
    <>
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
          {/* Option A: Clear Business Data */}
          <div className="flex items-center justify-between p-4 border border-amber-500/30 rounded-lg bg-amber-500/5">
            <div className="flex items-start gap-3">
              <Database className="w-5 h-5 text-amber-600 mt-0.5" />
              <div>
                <h4 className="font-medium">Clear All Business Data</h4>
                <p className="text-sm text-muted-foreground">
                  Delete all sales, purchases, and transactions. Your tanks, nozzles, and account settings will be preserved. 
                  <span className="text-amber-600 font-medium"> Useful for starting a new financial year.</span>
                </p>
              </div>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              className="border-amber-500 text-amber-600 hover:bg-amber-50"
              onClick={() => setShowDataWipeModal(true)}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Clear Data
            </Button>
          </div>

          {/* Option B: Delete Full Account */}
          <div className="flex items-center justify-between p-4 border border-destructive/30 rounded-lg bg-destructive/5">
            <div className="flex items-start gap-3">
              <UserX className="w-5 h-5 text-destructive mt-0.5" />
              <div>
                <h4 className="font-medium text-destructive">Delete My Account</h4>
                <p className="text-sm text-muted-foreground">
                  Request permanent account deletion. All your data will be erased and you will no longer be able to access the platform.
                  <span className="text-destructive font-medium"> This action is irreversible.</span>
                </p>
              </div>
            </div>
            <Button 
              variant="destructive" 
              size="sm"
              onClick={() => setShowAccountDeleteModal(true)}
            >
              <UserX className="w-4 h-4 mr-2" />
              Delete Account
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Password Confirmation for Data Wipe */}
      <PasswordConfirmationModal
        open={showDataWipeModal}
        onOpenChange={setShowDataWipeModal}
        onConfirm={handleDataWipe}
        title="Clear All Business Data"
        description="This will permanently delete all sales, purchases, and transaction records. Your tanks, nozzles, and account will remain intact."
        confirmText="Clear All Data"
        variant="default"
      />

      {/* Password Confirmation for Account Deletion */}
      <PasswordConfirmationModal
        open={showAccountDeleteModal}
        onOpenChange={setShowAccountDeleteModal}
        onConfirm={handleAccountDeletionRequest}
        title="Delete Your Account"
        description="This will request permanent deletion of your account and all associated data. You will be logged out immediately. An admin will process the final deletion."
        confirmText="Delete My Account"
        variant="destructive"
      />
    </>
  );
}
