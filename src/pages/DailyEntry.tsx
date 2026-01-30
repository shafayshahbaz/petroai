import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ChevronLeft, ChevronRight, Check, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { usePetrolPumpStore } from '@/store/petrol-pump-store';
import { useCloudData } from '@/contexts/CloudDataContext';
import { useToast } from '@/hooks/use-toast';
import { StepRatesAndStaff } from '@/components/daily-entry/StepRatesAndStaff';
import { StepMeterReadings } from '@/components/daily-entry/StepMeterReadings';
import { StepLubeSales } from '@/components/daily-entry/StepLubeSales';
import { StepExpensesAndPayments } from '@/components/daily-entry/StepExpensesAndPayments';
import { cn } from '@/lib/utils';
import { FuelType } from '@/types/petrol-pump';

const steps = [
  { id: 1, title: 'Rates & Staff', description: 'Set fuel rates and shift details' },
  { id: 2, title: 'Meter Readings', description: 'Enter nozzle readings' },
  { id: 3, title: 'Lube Sales', description: 'Add lube/oil sales' },
  { id: 4, title: 'Expenses & Payment', description: 'Final calculations' },
];

export default function DailyEntry() {
  const [currentStep, setCurrentStep] = useState(1);
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const { 
    currentEntry, 
    createNewEntry, 
    saveEntry, 
    clearCurrentEntry,
    validateNozzleReadings,
    normalizeNozzleReadings,
    getLastClosingReadings
  } = usePetrolPumpStore();
  
  // Get connected nozzles from cloud data
  const { nozzles: cloudNozzles, getConnectedNozzles, isOnline } = useCloudData();
  const connectedNozzles = getConnectedNozzles();

  // Initialize or sync entry on mount
  useEffect(() => {
    if (!currentEntry) {
      createNewEntry(format(new Date(), 'yyyy-MM-dd'), '');
    }
  }, [currentEntry, createNewEntry]);
  
  // Sync nozzles with cloud connected nozzles when they change
  useEffect(() => {
    if (currentEntry && connectedNozzles.length > 0) {
      const lastReadings = getLastClosingReadings();
      const currentNozzleIds = new Set((currentEntry.nozzles || []).map(n => n.id));
      
      // Find new connected nozzles not in current entry
      const newNozzles = connectedNozzles
        .filter(cn => !currentNozzleIds.has(cn.id))
        .map((cn, index) => ({
          id: cn.id,
          machineId: Math.floor(index / 2) + 1,
          nozzleNumber: (index % 2) + 1,
          fuelType: cn.fuel_type as FuelType,
          openingReading: lastReadings[cn.id] || 0,
          closingReading: lastReadings[cn.id] || 0,
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
  }, [connectedNozzles.length, currentEntry, getLastClosingReadings]);

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

  const handleSave = () => {
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
    
    const result = saveEntry();
    
    // Check for negative stock warning
    if (result && result.hasNegativeStock) {
      toast({
        variant: 'destructive',
        title: 'Negative Stock Warning',
        description: 'One or more tanks now have negative stock. Please verify your readings or check for calibration errors.',
      });
    } else {
      toast({
        title: 'Entry Saved',
        description: 'Daily entry has been saved successfully.',
      });
    }
    navigate('/sales-report');
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
          <h1 className="text-2xl font-bold text-foreground">Daily Entry</h1>
          <p className="text-muted-foreground">
            Record today's fuel sales and expenses
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
          <Button onClick={handleSave} className="bg-success hover:bg-success/90">
            <Save className="w-4 h-4 mr-2" />
            Save Entry
          </Button>
        )}
      </div>
    </div>
  );
}
