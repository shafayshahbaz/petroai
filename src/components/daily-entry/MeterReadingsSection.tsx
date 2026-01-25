import { useMemo } from 'react';
import { Info, Lock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { usePetrolPumpStore } from '@/store/petrol-pump-store';
import { FuelType, FUEL_TYPE_INFO } from '@/types/petrol-pump';
import { cn } from '@/lib/utils';

function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 2,
  }).format(num);
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(amount);
}

// Updated color scheme: MS=Orange, HSD=Blue, Power=Pink
const FUEL_COLORS: Record<FuelType, { primary: string; text: string }> = {
  MS: { primary: 'bg-amber-500', text: 'text-amber-600' },
  HSD: { primary: 'bg-blue-600', text: 'text-blue-600' },
  POWER: { primary: 'bg-pink-500', text: 'text-pink-600' },
};

const FUEL_LABELS: Record<FuelType, string> = {
  MS: 'MS (Petrol)',
  HSD: 'HSD (Diesel)',
  POWER: 'Power',
};

export function MeterReadingsSection() {
  const { currentEntry, updateNozzle, updateFuelRates, tanks, entries } = usePetrolPumpStore();

  // Check if this is Day 1 (no previous entries exist)
  const isFirstEntry = entries.length === 0;

  // Group nozzles by fuel type
  const groupedNozzles = useMemo(() => {
    if (!currentEntry?.nozzles) return { MS: [], HSD: [], POWER: [] };
    
    const grouped: Record<FuelType, typeof currentEntry.nozzles> = {
      MS: [],
      HSD: [],
      POWER: [],
    };
    
    currentEntry.nozzles.forEach((nozzle) => {
      grouped[nozzle.fuelType].push(nozzle);
    });
    
    return grouped;
  }, [currentEntry?.nozzles]);

  const totals = useMemo(() => {
    if (!currentEntry?.nozzles || !currentEntry?.fuelRates) {
      return { MS: { liters: 0, amount: 0 }, HSD: { liters: 0, amount: 0 }, POWER: { liters: 0, amount: 0 } };
    }

    const result: Record<FuelType, { liters: number; amount: number }> = {
      MS: { liters: 0, amount: 0 },
      HSD: { liters: 0, amount: 0 },
      POWER: { liters: 0, amount: 0 },
    };

    currentEntry.nozzles.forEach((nozzle) => {
      const grossLiters = Math.max(0, nozzle.closingReading - nozzle.openingReading);
      const netLiters = Math.max(0, grossLiters - (nozzle.testing || 0));
      result[nozzle.fuelType].liters += netLiters;
    });

    (['MS', 'HSD', 'POWER'] as FuelType[]).forEach((fuelType) => {
      result[fuelType].amount = result[fuelType].liters * (currentEntry.fuelRates?.[fuelType] || 0);
    });

    return result;
  }, [currentEntry?.nozzles, currentEntry?.fuelRates]);

  if (!currentEntry) return null;

  const handleReadingChange = (nozzleId: string, field: 'openingReading' | 'closingReading' | 'testing', value: string) => {
    const numValue = parseFloat(value) || 0;
    updateNozzle(nozzleId, { [field]: numValue });
  };

  const handleRateChange = (fuelType: FuelType, value: string) => {
    const numValue = parseFloat(value) || 0;
    updateFuelRates({
      ...currentEntry.fuelRates!,
      [fuelType]: numValue,
    });
  };

  // Helper to get tank name for a nozzle
  const getTankName = (tankId?: string): string | null => {
    if (!tankId) return null;
    const tank = tanks.find((t) => t.id === tankId);
    return tank?.name || null;
  };

  const grandTotal = totals.MS.amount + totals.HSD.amount + totals.POWER.amount;

  return (
    <TooltipProvider>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Meter Readings</CardTitle>
            {!isFirstEntry && (
              <Badge variant="outline" className="gap-1">
                <Lock className="w-3 h-3" />
                Opening Readings Locked
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {(['MS', 'POWER', 'HSD'] as FuelType[]).map((fuelType) => {
            const nozzles = groupedNozzles[fuelType];
            if (nozzles.length === 0) return null;

            const colors = FUEL_COLORS[fuelType];

            return (
              <div key={fuelType} className="space-y-3">
                {/* Fuel Type Header */}
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className={cn("w-4 h-4 rounded-full", colors.primary)} />
                    <h3 className="font-semibold">{FUEL_LABELS[fuelType]}</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Rate:</span>
                    <div className="relative w-28">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">₹</span>
                      <Input
                        type="number"
                        step="0.01"
                        value={currentEntry.fuelRates?.[fuelType] || ''}
                        onChange={(e) => handleRateChange(fuelType, e.target.value)}
                        className="pl-6 h-8 text-right text-sm"
                        placeholder="0.00"
                      />
                    </div>
                    <span className="text-sm text-muted-foreground">/L</span>
                  </div>
                </div>

                {/* Nozzles Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-2 font-medium text-muted-foreground">Nozzle</th>
                        <th className="text-right py-2 px-2 font-medium text-muted-foreground">
                          Opening {!isFirstEntry && <Lock className="w-3 h-3 inline ml-1" />}
                        </th>
                        <th className="text-right py-2 px-2 font-medium text-muted-foreground">Closing</th>
                        <th className="text-right py-2 px-2 font-medium text-muted-foreground">Sales (L)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {nozzles.map((nozzle) => {
                        const netLiters = Math.max(0, nozzle.closingReading - nozzle.openingReading);
                        const tankName = getTankName(nozzle.tankId);
                        
                        return (
                          <tr key={nozzle.id} className="border-b">
                            <td className="py-2 px-2">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="flex items-center gap-2 cursor-help">
                                    <span className="font-medium">{nozzle.label}</span>
                                    {tankName && (
                                      <Info className="w-3 h-3 text-muted-foreground" />
                                    )}
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Connected to: {tankName || 'No tank assigned'}</p>
                                </TooltipContent>
                              </Tooltip>
                            </td>
                            <td className="py-2 px-2">
                              <Input
                                type="number"
                                step="0.001"
                                value={nozzle.openingReading || ''}
                                onChange={(e) => handleReadingChange(nozzle.id, 'openingReading', e.target.value)}
                                className={cn(
                                  "w-28 h-8 text-right ml-auto font-mono",
                                  !isFirstEntry && "bg-muted cursor-not-allowed"
                                )}
                                placeholder="0.000"
                                disabled={!isFirstEntry}
                                readOnly={!isFirstEntry}
                              />
                            </td>
                            <td className="py-2 px-2">
                              <Input
                                type="number"
                                step="0.001"
                                value={nozzle.closingReading || ''}
                                onChange={(e) => handleReadingChange(nozzle.id, 'closingReading', e.target.value)}
                                className="w-28 h-8 text-right ml-auto font-mono"
                                placeholder="0.000"
                              />
                            </td>
                            <td className="py-2 px-2 text-right font-mono font-semibold">{formatNumber(netLiters)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="bg-muted/30">
                        <td colSpan={3} className="py-2 px-2 font-semibold text-right">
                          Total {FUEL_LABELS[fuelType]}:
                        </td>
                        <td className="py-2 px-2 text-right font-mono font-semibold">
                          {formatNumber(totals[fuelType].liters)} L
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Fuel Type Sales Summary */}
                <div className={cn("flex items-center justify-between p-2 rounded-lg border", 
                  fuelType === 'MS' && "bg-amber-500/10 border-amber-500/30",
                  fuelType === 'HSD' && "bg-blue-500/10 border-blue-500/30",
                  fuelType === 'POWER' && "bg-pink-500/10 border-pink-500/30"
                )}>
                  <span className={cn("text-sm font-medium", colors.text)}>
                    {FUEL_LABELS[fuelType]} Sales
                  </span>
                  <span className="font-mono font-bold">{formatCurrency(totals[fuelType].amount)}</span>
                </div>
              </div>
            );
          })}

          {/* Grand Total */}
          <div className="bg-primary/10 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-lg">Net Sales Amount</span>
              <span className="font-mono font-bold text-xl">{formatCurrency(grandTotal)}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
