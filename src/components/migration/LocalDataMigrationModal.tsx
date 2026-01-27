/**
 * Local to Cloud Data Migration Modal
 * Detects localStorage data and offers to migrate it to cloud database
 */

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, CloudUpload, Database, Loader2, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface LocalPurchaseData {
  tanks: any[];
  purchases: any[];
  tankNozzleConnections: any[];
  registeredNozzles: any[];
  lastPrices: { MS: number; HSD: number; POWER: number };
  lastChamberCapacity: number;
}

interface LocalPetrolPumpData {
  entries: any[];
  debtors: any[];
}

const MIGRATION_FLAG = 'cloud-migration-completed';

export function LocalDataMigrationModal() {
  const { user, clientId } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [localDataSummary, setLocalDataSummary] = useState<{
    tanks: number;
    nozzles: number;
    debtors: number;
    entries: number;
    purchases: number;
  } | null>(null);

  // Check for local data on mount
  useEffect(() => {
    if (!user || !clientId) return;
    
    // Check if migration was already done
    const migrationDone = localStorage.getItem(MIGRATION_FLAG);
    if (migrationDone === 'true') return;

    // Parse localStorage data
    const purchaseData = parseLocalData<LocalPurchaseData>('purchase-storage');
    const petrolPumpData = parseLocalData<LocalPetrolPumpData>('petrol-pump-storage');

    const tanks = purchaseData?.tanks || [];
    const nozzles = purchaseData?.registeredNozzles || [];
    const debtors = petrolPumpData?.debtors || [];
    const entries = petrolPumpData?.entries || [];
    const purchases = purchaseData?.purchases || [];

    const hasData = tanks.length > 0 || nozzles.length > 0 || debtors.length > 0 || entries.length > 0 || purchases.length > 0;

    if (hasData) {
      setLocalDataSummary({
        tanks: tanks.length,
        nozzles: nozzles.length,
        debtors: debtors.length,
        entries: entries.length,
        purchases: purchases.length,
      });
      setIsOpen(true);
    } else {
      // No local data, mark as complete
      localStorage.setItem(MIGRATION_FLAG, 'true');
    }
  }, [user, clientId]);

  const parseLocalData = <T,>(key: string): T | null => {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed?.state || null;
    } catch {
      return null;
    }
  };

  const handleMigrate = async () => {
    if (!clientId) {
      setError('No client ID found. Please log in again.');
      return;
    }

    setIsMigrating(true);
    setProgress(0);
    setError(null);

    try {
      const purchaseData = parseLocalData<LocalPurchaseData>('purchase-storage');
      const petrolPumpData = parseLocalData<LocalPetrolPumpData>('petrol-pump-storage');

      const tanks = purchaseData?.tanks || [];
      const nozzles = purchaseData?.registeredNozzles || [];
      const connections = purchaseData?.tankNozzleConnections || [];
      const debtors = petrolPumpData?.debtors || [];
      const entries = petrolPumpData?.entries || [];
      const purchases = purchaseData?.purchases || [];
      
      const totalItems = tanks.length + nozzles.length + debtors.length + entries.length + purchases.length;
      let completed = 0;

      // Create a map of old tank IDs to new tank IDs
      const tankIdMap = new Map<string, string>();

      // 1. Migrate Tanks
      setStatus('Migrating tanks...');
      for (const tank of tanks) {
        const { data, error } = await supabase
          .from('tanks')
          .insert({
            client_id: clientId,
            name: tank.name,
            fuel_type: tank.fuelType,
            capacity: tank.capacity,
            current_stock: tank.currentStock,
          })
          .select('id')
          .single();

        if (error) throw new Error(`Tank migration failed: ${error.message}`);
        
        tankIdMap.set(tank.id, data.id);
        completed++;
        setProgress(Math.round((completed / totalItems) * 100));
      }

      // Create a map of old nozzle IDs to new nozzle IDs
      const nozzleIdMap = new Map<string, string>();

      // 2. Migrate Nozzles with tank connections
      setStatus('Migrating nozzles...');
      for (const nozzle of nozzles) {
        // Find if this nozzle was connected to a tank
        const connection = connections.find((c: any) => c.nozzleId === nozzle.id);
        const newTankId = connection ? tankIdMap.get(connection.tankId) : null;

        const { data, error } = await supabase
          .from('nozzles')
          .insert({
            client_id: clientId,
            label: nozzle.label,
            fuel_type: nozzle.fuelType,
            tank_id: newTankId || null,
          })
          .select('id')
          .single();

        if (error) throw new Error(`Nozzle migration failed: ${error.message}`);
        
        nozzleIdMap.set(nozzle.id, data.id);
        completed++;
        setProgress(Math.round((completed / totalItems) * 100));
      }

      // Create a map of old debtor IDs to new debtor IDs
      const debtorIdMap = new Map<string, string>();

      // 3. Migrate Debtors
      setStatus('Migrating debtors...');
      for (const debtor of debtors) {
        const { data, error } = await supabase
          .from('debtors')
          .insert({
            client_id: clientId,
            name: debtor.name,
            contact_number: debtor.contactNumber || null,
            opening_balance: debtor.openingBalance || 0,
            total_outstanding: debtor.totalOutstanding || 0,
          })
          .select('id')
          .single();

        if (error) throw new Error(`Debtor migration failed: ${error.message}`);
        
        debtorIdMap.set(debtor.id, data.id);
        completed++;
        setProgress(Math.round((completed / totalItems) * 100));
      }

      // 4. Migrate Daily Entries
      setStatus('Migrating daily entries...');
      for (const entry of entries) {
        // Update nozzle IDs in the entry and credit sale debtor IDs
        const migratedNozzles = (entry.nozzles || []).map((n: any) => ({
          ...n,
          id: nozzleIdMap.get(n.id) || n.id,
        }));

        const migratedCreditSales = (entry.creditSales || []).map((cs: any) => ({
          ...cs,
          debtorId: debtorIdMap.get(cs.debtorId) || cs.debtorId,
        }));

        const { error } = await supabase
          .from('daily_entries')
          .insert({
            client_id: clientId,
            date: entry.date,
            shift_name: entry.shiftName || null,
            fuel_rates: entry.fuelRates || { MS: 0, HSD: 0, POWER: 0 },
            nozzles: migratedNozzles,
            lube_items: entry.lubeItems || [],
            expenses: entry.expenses || [],
            incomes: entry.incomes || [],
            credit_sales: migratedCreditSales,
            upi_collection: entry.upiCollection || 0,
            cash_deposit: entry.cashDeposit || 0,
            opening_balance: entry.openingBalance || 0,
            testing_deduction: entry.testingDeduction || { MS: 0, HSD: 0, POWER: 0 },
          });

        if (error) throw new Error(`Daily entry migration failed: ${error.message}`);
        
        completed++;
        setProgress(Math.round((completed / totalItems) * 100));
      }

      // 5. Migrate Purchases
      setStatus('Migrating purchases...');
      for (const purchase of purchases) {
        // Update tank IDs in stock verifications
        const migratedVerifications = (purchase.stockVerifications || []).map((v: any) => ({
          ...v,
          tankId: tankIdMap.get(v.tankId) || v.tankId,
        }));

        const { error } = await supabase
          .from('purchases')
          .insert({
            client_id: clientId,
            invoice_number: purchase.invoiceNumber,
            invoice_date: purchase.invoiceDate,
            supplier_name: purchase.supplierName,
            total_invoice_value: purchase.totalInvoiceValue || 0,
            chambers: purchase.chambers || [],
            density_check: purchase.densityCheck || null,
            stock_verifications: migratedVerifications,
            status: purchase.status || 'draft',
          });

        if (error) throw new Error(`Purchase migration failed: ${error.message}`);
        
        completed++;
        setProgress(Math.round((completed / totalItems) * 100));
      }

      // 6. Migrate client settings (last prices)
      if (purchaseData?.lastPrices || purchaseData?.lastChamberCapacity) {
        setStatus('Migrating settings...');
        await supabase
          .from('client_settings')
          .upsert({
            client_id: clientId,
            last_prices: purchaseData.lastPrices || { MS: 0, HSD: 0, POWER: 0 },
            last_chamber_capacity: purchaseData.lastChamberCapacity || 3000,
          });
      }

      // Mark migration as complete
      localStorage.setItem(MIGRATION_FLAG, 'true');
      
      // Clear old localStorage data
      localStorage.removeItem('purchase-storage');
      localStorage.removeItem('petrol-pump-storage');
      localStorage.removeItem('settings-storage');

      setStatus('Migration complete!');
      setProgress(100);
      
      toast.success('Data migrated to cloud successfully!', {
        description: 'Your data is now synced across all devices.',
      });

      // Close modal after brief delay
      setTimeout(() => {
        setIsOpen(false);
        // Reload to refresh data from cloud
        window.location.reload();
      }, 1500);

    } catch (err: any) {
      console.error('Migration error:', err);
      setError(err.message || 'Migration failed. Please try again.');
      setIsMigrating(false);
    }
  };

  const handleSkip = () => {
    // Mark as done so we don't prompt again
    localStorage.setItem(MIGRATION_FLAG, 'true');
    setIsOpen(false);
    toast.info('Migration skipped. Local data will not sync to other devices.');
  };

  if (!localDataSummary) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !isMigrating && setIsOpen(open)}>
      <DialogContent className="max-w-md" onInteractOutside={(e) => isMigrating && e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CloudUpload className="w-5 h-5 text-primary" />
            Migrate Data to Cloud
          </DialogTitle>
          <DialogDescription>
            We found existing data on this device. Migrate it to the cloud so it syncs across all your devices.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {/* Data Summary */}
          {!isMigrating && (
            <div className="p-4 rounded-lg bg-muted/50 border space-y-2">
              <h4 className="font-medium flex items-center gap-2">
                <Database className="w-4 h-4" />
                Data Found on This Device
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                {localDataSummary.tanks > 0 && <li>• {localDataSummary.tanks} tank(s)</li>}
                {localDataSummary.nozzles > 0 && <li>• {localDataSummary.nozzles} nozzle(s)</li>}
                {localDataSummary.debtors > 0 && <li>• {localDataSummary.debtors} debtor(s)</li>}
                {localDataSummary.entries > 0 && <li>• {localDataSummary.entries} daily entry(ies)</li>}
                {localDataSummary.purchases > 0 && <li>• {localDataSummary.purchases} purchase(s)</li>}
              </ul>
            </div>
          )}

          {/* Migration Progress */}
          {isMigrating && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                {progress < 100 ? (
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                )}
                <span>{status}</span>
              </div>
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-muted-foreground text-center">
                {progress}% complete
              </p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}
        </div>

        <DialogFooter>
          {!isMigrating && (
            <>
              <Button variant="outline" onClick={handleSkip}>
                Skip for Now
              </Button>
              <Button onClick={handleMigrate}>
                <CloudUpload className="w-4 h-4 mr-2" />
                Migrate to Cloud
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
