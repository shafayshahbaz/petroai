import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { DensityCheck, calculateCorrectedDensity } from '@/types/purchase';
import { cn } from '@/lib/utils';

interface DensityCalculatorProps {
  densityCheck: DensityCheck;
  onChange: (densityCheck: DensityCheck) => void;
}

export function DensityCalculator({ densityCheck, onChange }: DensityCalculatorProps) {
  const [challanDensity, setChallanDensity] = useState(densityCheck.challanDensity || 0);
  const [challanTemp, setChallanTemp] = useState(densityCheck.challanTemp || 15);
  const [physicalDensity, setPhysicalDensity] = useState(densityCheck.physicalDensity || 0);
  const [physicalTemp, setPhysicalTemp] = useState(densityCheck.physicalTemp || 15);

  // Determine fuel type based on density (< 800 = MS/Power, >= 800 = HSD)
  const detectedFuelType = physicalDensity > 0 ? (physicalDensity < 800 ? 'MS/Power' : 'HSD') : '-';

  useEffect(() => {
    if (physicalDensity > 0 && physicalTemp > 0) {
      const corrected = calculateCorrectedDensity(physicalDensity, physicalTemp);
      const difference = Math.abs(challanDensity - corrected);
      const status: 'OK' | 'FAIL' = difference <= 3.0 ? 'OK' : 'FAIL';

      onChange({
        challanDensity,
        challanTemp,
        physicalDensity,
        physicalTemp,
        correctedDensity: corrected,
        status,
      });
    }
  }, [challanDensity, challanTemp, physicalDensity, physicalTemp, onChange]);

  const correctedDensity = physicalDensity > 0 
    ? calculateCorrectedDensity(physicalDensity, physicalTemp) 
    : 0;
  const difference = Math.abs(challanDensity - correctedDensity);
  const isPass = difference <= 3.0;

  return (
    <Card className="border-2">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg flex items-center gap-2">
          Density Check
          <span className="text-sm font-normal text-muted-foreground">
            (ASTM D1250 Table 53B @ 15°C)
          </span>
          {physicalDensity > 0 && (
            <span className={cn(
              "ml-2 px-2 py-0.5 rounded text-xs font-medium",
              detectedFuelType === 'HSD' ? "bg-blue-500/20 text-blue-600" : "bg-orange-500/20 text-orange-600"
            )}>
              K₀ = {physicalDensity < 800 ? '346.4228' : '186.9696'} ({detectedFuelType})
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Challan Values */}
          <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
            <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
              Challan Values
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Density (kg/m³)</Label>
                <Input
                  type="number"
                  value={challanDensity || ''}
                  onChange={(e) => setChallanDensity(Number(e.target.value))}
                  placeholder="e.g., 755"
                  className="text-lg h-12"
                />
              </div>
              <div className="space-y-2">
                <Label>Temperature (°C)</Label>
                <Input
                  type="number"
                  value={challanTemp || ''}
                  onChange={(e) => setChallanTemp(Number(e.target.value))}
                  placeholder="e.g., 15"
                  className="text-lg h-12"
                />
              </div>
            </div>
          </div>

          {/* Physical Values */}
          <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
            <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
              Physical Measurement
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Density (kg/m³)</Label>
                <Input
                  type="number"
                  value={physicalDensity || ''}
                  onChange={(e) => setPhysicalDensity(Number(e.target.value))}
                  placeholder="e.g., 755"
                  className="text-lg h-12"
                />
              </div>
              <div className="space-y-2">
                <Label>Temperature (°C)</Label>
                <Input
                  type="number"
                  value={physicalTemp || ''}
                  onChange={(e) => setPhysicalTemp(Number(e.target.value))}
                  placeholder="e.g., 19"
                  className="text-lg h-12"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Results */}
        {physicalDensity > 0 && (
          <div className={cn(
            "p-6 rounded-xl border-2 text-center",
            isPass 
              ? "bg-green-500/10 border-green-500" 
              : "bg-destructive/10 border-destructive"
          )}>
            <div className="flex items-center justify-center gap-3 mb-3">
              {isPass ? (
                <CheckCircle2 className="w-10 h-10 text-green-500" />
              ) : (
                <AlertTriangle className="w-10 h-10 text-destructive animate-pulse" />
              )}
              <span className={cn(
                "text-3xl font-bold",
                isPass ? "text-green-500" : "text-destructive"
              )}>
                {isPass ? 'QUALITY OK' : 'DENSITY FAIL'}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Corrected Density</p>
                <p className="text-2xl font-bold">{correctedDensity.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Challan Density</p>
                <p className="text-2xl font-bold">{challanDensity}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Difference</p>
                <p className={cn(
                  "text-2xl font-bold",
                  isPass ? "text-green-500" : "text-destructive"
                )}>
                  {difference.toFixed(2)}
                </p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              Acceptable difference: ≤ 3.0 kg/m³
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
