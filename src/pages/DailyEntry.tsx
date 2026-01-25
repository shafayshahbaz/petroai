import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Save, CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { usePetrolPumpStore, calculateTotals } from '@/store/petrol-pump-store';
import { useToast } from '@/hooks/use-toast';
import { MeterReadingsSection } from '@/components/daily-entry/MeterReadingsSection';
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

export default function DailyEntry() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const { 
    currentEntry, 
    createNewEntry, 
    saveEntry, 
    clearCurrentEntry,
  } = usePetrolPumpStore();

  // Initialize entry if not exists
  if (!currentEntry) {
    createNewEntry(format(selectedDate, 'yyyy-MM-dd'), '', false);
  }

  const totals = useMemo(() => {
    if (!currentEntry) return null;
    return calculateTotals(currentEntry);
  }, [currentEntry]);

  const handleDateChange = (date: Date | undefined) => {
    if (!date) return;
    setSelectedDate(date);
    clearCurrentEntry();
    createNewEntry(format(date, 'yyyy-MM-dd'), '', false);
  };

  const handleSave = () => {
    saveEntry();
    toast({
      title: 'Entry Saved',
      description: `Daily entry for ${format(selectedDate, 'dd MMM yyyy')} saved successfully.`,
    });
    navigate('/sales-report');
  };

  const handleCancel = () => {
    clearCurrentEntry();
    navigate('/');
  };

  if (!currentEntry || !totals) return null;

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
        <div className="flex items-center gap-3">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="gap-2">
                <CalendarIcon className="h-4 w-4" />
                {format(selectedDate, 'dd MMM yyyy')}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={handleDateChange}
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave} className="gap-2">
            <Save className="h-4 w-4" />
            Save Entry
          </Button>
        </div>
      </div>

      {/* Meter Readings */}
      <MeterReadingsSection />

      {/* Fuel Sales Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-amber-500/10 border-amber-500/30">
          <CardContent className="pt-4">
            <p className="text-xs text-amber-600 font-medium">MS Sales</p>
            <p className="text-xl font-mono font-bold">{formatCurrency(totals.fuelSales.MS.amount)}</p>
            <p className="text-xs text-muted-foreground">{totals.fuelSales.MS.liters.toFixed(2)} L</p>
          </CardContent>
        </Card>
        <Card className="bg-pink-500/10 border-pink-500/30">
          <CardContent className="pt-4">
            <p className="text-xs text-pink-600 font-medium">Power Sales</p>
            <p className="text-xl font-mono font-bold">{formatCurrency(totals.fuelSales.POWER.amount)}</p>
            <p className="text-xs text-muted-foreground">{totals.fuelSales.POWER.liters.toFixed(2)} L</p>
          </CardContent>
        </Card>
        <Card className="bg-blue-500/10 border-blue-500/30">
          <CardContent className="pt-4">
            <p className="text-xs text-blue-600 font-medium">HSD Sales</p>
            <p className="text-xl font-mono font-bold">{formatCurrency(totals.fuelSales.HSD.amount)}</p>
            <p className="text-xs text-muted-foreground">{totals.fuelSales.HSD.liters.toFixed(2)} L</p>
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
}
