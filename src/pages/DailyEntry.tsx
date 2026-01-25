import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, subHours, startOfDay, addDays } from 'date-fns';
import { Save, CalendarIcon, Check, ArrowRight, ArrowLeft, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { usePetrolPumpStore, calculateTotals } from '@/store/petrol-pump-store';
import { useToast } from '@/hooks/use-toast';
import { MeterReadingsSection } from '@/components/daily-entry/MeterReadingsSection';
import { StepLubeSales } from '@/components/daily-entry/StepLubeSales';
import { InflowsSection } from '@/components/daily-entry/InflowsSection';
import { OutflowsSection } from '@/components/daily-entry/OutflowsSection';
import { cn } from '@/lib/utils';

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(amount);
}

// Business Day: 7PM previous day to 7PM current day
function getBusinessDate(date: Date): Date {
  const hour = date.getHours();
  // If before 7PM (19:00), business date is today
  // If after 7PM, business date is tomorrow
  if (hour >= 19) {
    return addDays(startOfDay(date), 1);
  }
  return startOfDay(date);
}

const steps = [
  { id: 1, title: 'Rates & Staff', description: 'Set fuel rates and shift details' },
  { id: 2, title: 'Meter Readings', description: 'Enter nozzle readings' },
  { id: 3, title: 'Lube Sales', description: 'Add lube/oil sales' },
  { id: 4, title: 'Expenses & Payment', description: 'Final calculations' },
];

