import { useState, useMemo } from 'react';
import { format, subDays } from 'date-fns';
import { 
  FileText, 
  CalendarIcon, 
  Calculator,
  Users,
  Settings2,
  Save,
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  Banknote
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { usePetrolPumpStore } from '@/store/petrol-pump-store';
import { useToast } from '@/hooks/use-toast';
import { FuelType, DEFAULT_FUEL_RATES } from '@/types/petrol-pump';
import { cn } from '@/lib/utils';

const FUEL_COLORS: Record<FuelType, string> = {
  MS: 'bg-orange-500',
  HSD: 'bg-blue-500',
  POWER: 'bg-rose-500',
};

const FUEL_LABELS: Record<FuelType, string> = {
  MS: 'Petrol (MS)',
  HSD: 'Diesel (HSD)',
  POWER: 'Power',
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(num);
}

function getBusinessDateLabel(date: Date): string {
  const prevDay = subDays(date, 1);
  return `${format(prevDay, 'dd MMM')} 7PM - ${format(date, 'dd MMM')} 7PM`;
}

export default function TotalSales() {
  const { toast } = useToast();
  const { 
    shiftEntries, 
    machines,
    getLastShiftClosingReadings,
    getLastCashInHand
  } = usePetrolPumpStore();
  
  const [businessDate, setBusinessDate] = useState<Date>(new Date());
  const [isManualMode, setIsManualMode] = useState(false);
  
  // Manual mode state
  const [manualReadings, setManualReadings] = useState<Record<string, { opening: number; closing: number }>>({});
  const [lubeSales, setLubeSales] = useState(0);
  const [otherIncome, setOtherIncome] = useState(0);
  const [bankDeposit, setBankDeposit] = useState(0);
  const [expenses, setExpenses] = useState(0);

  // Get all nozzles
  const allNozzles = useMemo(() => {
    const nozzles: Array<{
      id: string;
      label: string;
      machineName: string;
      fuelType: FuelType;
    }> = [];
    
    machines.forEach((machine) => {
      machine.nozzles.forEach((nozzle) => {
        nozzles.push({
          id: nozzle.id,
          label: `${machine.name} - ${nozzle.label}`,
          machineName: machine.name,
          fuelType: nozzle.fuelType,
        });
      });
    });
    
    return nozzles;
  }, [machines]);

  // Auto-mode: Aggregate shift entries
  const autoModeData = useMemo(() => {
    const dateStr = format(businessDate, 'yyyy-MM-dd');
    const dayEntries = shiftEntries.filter((e) => e.businessDate === dateStr);
    
    const fuelTotals: Record<FuelType, { liters: number; amount: number }> = {
      MS: { liters: 0, amount: 0 },
      HSD: { liters: 0, amount: 0 },
      POWER: { liters: 0, amount: 0 },
    };
    
    let totalUpi = 0;
    let totalExpenses = 0;
    let totalSalaryAdvance = 0;
    let totalCreditSales = 0;
    let totalCashHandover = 0;
    
    dayEntries.forEach((entry) => {
      entry.nozzleReadings.forEach((reading) => {
        fuelTotals[reading.fuelType].liters += reading.liters;
        fuelTotals[reading.fuelType].amount += reading.amount;
      });
      totalUpi += entry.upiCollection;
      totalExpenses += entry.expenses;
      totalSalaryAdvance += entry.salaryAdvance;
      totalCreditSales += entry.creditSales;
      totalCashHandover += entry.netCashToHandover;
    });
    
    const totalFuelAmount = fuelTotals.MS.amount + fuelTotals.HSD.amount + fuelTotals.POWER.amount;
    const totalFuelLiters = fuelTotals.MS.liters + fuelTotals.HSD.liters + fuelTotals.POWER.liters;
    
    return {
      entries: dayEntries,
      fuelTotals,
      totalFuelAmount,
      totalFuelLiters,
      totalUpi,
      totalExpenses,
      totalSalaryAdvance,
      totalCreditSales,
      totalCashHandover,
    };
  }, [shiftEntries, businessDate]);

  // Manual-mode calculations
  const manualModeData = useMemo(() => {
    const fuelTotals: Record<FuelType, { liters: number; amount: number }> = {
      MS: { liters: 0, amount: 0 },
      HSD: { liters: 0, amount: 0 },
      POWER: { liters: 0, amount: 0 },
    };
    
    allNozzles.forEach((nozzle) => {
      const readings = manualReadings[nozzle.id];
      if (readings) {
        const liters = Math.max(0, readings.closing - readings.opening);
        const rate = DEFAULT_FUEL_RATES[nozzle.fuelType];
        fuelTotals[nozzle.fuelType].liters += liters;
        fuelTotals[nozzle.fuelType].amount += liters * rate;
      }
    });
    
    const totalFuelAmount = fuelTotals.MS.amount + fuelTotals.HSD.amount + fuelTotals.POWER.amount;
    const totalFuelLiters = fuelTotals.MS.liters + fuelTotals.HSD.liters + fuelTotals.POWER.liters;
    
    // T-Format calculations
    const openingCash = getLastCashInHand(format(businessDate, 'yyyy-MM-dd'));
    const totalInflow = openingCash + totalFuelAmount + lubeSales + otherIncome;
    const totalOutflow = bankDeposit + expenses;
    const closingCash = totalInflow - totalOutflow;
    
    return {
      fuelTotals,
      totalFuelAmount,
      totalFuelLiters,
      openingCash,
      totalInflow,
      totalOutflow,
      closingCash,
    };
  }, [manualReadings, allNozzles, lubeSales, otherIncome, bankDeposit, expenses, businessDate, getLastCashInHand]);

  // Initialize manual readings from last closing
  const initializeManualReadings = () => {
    const lastReadings = getLastShiftClosingReadings(format(businessDate, 'yyyy-MM-dd'));
    const newReadings: Record<string, { opening: number; closing: number }> = {};
    allNozzles.forEach((nozzle) => {
      newReadings[nozzle.id] = {
        opening: lastReadings[nozzle.id] || 0,
        closing: lastReadings[nozzle.id] || 0,
      };
    });
    setManualReadings(newReadings);
  };

  const displayData = isManualMode ? manualModeData : autoModeData;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <FileText className="w-7 h-7" />
            Total Sales / Daily Report
          </h1>
          <p className="text-muted-foreground">View aggregated sales or enter manual readings</p>
        </div>
      </div>

      {/* Business Date & Mode Toggle */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
            <div className="flex items-center gap-4">
              <Label>Business Date:</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(businessDate, 'PPP')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={businessDate}
                    onSelect={(date) => date && setBusinessDate(date)}
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
              <Badge variant="secondary">{getBusinessDateLabel(businessDate)}</Badge>
            </div>
            
            <div className="flex items-center gap-3">
              <Label className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                Auto Mode
              </Label>
              <Switch
                checked={isManualMode}
                onCheckedChange={(checked) => {
                  setIsManualMode(checked);
                  if (checked) initializeManualReadings();
                }}
              />
              <Label className="flex items-center gap-2">
                <Settings2 className="w-4 h-4" />
                Manual Mode
              </Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Auto Mode View */}
      {!isManualMode && (
        <div className="space-y-6">
          {autoModeData.entries.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold">No Staff Entries Found</h3>
                <p className="text-muted-foreground">
                  No shift entries recorded for this business date. Add entries in "Sales by Person" or switch to Manual Mode.
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Fuel Breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {(['MS', 'HSD', 'POWER'] as FuelType[]).map((fuelType) => (
                  <Card key={fuelType}>
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-2 mb-3">
                        <span className={cn("w-3 h-3 rounded-full", FUEL_COLORS[fuelType])} />
                        <span className="font-medium">{FUEL_LABELS[fuelType]}</span>
                      </div>
                      <div className="text-2xl font-bold font-mono">
                        {formatCurrency(autoModeData.fuelTotals[fuelType].amount)}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {formatNumber(autoModeData.fuelTotals[fuelType].liters)} Liters
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Staff Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle>Staff Contributions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {autoModeData.entries.map((entry) => (
                      <div key={entry.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <Users className="w-4 h-4 text-primary" />
                          </div>
                          <span className="font-medium">{entry.staffName}</span>
                        </div>
                        <div className="text-right">
                          <p className="font-mono font-semibold">{formatCurrency(entry.totalAmount)}</p>
                          <p className="text-xs text-muted-foreground">
                            Cash: {formatCurrency(entry.netCashToHandover)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Summary */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Inflows */}
                <Card className="border-l-4 border-l-emerald-500">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <ArrowDownLeft className="w-5 h-5 text-emerald-500" />
                      Day Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span>Total Fuel Sales</span>
                      <span className="font-mono">{formatCurrency(autoModeData.totalFuelAmount)}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Total Liters</span>
                      <span className="font-mono">{formatNumber(autoModeData.totalFuelLiters)} L</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between">
                      <span>UPI Collections</span>
                      <span className="font-mono">{formatCurrency(autoModeData.totalUpi)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Expenses Paid</span>
                      <span className="font-mono text-destructive">{formatCurrency(autoModeData.totalExpenses)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Salary Advances</span>
                      <span className="font-mono text-destructive">{formatCurrency(autoModeData.totalSalaryAdvance)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Credit Sales</span>
                      <span className="font-mono text-amber-600">{formatCurrency(autoModeData.totalCreditSales)}</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Net Result */}
                <Card className="border-l-4 border-l-primary">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Banknote className="w-5 h-5 text-primary" />
                      Net Cash Settlement
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-4xl font-bold font-mono text-primary">
                      {formatCurrency(autoModeData.totalCashHandover)}
                    </div>
                    <p className="text-muted-foreground mt-2">
                      Total cash collected from all staff for this business date
                    </p>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </div>
      )}

      {/* Manual Mode View */}
      {isManualMode && (
        <div className="space-y-6">
          {/* Nozzle Readings */}
          <Card>
            <CardHeader>
              <CardTitle>Meter Readings</CardTitle>
              <CardDescription>Enter global opening and closing readings</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="grid grid-cols-5 gap-2 text-sm font-medium text-muted-foreground pb-2 border-b">
                  <span>Nozzle</span>
                  <span className="text-right">Opening</span>
                  <span className="text-right">Closing</span>
                  <span className="text-right">Liters</span>
                  <span className="text-right">Amount</span>
                </div>
                {allNozzles.map((nozzle) => {
                  const readings = manualReadings[nozzle.id] || { opening: 0, closing: 0 };
                  const liters = Math.max(0, readings.closing - readings.opening);
                  const amount = liters * DEFAULT_FUEL_RATES[nozzle.fuelType];
                  
                  return (
                    <div key={nozzle.id} className="grid grid-cols-5 gap-2 items-center">
                      <div className="flex items-center gap-2">
                        <span className={cn("w-2 h-2 rounded-full", FUEL_COLORS[nozzle.fuelType])} />
                        <span className="text-sm truncate">{nozzle.label}</span>
                      </div>
                      <Input
                        type="number"
                        value={readings.opening || ''}
                        onChange={(e) => setManualReadings((prev) => ({
                          ...prev,
                          [nozzle.id]: { ...prev[nozzle.id], opening: parseFloat(e.target.value) || 0 },
                        }))}
                        className="text-right font-mono"
                      />
                      <Input
                        type="number"
                        value={readings.closing || ''}
                        onChange={(e) => setManualReadings((prev) => ({
                          ...prev,
                          [nozzle.id]: { ...prev[nozzle.id], closing: parseFloat(e.target.value) || 0 },
                        }))}
                        className="text-right font-mono"
                      />
                      <div className="text-right font-mono text-sm">{formatNumber(liters)} L</div>
                      <div className="text-right font-mono text-sm font-semibold">{formatCurrency(amount)}</div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Additional Inputs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Lube Sales</Label>
              <Input
                type="number"
                value={lubeSales || ''}
                onChange={(e) => setLubeSales(parseFloat(e.target.value) || 0)}
                className="font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label>Other Income</Label>
              <Input
                type="number"
                value={otherIncome || ''}
                onChange={(e) => setOtherIncome(parseFloat(e.target.value) || 0)}
                className="font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label>Bank Deposit</Label>
              <Input
                type="number"
                value={bankDeposit || ''}
                onChange={(e) => setBankDeposit(parseFloat(e.target.value) || 0)}
                className="font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label>Expenses</Label>
              <Input
                type="number"
                value={expenses || ''}
                onChange={(e) => setExpenses(parseFloat(e.target.value) || 0)}
                className="font-mono"
              />
            </div>
          </div>

          {/* T-Format Balance */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Inflows */}
            <Card className="border-l-4 border-l-emerald-500">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <ArrowDownLeft className="w-5 h-5 text-emerald-500" />
                  INFLOWS
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span>Opening Cash</span>
                  <span className="font-mono">{formatCurrency(manualModeData.openingCash)}</span>
                </div>
                {(['MS', 'HSD', 'POWER'] as FuelType[]).map((ft) => (
                  <div key={ft} className="flex justify-between">
                    <span className="flex items-center gap-2">
                      <span className={cn("w-2 h-2 rounded-full", FUEL_COLORS[ft])} />
                      {FUEL_LABELS[ft]}
                    </span>
                    <span className="font-mono">{formatCurrency(manualModeData.fuelTotals[ft].amount)}</span>
                  </div>
                ))}
                <div className="flex justify-between">
                  <span>Lube Sales</span>
                  <span className="font-mono">{formatCurrency(lubeSales)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Other Income</span>
                  <span className="font-mono">{formatCurrency(otherIncome)}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-bold">
                  <span>TOTAL INFLOW</span>
                  <span className="font-mono">{formatCurrency(manualModeData.totalInflow)}</span>
                </div>
              </CardContent>
            </Card>

            {/* Outflows */}
            <Card className="border-l-4 border-l-destructive">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <ArrowUpRight className="w-5 h-5 text-destructive" />
                  OUTFLOWS
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span>Bank Deposit</span>
                  <span className="font-mono">{formatCurrency(bankDeposit)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Expenses</span>
                  <span className="font-mono">{formatCurrency(expenses)}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-bold">
                  <span>TOTAL OUTFLOW</span>
                  <span className="font-mono">{formatCurrency(manualModeData.totalOutflow)}</span>
                </div>
                <div className="h-16" />
                <Separator />
                <div className="flex justify-between font-bold text-lg">
                  <span>CLOSING CASH</span>
                  <span className="font-mono text-primary">{formatCurrency(manualModeData.closingCash)}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
