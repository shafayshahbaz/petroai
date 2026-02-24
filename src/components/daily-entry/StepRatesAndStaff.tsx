import { format, parseISO } from 'date-fns';
import { CalendarIcon, Lock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { usePetrolPumpStore } from '@/store/petrol-pump-store';
import { useCloudData } from '@/contexts/CloudDataContext';
import { cn } from '@/lib/utils';
import { FuelRates } from '@/types/petrol-pump';

interface StepRatesAndStaffProps {
  isFirstEntry?: boolean;
}

export function StepRatesAndStaff({ isFirstEntry: isFirstProp }: StepRatesAndStaffProps) {
  const { currentEntry, updateFuelRates, updateOpeningBalance } = usePetrolPumpStore();
  const { dailyEntries: cloudEntries } = useCloudData();
  
  // Determine if this is the first entry using cloud data (most reliable source)
  const isFirst = isFirstProp !== undefined ? isFirstProp : cloudEntries.length === 0;

  if (!currentEntry) return null;

  const date = currentEntry.date ? parseISO(currentEntry.date) : new Date();
  const rates = currentEntry.fuelRates || { MS: 0, HSD: 0, POWER: 0 };

  const handleDateChange = (newDate: Date | undefined) => {
    if (newDate && currentEntry) {
      // Only update the date — DailyEntry useEffect handles opening balance recalculation
      usePetrolPumpStore.setState({
        currentEntry: {
          ...currentEntry,
          date: format(newDate, 'yyyy-MM-dd'),
        },
      });
    }
  };

  const handleShiftNameChange = (value: string) => {
    if (currentEntry) {
      usePetrolPumpStore.setState({
        currentEntry: {
          ...currentEntry,
          shiftName: value,
        },
      });
    }
  };

  const handleRateChange = (fuelType: keyof FuelRates, value: string) => {
    const numValue = parseFloat(value) || 0;
    updateFuelRates({
      ...rates,
      [fuelType]: numValue,
    });
  };

  const handleOpeningBalanceChange = (value: string) => {
    const numValue = parseFloat(value) || 0;
    updateOpeningBalance(numValue);
  };

  return (
    <div className="space-y-6">
      {/* Date and Shift */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="date">Date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal h-12",
                  !date && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date ? format(date, 'PPP') : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={date}
                onSelect={handleDateChange}
                initialFocus
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-2">
          <Label htmlFor="shiftName">Shift / Staff Name</Label>
          <Input
            id="shiftName"
            placeholder="Enter shift or staff name"
            value={currentEntry.shiftName || ''}
            onChange={(e) => handleShiftNameChange(e.target.value)}
            className="h-12"
          />
        </div>
      </div>

      {/* Opening Balance */}
      <div className="space-y-2">
        <Label htmlFor="openingBalance" className="flex items-center gap-2">
          Opening Balance (Yesterday's Cash in Hand)
          {!isFirst && <Lock className="h-3 w-3 text-muted-foreground" />}
        </Label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
          <Input
            id="openingBalance"
            type="number"
            step="0.01"
            placeholder="0.00"
            value={currentEntry.openingBalance || ''}
            onChange={(e) => handleOpeningBalanceChange(e.target.value)}
            disabled={!isFirst}
            className={cn(
              "h-12 pl-8 number-input text-lg",
              !isFirst && "bg-muted cursor-not-allowed"
            )}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          {isFirst 
            ? "This is your first entry. Enter the opening cash balance manually."
            : "Auto-filled from the last entry's cash in hand. Cannot be modified."
          }
        </p>
      </div>

      {/* Fuel Rates */}
      <div className="space-y-4">
        <h3 className="font-semibold text-lg">Fuel Rates (₹ per Liter)</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="rateMS" className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-amber-500" />
              MS (Petrol)
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
              <Input
                id="rateMS"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={rates.MS || ''}
                onChange={(e) => handleRateChange('MS', e.target.value)}
                className="h-12 pl-8 number-input text-lg"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="rateHSD" className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-green-600" />
              HSD (Diesel)
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
              <Input
                id="rateHSD"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={rates.HSD || ''}
                onChange={(e) => handleRateChange('HSD', e.target.value)}
                className="h-12 pl-8 number-input text-lg"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ratePOWER" className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-blue-600" />
              POWER (Premium)
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
              <Input
                id="ratePOWER"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={rates.POWER || ''}
                onChange={(e) => handleRateChange('POWER', e.target.value)}
                className="h-12 pl-8 number-input text-lg"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}