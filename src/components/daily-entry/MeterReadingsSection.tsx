import { useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

export function MeterReadingsSection() {
  const { currentEntry, updateNozzle, updateFuelRates } = usePetrolPumpStore();

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

  const grandTotal = totals.MS.amount + totals.HSD.amount + totals.POWER.amount;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sales & Meter Readings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {(['MS', 'POWER', 'HSD'] as FuelType[]).map((fuelType) => (
          <div key={fuelType} className="space-y-3">
            {/* Fuel Type Header */}
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                <span className={cn("w-4 h-4 rounded-full", fuelTypeColors[fuelType])} />
                <h3 className="font-semibold">{fuelTypeNames[fuelType]}</h3>
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
                    <th className="text-right py-2 px-2 font-medium text-muted-foreground">Opening</th>
                    <th className="text-right py-2 px-2 font-medium text-muted-foreground">Closing</th>
                    <th className="text-right py-2 px-2 font-medium text-muted-foreground">Testing</th>
                    <th className="text-right py-2 px-2 font-medium text-muted-foreground">Net Sales (L)</th>
                    <th className="text-right py-2 px-2 font-medium text-muted-foreground">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {groupedNozzles[fuelType].map((nozzle) => {
                    const grossLiters = Math.max(0, nozzle.closingReading - nozzle.openingReading);
                    const netLiters = Math.max(0, grossLiters - (nozzle.testing || 0));
                    const amount = netLiters * (currentEntry.fuelRates?.[fuelType] || 0);
                    
                    return (
                      <tr key={nozzle.id} className="border-b">
                        <td className="py-2 px-2 font-medium">{nozzle.label}</td>
                        <td className="py-2 px-2">
                          <Input
                            type="number"
                            step="0.001"
                            value={nozzle.openingReading || ''}
                            onChange={(e) => handleReadingChange(nozzle.id, 'openingReading', e.target.value)}
                            className="w-28 h-8 text-right ml-auto"
                            placeholder="0.000"
                          />
                        </td>
                        <td className="py-2 px-2">
                          <Input
                            type="number"
                            step="0.001"
                            value={nozzle.closingReading || ''}
                            onChange={(e) => handleReadingChange(nozzle.id, 'closingReading', e.target.value)}
                            className="w-28 h-8 text-right ml-auto"
                            placeholder="0.000"
                          />
                        </td>
                        <td className="py-2 px-2">
                          <Input
                            type="number"
                            step="0.1"
                            value={nozzle.testing || ''}
                            onChange={(e) => handleReadingChange(nozzle.id, 'testing', e.target.value)}
                            className="w-20 h-8 text-right ml-auto"
                            placeholder="0"
                          />
                        </td>
                        <td className="py-2 px-2 text-right font-mono">{formatNumber(netLiters)}</td>
                        <td className="py-2 px-2 text-right font-mono">{formatCurrency(amount)}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-muted/30">
                    <td colSpan={4} className="py-2 px-2 font-semibold text-right">
                      {fuelTypeNames[fuelType]} Total:
                    </td>
                    <td className="py-2 px-2 text-right font-mono font-semibold">
                      {formatNumber(totals[fuelType].liters)} L
                    </td>
                    <td className="py-2 px-2 text-right font-mono font-semibold">
                      {formatCurrency(totals[fuelType].amount)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        ))}

        {/* Grand Total */}
        <div className="bg-primary/10 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-lg">Total Fuel Sales</span>
            <span className="font-mono font-bold text-xl">{formatCurrency(grandTotal)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
