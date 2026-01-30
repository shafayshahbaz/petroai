import { useMemo } from 'react';
import { Lock, AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { usePetrolPumpStore } from '@/store/petrol-pump-store';
import { useCloudData } from '@/contexts/CloudDataContext';
import { FuelType } from '@/types/petrol-pump';
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
  const { nozzles: cloudNozzles, getConnectedNozzles } = useCloudData();
  const isFirst = isFirstEntry();

  // Get connected nozzles from cloud data
  const connectedCloudNozzles = getConnectedNozzles();

  // Map cloud nozzles to the format expected by the component
  const nozzlesFromCloud = useMemo(() => {
    return connectedCloudNozzles.map(n => ({
      id: n.id,
      fuelType: n.fuel_type as FuelType,
      label: n.label,
    }));
  }, [connectedCloudNozzles]);

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

  // Show empty state if no nozzles are connected
  if (!currentEntry.nozzles || currentEntry.nozzles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <AlertCircle className="w-16 h-16 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">No Nozzles Connected</h3>
        <p className="text-muted-foreground max-w-md">
          Please go to the Stock page and connect nozzles to tanks before entering meter readings.
        </p>
        {cloudNozzles.length > 0 && connectedCloudNozzles.length === 0 && (
          <p className="text-sm text-amber-600 mt-4">
            You have {cloudNozzles.length} nozzle(s) registered but none are connected to tanks.
          </p>
        )}
      </div>
    );
  }

  const handleReadingChange = (nozzleId: string, field: 'openingReading' | 'closingReading', value: string) => {
    const numValue = parseFloat(value) || 0;
    updateNozzle(nozzleId, { [field]: numValue });
  };

  const handleTestingChange = (fuelType: FuelType, value: string) => {
    const numValue = parseFloat(value) || 0;
    updateTestingDeduction(fuelType, numValue);
  };

  // Find the cloud nozzle label for a given nozzle ID
  const getNozzleLabel = (nozzleId: string) => {
    const cloudNozzle = nozzlesFromCloud.find(n => n.id === nozzleId);
    if (cloudNozzle) return cloudNozzle.label;
    // Fallback: Extract label from nozzle ID: "nozzle-MS-N1" -> "N1"
    const parts = nozzleId.split('-');
    return parts.length >= 3 ? parts.slice(2).join('-') : nozzleId;
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
          {groupedNozzles[fuelType].length > 0 ? (
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
                  {groupedNozzles[fuelType].map((nozzle) => {
                    const nozzleLabel = getNozzleLabel(nozzle.id);
                    const sales = Math.max(0, nozzle.closingReading - nozzle.openingReading);
                    
                    return (
                      <tr key={nozzle.id} className="border-b">
                        <td className="py-3 px-2">
                          <span className="font-medium">{nozzleLabel}</span>
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
          ) : (
            <div className="text-center py-4 text-muted-foreground text-sm border rounded-lg">
              No {fuelTypeNames[fuelType]} nozzles connected
            </div>
          )}

          {/* Fuel Type Totals */}
          {groupedNozzles[fuelType].length > 0 && (
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
          )}
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
