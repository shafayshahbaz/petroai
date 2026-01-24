import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Save, CalendarIcon, ToggleLeft, ToggleRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Switch } from '@/components/ui/switch';
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
  const [isMultiDay, setIsMultiDay] = useState(false);
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>(new Date());
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
        format(startDate, 'yyyy-MM-dd'), 
        '', 
        isMultiDay, 
        isMultiDay ? format(endDate, 'yyyy-MM-dd') : undefined
      );
    }
  }, [currentEntry, createNewEntry, startDate, isMultiDay, endDate]);

  const totals = useMemo(() => {
    if (!currentEntry) return null;
    return calculateTotals(currentEntry);
  }, [currentEntry]);

  const handleDateChange = (date: Date | undefined, isEnd = false) => {
    if (!date) return;
    
    if (isEnd) {
      setEndDate(date);
    } else {
      setStartDate(date);
    }
    
    // Recreate entry with new date
    clearCurrentEntry();
    createNewEntry(
      format(isEnd ? startDate : date, 'yyyy-MM-dd'),
      currentEntry?.shiftName || '',
      isMultiDay,
      isMultiDay ? format(isEnd ? date : endDate, 'yyyy-MM-dd') : undefined
    );
  };

  const handleMultiDayToggle = (enabled: boolean) => {
    setIsMultiDay(enabled);
    clearCurrentEntry();
    createNewEntry(
      format(startDate, 'yyyy-MM-dd'),
      '',
      enabled,
      enabled ? format(endDate, 'yyyy-MM-dd') : undefined
    );
  };

  const handleSave = () => {
    saveEntry();
    toast({
      title: 'Entry Saved',
      description: isMultiDay 
        ? `Multi-day entry from ${format(startDate, 'dd MMM')} to ${format(endDate, 'dd MMM')} saved.`
        : `Daily entry for ${format(startDate, 'dd MMM yyyy')} saved.`,
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
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Daily Entry</h1>
          <p className="text-muted-foreground">
            Record sales, expenses, and calculate closing balance
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave} className="bg-success hover:bg-success/90">
            <Save className="w-4 h-4 mr-2" />
            Save Entry
          </Button>
        </div>
      </div>

      {/* Date Selection & Multi-Day Toggle */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            {/* Multi-Day Toggle */}
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <Switch
                id="multi-day"
                checked={isMultiDay}
                onCheckedChange={handleMultiDayToggle}
              />
              <Label htmlFor="multi-day" className="cursor-pointer">
                {isMultiDay ? (
                  <span className="flex items-center gap-2">
                    <ToggleRight className="w-4 h-4 text-primary" />
                    Multi-Day Mode
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <ToggleLeft className="w-4 h-4" />
                    Single Day Mode
                  </span>
                )}
              </Label>
            </div>

            {/* Date Pickers */}
            <div className="flex items-center gap-3 flex-1">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">
                  {isMultiDay ? 'From Date' : 'Date'}
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-[180px] justify-start">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(startDate, 'dd MMM yyyy')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={(date) => handleDateChange(date)}
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {isMultiDay && (
                <>
                  <span className="text-muted-foreground mt-6">to</span>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">To Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-[180px] justify-start">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {format(endDate, 'dd MMM yyyy')}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={endDate}
                          onSelect={(date) => handleDateChange(date, true)}
                          className="p-3 pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </>
              )}
            </div>

            {/* Shift Name */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Shift/Staff</Label>
              <Input
                value={currentEntry.shiftName || ''}
                onChange={(e) => {
                  // Update shift name
                }}
                placeholder="Enter staff name"
                className="w-[180px]"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* TOP SECTION: Meter Readings */}
      <MeterReadingsSection />

      {/* BOTTOM SECTION: T-Format Balance Sheet */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* LEFT COLUMN: Inflows */}
        <InflowsSection totals={totals} />

        {/* RIGHT COLUMN: Outflows */}
        <OutflowsSection totals={totals} />
      </div>

      {/* Closing Balance */}
      <Card className={cn(
        "border-2",
        totals.closingCash >= 0 ? "border-success bg-success/5" : "border-destructive bg-destructive/5"
      )}>
        <CardContent className="py-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Closing Cash in Hand</p>
              <p className="text-xs text-muted-foreground">(Carries forward to next day's Opening Cash)</p>
            </div>
            <p className={cn(
              "text-3xl font-bold font-mono",
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
