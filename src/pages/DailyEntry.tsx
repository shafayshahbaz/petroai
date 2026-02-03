import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { ChevronLeft, ChevronRight, Check, Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { usePetrolPumpStore } from '@/store/petrol-pump-store';
import { useCloudData, CloudDailyEntry } from '@/contexts/CloudDataContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { StepRatesAndStaff } from '@/components/daily-entry/StepRatesAndStaff';
import { StepMeterReadings } from '@/components/daily-entry/StepMeterReadings';
import { StepLubeSales } from '@/components/daily-entry/StepLubeSales';
import { StepExpensesAndPayments } from '@/components/daily-entry/StepExpensesAndPayments';
import { cn } from '@/lib/utils';
import { FuelType, DailyEntry as DailyEntryType, Nozzle, DEFAULT_FUEL_RATES } from '@/types/petrol-pump';
import { 
  createDailySale, 
  updateDailySale, 
  buildNozzleTankMap,
  updateDebtorOutstanding,
  revertDebtorOutstanding,
  NozzleReading
} from '@/services/transactionService';

const steps = [
  { id: 1, title: 'Rates & Staff', description: 'Set fuel rates and shift details' },
  { id: 2, title: 'Meter Readings', description: 'Enter nozzle readings' },
  { id: 3, title: 'Lube Sales', description: 'Add lube/oil sales' },
  { id: 4, title: 'Expenses & Payment', description: 'Final calculations' },
];

// Helper to convert cloud entry to local format
function cloudToLocalEntry(cloudEntry: CloudDailyEntry): DailyEntryType {
  return {
    id: cloudEntry.id,
    date: cloudEntry.date,
    shiftName: cloudEntry.shift_name || '',
    fuelRates: cloudEntry.fuel_rates as Record<FuelType, number>,
    nozzles: cloudEntry.nozzles as any[],
    lubeItems: cloudEntry.lube_items as any[],
    expenses: cloudEntry.expenses as any[],
    incomes: cloudEntry.incomes as any[],
    creditSales: cloudEntry.credit_sales as any[],
    upiCollection: cloudEntry.upi_collection,
    cashDeposit: cloudEntry.cash_deposit,
    openingBalance: cloudEntry.opening_balance,
    testingDeduction: cloudEntry.testing_deduction as Record<FuelType, number>,
    createdAt: cloudEntry.created_at,
    updatedAt: cloudEntry.updated_at,
  };
}

export default function DailyEntry() {
  const [currentStep, setCurrentStep] = useState(1);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const editId = searchParams.get('edit');
  const isEditMode = !!editId;
  
  const { 
    currentEntry, 
    createNewEntry, 
    clearCurrentEntry,
    validateNozzleReadings,
    normalizeNozzleReadings,
  } = usePetrolPumpStore();
  
  // Get data from cloud
  const { 
    nozzles: cloudNozzles, 
    getConnectedNozzles, 
    isOnline, 
    getTankForNozzle, 
    dailyEntries: cloudEntries,
    refreshData,
  } = useCloudData();
  const { clientId } = useAuth();
  const connectedNozzles = getConnectedNozzles();
  
  // Saving state and original nozzles ref for edit mode
  const [isSaving, setIsSaving] = useState(false);
  const originalNozzlesRef = useRef<NozzleReading[] | null>(null);

  // Get last closing readings from cloud entries for carry-forward
  const lastClosingReadings = useMemo(() => {
    if (cloudEntries.length === 0) return {};
    
    // Sort by date descending and find the most recent entry
    const sortedEntries = [...cloudEntries].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    
    // If editing, exclude the entry being edited and get the previous one
    const mostRecentEntry = isEditMode 
      ? sortedEntries.find(e => e.id !== editId) 
      : sortedEntries[0];
    
    if (!mostRecentEntry) return {};
    
    const readings: Record<string, number> = {};
    (mostRecentEntry.nozzles as any[])?.forEach((n: any) => {
      readings[n.id] = n.closingReading || 0;
    });
    
    return readings;
  }, [cloudEntries, isEditMode, editId]);

  // Get last cash in hand from cloud entries
  const lastCashInHand = useMemo(() => {
    if (cloudEntries.length === 0) return 0;
    
    const sortedEntries = [...cloudEntries].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    
    const mostRecentEntry = isEditMode 
      ? sortedEntries.find(e => e.id !== editId) 
      : sortedEntries[0];
    
    if (!mostRecentEntry) return 0;
    
    // Calculate cash in hand from the last entry
    const entry = cloudToLocalEntry(mostRecentEntry);
    const fuelSales = entry.nozzles?.reduce((sum, n) => {
      const testDeduction = entry.testingDeduction?.[n.fuelType] || 0;
      const liters = Math.max(0, n.closingReading - n.openingReading - testDeduction);
      const rate = entry.fuelRates?.[n.fuelType] || 0;
      return sum + (liters * rate);
    }, 0) || 0;
    
    const lubeSales = entry.lubeItems?.reduce((sum, l) => sum + (l.quantity * l.rate), 0) || 0;
    const incomes = entry.incomes?.reduce((sum, i) => sum + i.amount, 0) || 0;
    const expenses = entry.expenses?.reduce((sum, e) => sum + e.amount, 0) || 0;
    const creditSales = entry.creditSales?.reduce((sum, c) => sum + c.amount, 0) || 0;
    
    return (entry.openingBalance || 0) + fuelSales + lubeSales + incomes 
      - expenses - (entry.cashDeposit || 0) - (entry.upiCollection || 0) - creditSales;
  }, [cloudEntries, isEditMode, editId]);

  // Load entry for edit mode OR create new entry
  useEffect(() => {
    if (isEditMode && editId) {
      // Find the entry in cloud data
      const cloudEntry = cloudEntries.find(e => e.id === editId);
      if (cloudEntry) {
        const localEntry = cloudToLocalEntry(cloudEntry);
        // Set the current entry in the store with all saved data
        usePetrolPumpStore.setState({ currentEntry: localEntry });
      } else {
        toast({
          variant: 'destructive',
          title: 'Entry Not Found',
          description: 'Could not find the entry to edit.',
        });
        navigate('/sales-report');
      }
    } else if (!currentEntry) {
      // Create new entry with carry-forward values
      createNewEntryWithCarryForward();
    }
  }, [editId, isEditMode, cloudEntries.length]);

  // Create new entry with proper carry-forward from cloud
  const createNewEntryWithCarryForward = () => {
    const nozzlesForEntry: Nozzle[] = connectedNozzles.map((cn, index) => ({
      id: cn.id,
      machineId: Math.floor(index / 2) + 1,
      nozzleNumber: (index % 2) + 1,
      fuelType: cn.fuel_type as FuelType,
      openingReading: lastClosingReadings[cn.id] || 0,
      closingReading: lastClosingReadings[cn.id] || 0, // Start with same as opening
    }));

    usePetrolPumpStore.setState({
      currentEntry: {
        id: Math.random().toString(36).substring(2, 15),
        date: format(new Date(), 'yyyy-MM-dd'),
        shiftName: '',
        fuelRates: { ...DEFAULT_FUEL_RATES },
        nozzles: nozzlesForEntry,
        lubeItems: [],
        expenses: [],
        incomes: [],
        creditSales: [],
        upiCollection: 0,
        cashDeposit: 0,
        openingBalance: lastCashInHand,
        testingDeduction: { MS: 0, HSD: 0, POWER: 0 },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    });
  };

  // Sync nozzles with cloud connected nozzles when they change (only for new entries)
  useEffect(() => {
    if (!isEditMode && currentEntry && connectedNozzles.length > 0) {
      const currentNozzleIds = new Set((currentEntry.nozzles || []).map(n => n.id));
      
      // Find new connected nozzles not in current entry
      const newNozzles = connectedNozzles
        .filter(cn => !currentNozzleIds.has(cn.id))
        .map((cn, index) => ({
          id: cn.id,
          machineId: Math.floor(index / 2) + 1,
          nozzleNumber: (index % 2) + 1,
          fuelType: cn.fuel_type as FuelType,
          openingReading: lastClosingReadings[cn.id] || 0,
          closingReading: lastClosingReadings[cn.id] || 0,
        }));
      
      // Also remove nozzles that are no longer connected
      const connectedNozzleIds = new Set(connectedNozzles.map(cn => cn.id));
      const existingConnectedNozzles = (currentEntry.nozzles || []).filter(n => connectedNozzleIds.has(n.id));
      
      // Update if there are changes
      if (newNozzles.length > 0 || existingConnectedNozzles.length !== (currentEntry.nozzles || []).length) {
        const updatedNozzles = [...existingConnectedNozzles, ...newNozzles];
        usePetrolPumpStore.setState({
          currentEntry: {
            ...currentEntry,
            nozzles: updatedNozzles,
          },
        });
      }
    }
  }, [connectedNozzles.length, currentEntry, isEditMode, lastClosingReadings]);

  const handleNext = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Store original nozzles when entering edit mode
  useEffect(() => {
    if (isEditMode && currentEntry && !originalNozzlesRef.current) {
      originalNozzlesRef.current = currentEntry.nozzles?.map(n => ({
        id: n.id,
        fuelType: n.fuelType,
        openingReading: n.openingReading,
        closingReading: n.closingReading,
        label: (n as any).label,
      })) || null;
    }
  }, [isEditMode, currentEntry]);

  const handleSave = async () => {
    // Normalize empty closing readings to opening readings (no sale scenario)
    normalizeNozzleReadings();
    
    // Validate readings
    const validation = validateNozzleReadings();
    if (!validation.valid) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: validation.errors.join('\n'),
      });
      return;
    }

    if (!currentEntry || !isOnline) {
      toast({
        variant: 'destructive',
        title: 'Cannot Save',
        description: isOnline ? 'No entry data found' : 'You are currently offline',
      });
      return;
    }

    if (!clientId) {
      toast({
        variant: 'destructive',
        title: 'Cannot Save',
        description: 'Client ID not found. Please log in again.',
      });
      return;
    }

    setIsSaving(true);
    
    try {
      // Build nozzle-to-tank mapping
      const nozzleTankMap = buildNozzleTankMap(cloudNozzles);
      
      // Prepare the entry data with nozzle labels
      const nozzlesWithLabels: NozzleReading[] = (currentEntry.nozzles || []).map(n => {
        const cloudNozzle = cloudNozzles.find(cn => cn.id === n.id);
        return {
          id: n.id,
          fuelType: n.fuelType,
          openingReading: n.openingReading,
          closingReading: n.closingReading === 0 && n.openingReading > 0 ? n.openingReading : n.closingReading,
          label: cloudNozzle?.label || n.id,
          machineId: n.machineId,
          nozzleNumber: n.nozzleNumber,
        };
      });

      const fuelRatesData = currentEntry.fuelRates 
        ? { ...currentEntry.fuelRates } as Record<string, number> 
        : { MS: 0, HSD: 0, POWER: 0 };
      const testingDeductionData = currentEntry.testingDeduction 
        ? { ...currentEntry.testingDeduction } as Record<string, number> 
        : { MS: 0, HSD: 0, POWER: 0 };

      const entryData = {
        date: currentEntry.date || new Date().toISOString().split('T')[0],
        shift_name: currentEntry.shiftName || null,
        fuel_rates: fuelRatesData,
        nozzles: nozzlesWithLabels,
        lube_items: currentEntry.lubeItems || [],
        expenses: currentEntry.expenses || [],
        incomes: currentEntry.incomes || [],
        credit_sales: currentEntry.creditSales || [],
        upi_collection: currentEntry.upiCollection || 0,
        cash_deposit: currentEntry.cashDeposit || 0,
        opening_balance: currentEntry.openingBalance || 0,
        testing_deduction: testingDeductionData,
      };

      if (isEditMode && editId) {
        // UPDATE: Use transaction service for atomic stock adjustment
        const oldNozzles = originalNozzlesRef.current || [];
        
        // Revert old debtor amounts first
        const oldEntry = cloudEntries.find(e => e.id === editId);
        if (oldEntry?.credit_sales) {
          await revertDebtorOutstanding(
            (oldEntry.credit_sales as any[]).map(cs => ({
              debtorId: cs.debtorId,
              amount: cs.amount,
            }))
          );
        }
        
        // Process the update with atomic stock adjustment
        const result = await updateDailySale(
          clientId,
          editId,
          entryData,
          oldNozzles,
          nozzleTankMap
        );

        if (!result.success) {
          throw new Error('Failed to update daily entry');
        }

        // Update debtor outstanding for new credit sales
        await updateDebtorOutstanding(
          (currentEntry.creditSales || []).map((cs: any) => ({
            debtorId: cs.debtorId,
            amount: cs.amount,
          }))
        );

        toast({
          title: 'Entry Updated',
          description: 'Daily entry and stock levels have been updated atomically.',
        });
      } else {
        // CREATE: Use transaction service for atomic stock deduction
        const result = await createDailySale(clientId, entryData, nozzleTankMap);

        if (!result.success) {
          throw new Error('Failed to create daily entry');
        }

        // Update debtor outstanding amounts for credit sales
        await updateDebtorOutstanding(
          (currentEntry.creditSales || []).map((cs: any) => ({
            debtorId: cs.debtorId,
            amount: cs.amount,
          }))
        );

        // Check for negative stock warning
        let hasNegativeStock = false;
        for (const nozzle of nozzlesWithLabels) {
          const testDeduction = testingDeductionData[nozzle.fuelType] || 0;
          const liters = Math.max(0, nozzle.closingReading - nozzle.openingReading - testDeduction);
          
          if (liters > 0) {
            const tank = getTankForNozzle(nozzle.id);
            if (tank && (tank.current_stock - liters) < 0) {
              hasNegativeStock = true;
              break;
            }
          }
        }

        if (hasNegativeStock) {
          toast({
            variant: 'destructive',
            title: 'Negative Stock Warning',
            description: 'One or more tanks now have negative stock. Please verify your readings.',
          });
        } else {
          toast({
            title: 'Entry Saved',
            description: 'Daily entry and stock levels have been saved atomically.',
          });
        }
      }

      // Trigger data refresh
      await refreshData();
      
      // Clear and navigate
      clearCurrentEntry();
      originalNozzlesRef.current = null;
      navigate('/sales-report');
      
    } catch (error: any) {
      console.error('Error saving daily entry:', error);
      toast({
        variant: 'destructive',
        title: 'Transaction Failed',
        description: error.message || 'Failed to save entry. No changes were made.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    clearCurrentEntry();
    navigate('/');
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <StepRatesAndStaff />;
      case 2:
        return <StepMeterReadings />;
      case 3:
        return <StepLubeSales />;
      case 4:
        return <StepExpensesAndPayments />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {isEditMode ? 'Edit Entry' : 'Daily Entry'}
          </h1>
          <p className="text-muted-foreground">
            {isEditMode 
              ? `Editing entry for ${currentEntry?.date ? format(parseISO(currentEntry.date), 'dd MMM yyyy') : ''}`
              : 'Record today\'s fuel sales and expenses'}
          </p>
        </div>
        <Button variant="outline" onClick={handleCancel}>
          Cancel
        </Button>
      </div>

      {/* Progress Steps */}
      <div className="hidden md:block">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all",
                    currentStep > step.id
                      ? "bg-success text-success-foreground"
                      : currentStep === step.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {currentStep > step.id ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    step.id
                  )}
                </div>
                <div className="mt-2 text-center">
                  <p className={cn(
                    "font-medium text-sm",
                    currentStep >= step.id ? "text-foreground" : "text-muted-foreground"
                  )}>
                    {step.title}
                  </p>
                  <p className="text-xs text-muted-foreground hidden lg:block">
                    {step.description}
                  </p>
                </div>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    "h-1 w-full mx-4 rounded",
                    currentStep > step.id ? "bg-success" : "bg-muted"
                  )}
                  style={{ minWidth: '60px' }}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Mobile Step Indicator */}
      <div className="md:hidden">
        <Card>
          <CardContent className="py-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Step {currentStep} of {steps.length}
              </span>
              <span className="font-medium">{steps[currentStep - 1].title}</span>
            </div>
            <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${(currentStep / steps.length) * 100}%` }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Step Content */}
      <Card>
        <CardHeader>
          <CardTitle>{steps[currentStep - 1].title}</CardTitle>
        </CardHeader>
        <CardContent>{renderStep()}</CardContent>
      </Card>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={currentStep === 1}
        >
          <ChevronLeft className="w-4 h-4 mr-2" />
          Previous
        </Button>

        {currentStep < 4 ? (
          <Button onClick={handleNext}>
            Next
            <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        ) : (
          <Button 
            onClick={handleSave} 
            disabled={isSaving}
            className="bg-success hover:bg-success/90"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            {isSaving ? 'Saving...' : isEditMode ? 'Update Entry' : 'Save Entry'}
          </Button>
        )}
      </div>
    </div>
  );
}
