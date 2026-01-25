import { useMemo } from 'react';
import { Lock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { usePetrolPumpStore } from '@/store/petrol-pump-store';
import { DEFAULT_NOZZLE_CONFIG, FuelType } from '@/types/petrol-pump';
import { cn } from '@/lib/utils';

const fuelTypeColors: Record<FuelType, string> = {
  MS: 'bg-amber-500',
  HSD: 'bg-green-600',
  POWER: 'bg-blue-600',
};

const fuelTypeNames: Record<FuelType, string> = {
  MS: 'MS (Petrol)',
  HSD: 'HSD (Diesel)',
  POWER: 'POWER (Premium)',
};

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

export function StepMeterReadings() {
  const { currentEntry, updateNozzle, updateTestingDeduction, isFirstEntry } = usePetrolPumpStore();
  const isFirst = isFirstEntry();

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
      const liters = Math.max(0, nozzle.closingReading - nozzle.openingReading);
      result[nozzle.fuelType].liters += liters;
    });

    const testingDeduction = currentEntry.testingDeduction || { MS: 0, HSD: 0, POWER: 0 };

    (['MS', 'HSD', 'POWER'] as FuelType[]).forEach((fuelType) => {
      const netLiters = Math.max(0, result[fuelType].liters - (testingDeduction[fuelType] || 0));
      result[fuelType].amount = netLiters * (currentEntry.fuelRates?.[fuelType] || 0);
    });

    return result;
  }, [currentEntry?.nozzles, currentEntry?.fuelRates, currentEntry?.testingDeduction]);

  if (!currentEntry) return null;

  const handleReadingChange = (nozzleId: string, field: 'openingReading' | 'closingReading', value: string) => {
    const numValue = parseFloat(value) || 0;
    updateNozzle(nozzleId, { [field]: numValue });
  };

  const handleTestingChange = (fuelType: FuelType, value: string) => {
    const numValue = parseFloat(value) || 0;
    updateTestingDeduction(fuelType, numValue);
  };

  return (
    <div className="space-y-8">
      {(['MS', 'POWER', 'HSD'] as FuelType[]).map((fuelType) => (
        <div key={fuelType} className="space-y-4">
          {/* Fuel Type Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className={cn("w-4 h-4 rounded-full", fuelTypeColors[fuelType])} />
              <h3 className="font-semibold text-lg">{fuelTypeNames[fuelType]}</h3>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">
                Rate: ₹{currentEntry.fuelRates?.[fuelType]?.toFixed(2) || '0.00'}/L
              </p>
            </div>
          </div>

          {/* Nozzles Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-2 text-sm font-medium text-muted-foreground">Nozzle</th>
                  <th className="text-right py-2 px-2 text-sm font-medium text-muted-foreground">
                    <span className="flex items-center justify-end gap-1">
                      Opening
                      {!isFirst && <Lock className="h-3 w-3" />}
                    </span>
                  </th>
                  <th className="text-right py-2 px-2 text-sm font-medium text-muted-foreground">Closing</th>
                  <th className="text-right py-2 px-2 text-sm font-medium text-muted-foreground">Sales (L)</th>
                </tr>
              </thead>
              <tbody>
                {groupedNozzles[fuelType].map((nozzle, index) => {
                  const config = DEFAULT_NOZZLE_CONFIG.find(
                    (c) => c.fuelType === fuelType && 
                    DEFAULT_NOZZLE_CONFIG.filter((nc) => nc.fuelType === fuelType).indexOf(c) === index
                  );
                  const sales = Math.max(0, nozzle.closingReading - nozzle.openingReading);
                  
                  return (
                    <tr key={nozzle.id} className="border-b">
                      <td className="py-3 px-2">
                        <span className="font-medium">{config?.label || `Nozzle ${index + 1}`}</span>
                      </td>
                      <td className="py-3 px-2">
                        <Input
                          type="number"
                          step="0.001"
                          value={nozzle.openingReading || ''}
                          onChange={(e) => handleReadingChange(nozzle.id, 'openingReading', e.target.value)}
                          disabled={!isFirst}
                          className={cn(
                            "w-32 h-10 number-input text-right ml-auto",
                            !isFirst && "bg-muted cursor-not-allowed"
                          )}
                          placeholder="0.000"
                        />
                      </td>
                      <td className="py-3 px-2">
                        <Input
                          type="number"
                          step="0.001"
                          value={nozzle.closingReading || ''}
                          onChange={(e) => handleReadingChange(nozzle.id, 'closingReading', e.target.value)}
                          className="w-32 h-10 number-input text-right ml-auto"
                          placeholder="0.000"
                        />
                      </td>
                      <td className="py-3 px-2 text-right font-mono font-medium">
                        {formatNumber(sales)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Fuel Type Totals */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total Sales (Liters)</span>
              <span className="font-mono font-semibold">{formatNumber(totals[fuelType].liters)} L</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Testing Deduction</span>
                <Input
                  type="number"
                  step="0.01"
                  value={currentEntry.testingDeduction?.[fuelType] || ''}
                  onChange={(e) => handleTestingChange(fuelType, e.target.value)}
                  className="w-24 h-8 number-input text-right"
                  placeholder="0.00"
                />
              </div>
              <span className="font-mono text-muted-foreground">-{formatNumber(currentEntry.testingDeduction?.[fuelType] || 0)} L</span>
            </div>
            <div className="flex items-center justify-between border-t pt-2">
              <span className="font-medium">Net Sales Amount</span>
              <span className="font-mono font-bold text-lg">{formatCurrency(totals[fuelType].amount)}</span>
            </div>
          </div>
        </div>
      ))}

      {/* Grand Total */}
      <div className="bg-primary/10 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-lg">Total Fuel Sales</span>
          <span className="font-mono font-bold text-xl">
            {formatCurrency(totals.MS.amount + totals.HSD.amount + totals.POWER.amount)}
          </span>
        </div>
      </div>

      {!isFirst && (
        <p className="text-xs text-muted-foreground text-center">
          Opening readings are locked and auto-filled from yesterday's closing readings.
        </p>
      )}
    </div>
  );
}