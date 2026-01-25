import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DensityCheck, calculateCorrectedDensity } from '@/types/purchase';
import { cn } from '@/lib/utils';

interface DensityCalculatorProps {
  densityCheck: DensityCheck;
  onChange: (densityCheck: DensityCheck) => void;
}

export function DensityCalculator({ densityCheck, onChange }: DensityCalculatorProps) {
  const [physicalDensity, setPhysicalDensity] = useState(densityCheck.physicalDensity || 0);
  const [physicalTemp, setPhysicalTemp] = useState(densityCheck.physicalTemp || 15);

  // Determine fuel type based on density (< 800 = MS/Power, >= 800 = HSD)
  const detectedFuelType = physicalDensity > 0 ? (physicalDensity < 800 ? 'MS/Power' : 'HSD') : '-';

  const correctedDensity = physicalDensity > 0 
    ? calculateCorrectedDensity(physicalDensity, physicalTemp) 
    : 0;

  useEffect(() => {
    if (physicalDensity > 0 && physicalTemp > 0) {
      const corrected = calculateCorrectedDensity(physicalDensity, physicalTemp);

      onChange({
        challanDensity: 0, // Not used anymore
        challanTemp: 15,
        physicalDensity,
        physicalTemp,
        correctedDensity: corrected,
        status: 'OK', // Status is now determined by chamber dips
      });
    }
  }, [physicalDensity, physicalTemp, onChange]);

  return (
    <Card className="border-2">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg flex items-center gap-2">
          Density Correction
          <span className="text-sm font-normal text-muted-foreground">
            (Corrected to 15°C)
          </span>
          {physicalDensity > 0 && (
            <span className={cn(
              "ml-2 px-2 py-0.5 rounded text-xs font-medium",
              detectedFuelType === 'HSD' ? "bg-blue-500/20 text-blue-600" : "bg-orange-500/20 text-orange-600"
            )}>
              {physicalDensity < 800 ? '×0.875' : '×1.133'}/°C ({detectedFuelType})
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Physical Measurement Only */}
        <div className="max-w-md mx-auto space-y-4 p-6 bg-muted/30 rounded-lg">
          <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide text-center">
            Physical Measurement
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Observed Density (kg/m³)</Label>
              <Input
                type="number"
                value={physicalDensity || ''}
                onChange={(e) => setPhysicalDensity(Number(e.target.value))}
                placeholder="e.g., 755"
                className="text-lg h-14"
              />
            </div>
            <div className="space-y-2">
              <Label>Observed Temperature (°C)</Label>
              <Input
                type="number"
                value={physicalTemp || ''}
                onChange={(e) => setPhysicalTemp(Number(e.target.value))}
                placeholder="e.g., 19"
                className="text-lg h-14"
              />
            </div>
          </div>
        </div>

        {/* Corrected Density Result */}
        {physicalDensity > 0 && (
          <div className="p-6 rounded-xl border-2 border-primary/30 bg-primary/5 text-center">
            <p className="text-sm text-muted-foreground mb-2">Standard Density at 15°C</p>
            <p className="text-5xl font-bold text-primary">{correctedDensity.toFixed(1)}</p>
            <p className="text-sm text-muted-foreground mt-2">
              kg/m³
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