export default function DailyEntry() {
  const [currentStep, setCurrentStep] = useState(1);
  const [businessDate, setBusinessDate] = useState<Date>(getBusinessDate(new Date()));
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const { 
    currentEntry, 
    createNewEntry, 
    saveEntry, 
    clearCurrentEntry,
    updateFuelRates,
  } = usePetrolPumpStore();

  // Initialize entry if not exists
  useEffect(() => {
    if (!currentEntry) {
      createNewEntry(
        format(businessDate, 'yyyy-MM-dd'), 
        '', 
        false
      );
    }
  }, [currentEntry, createNewEntry, businessDate]);

  const totals = useMemo(() => {
    if (!currentEntry) return null;
    return calculateTotals(currentEntry);
  }, [currentEntry]);

  const handleDateChange = (date: Date | undefined) => {
    if (!date) return;
    setBusinessDate(date);
    clearCurrentEntry();
    createNewEntry(
      format(date, 'yyyy-MM-dd'),
      currentEntry?.shiftName || '',
      false
    );
  };

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
    saveEntry();
    toast({
      title: 'Entry Saved',
      description: `Daily entry for ${format(businessDate, 'dd MMM yyyy')} saved successfully.`,
    });
    navigate('/sales-report');
  };

  const handleCancel = () => {
    clearCurrentEntry();
    navigate('/');
  };

  if (!currentEntry || !totals) return null;

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            {/* Business Date Selector */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Business Date</CardTitle>
                <CardDescription>
                  Business day runs from 7:00 PM previous day to 7:00 PM current day
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-[200px] justify-start">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {format(businessDate, 'dd MMM yyyy')}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={businessDate}
                        onSelect={handleDateChange}
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                  <span className="text-sm text-muted-foreground">
                    (Covers: {format(subHours(businessDate, 24 + 5), 'dd MMM')} 7PM → {format(businessDate, 'dd MMM')} 7PM)
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Shift/Staff Name */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Shift Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label htmlFor="shiftName">Shift / Staff Name (Optional)</Label>
                  <Input
                    id="shiftName"
                    value={currentEntry.shiftName || ''}
                    onChange={(e) => {
                      // Will update when we wire this properly
                    }}
                    placeholder="e.g., Morning Shift - Rahul"
                    className="max-w-md"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Fuel Rates Preview */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Today's Fuel Rates</CardTitle>
                <CardDescription>
                  Rates will be used to calculate sales amounts
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                    <p className="text-xs text-amber-600 font-medium">MS (Petrol)</p>
                    <p className="text-2xl font-mono font-bold">₹{currentEntry.fuelRates?.MS || 0}</p>
                  </div>
                  <div className="p-4 bg-pink-500/10 border border-pink-500/30 rounded-lg">
                    <p className="text-xs text-pink-600 font-medium">Power</p>
                    <p className="text-2xl font-mono font-bold">₹{currentEntry.fuelRates?.POWER || 0}</p>
                  </div>
                  <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                    <p className="text-xs text-blue-600 font-medium">HSD (Diesel)</p>
                    <p className="text-2xl font-mono font-bold">₹{currentEntry.fuelRates?.HSD || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 2:
        return <MeterReadingsSection />;

      case 3:
        return <StepLubeSales />;

      case 4:
        return (
          <div className="space-y-6">
            {/* Fuel Sales Summary Cards */}
            <div className="grid grid-cols-3 gap-4">
              <Card className="bg-amber-500/10 border-amber-500/30">
                <CardContent className="pt-4">
                  <p className="text-xs text-amber-600 font-medium">MS Sales</p>
                  <p className="text-xl font-mono font-bold">{formatCurrency(totals.fuelSales.MS.amount)}</p>
                  <p className="text-xs text-muted-foreground">{totals.fuelSales.MS.liters.toFixed(2)} L × ₹{currentEntry.fuelRates?.MS}</p>
                </CardContent>
              </Card>
              <Card className="bg-pink-500/10 border-pink-500/30">
                <CardContent className="pt-4">
                  <p className="text-xs text-pink-600 font-medium">Power Sales</p>
                  <p className="text-xl font-mono font-bold">{formatCurrency(totals.fuelSales.POWER.amount)}</p>
                  <p className="text-xs text-muted-foreground">{totals.fuelSales.POWER.liters.toFixed(2)} L × ₹{currentEntry.fuelRates?.POWER}</p>
                </CardContent>
              </Card>
              <Card className="bg-blue-500/10 border-blue-500/30">
                <CardContent className="pt-4">
                  <p className="text-xs text-blue-600 font-medium">HSD Sales</p>
                  <p className="text-xl font-mono font-bold">{formatCurrency(totals.fuelSales.HSD.amount)}</p>
                  <p className="text-xs text-muted-foreground">{totals.fuelSales.HSD.liters.toFixed(2)} L × ₹{currentEntry.fuelRates?.HSD}</p>
                </CardContent>
              </Card>
            </div>

            {/* T-Format Balance Sheet */}
            <div className="grid gap-6 lg:grid-cols-2">
              <InflowsSection totals={totals} />
              <OutflowsSection totals={totals} />
            </div>

            {/* Final Cash Summary */}
            <Card className={cn(
              "border-2",
              totals.closingCash >= 0 ? "border-success bg-success/5" : "border-destructive bg-destructive/5"
            )}>
              <CardContent className="py-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-lg font-semibold">Cash in Hand</p>
                    <p className="text-sm text-muted-foreground">Total Inflow - Total Outflow</p>
                  </div>
                  <p className={cn(
                    "text-4xl font-bold font-mono",
                    totals.closingCash >= 0 ? "text-success" : "text-destructive"
                  )}>
                    {formatCurrency(totals.closingCash)}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
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
      <div className="flex items-center justify-between">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-center flex-1">
            <div className="flex flex-col items-center flex-1">
              <button
                onClick={() => setCurrentStep(step.id)}
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center transition-all font-semibold",
                  currentStep > step.id
                    ? "bg-success text-success-foreground"
                    : currentStep === step.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {currentStep > step.id ? <Check className="w-5 h-5" /> : step.id}
              </button>
              <div className="mt-2 text-center">
                <p className={cn(
                  "text-sm font-medium",
                  currentStep >= step.id ? "text-foreground" : "text-muted-foreground"
                )}>
                  {step.title}
                </p>
                <p className="text-xs text-muted-foreground hidden sm:block">
                  {step.description}
                </p>
              </div>
            </div>
            {index < steps.length - 1 && (
              <div
                className={cn(
                  "h-1 flex-1 mx-2 rounded",
                  currentStep > step.id ? "bg-success" : "bg-muted"
                )}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <div className="min-h-[400px]">
        {renderStepContent()}
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between pt-4 border-t">
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={currentStep === 1}
          className="gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Previous
        </Button>

        {currentStep < 4 ? (
          <Button onClick={handleNext} className="gap-2">
            Next
            <ArrowRight className="w-4 h-4" />
          </Button>
        ) : (
          <Button onClick={handleSave} className="bg-success hover:bg-success/90 gap-2">
            <Save className="w-4 h-4" />
            Save Entry
          </Button>
        )}
      </div>
    </div>
  );
}
