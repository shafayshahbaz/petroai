import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useCloudData } from '@/contexts/CloudDataContext';
import { LiquidTank } from './LiquidTank';
import { subDays, format } from 'date-fns';

export function StockPanel() {
  const { tanks, dailyEntries } = useCloudData();

  // Aggregate tank totals per fuel
  const stockByFuel = useMemo(() => {
    const map: Record<string, { current: number; capacity: number }> = {
      MS: { current: 0, capacity: 0 },
      HSD: { current: 0, capacity: 0 },
      POWER: { current: 0, capacity: 0 },
    };
    tanks.forEach((t) => {
      const f = t.fuel_type as keyof typeof map;
      if (map[f]) {
        map[f].current += Number(t.current_stock || 0);
        map[f].capacity += Number(t.capacity || 0);
      }
    });
    return map;
  }, [tanks]);

  // 7-day avg daily consumption per fuel, from daily entries
  const avgDailyByFuel = useMemo(() => {
    const out: Record<string, number> = { MS: 0, HSD: 0, POWER: 0 };
    const counts: Record<string, number> = { MS: 0, HSD: 0, POWER: 0 };
    const today = new Date();
    for (let i = 1; i <= 7; i++) {
      const d = format(subDays(today, i), 'yyyy-MM-dd');
      const e = dailyEntries.find((x) => x.date === d);
      if (!e) continue;
      const totals: Record<string, number> = { MS: 0, HSD: 0, POWER: 0 };
      (e.nozzles || []).forEach((n: any) => {
        const liters = Math.max(0, (n.closingReading || 0) - (n.openingReading || 0));
        if (totals[n.fuelType] !== undefined) totals[n.fuelType] += liters;
      });
      (['MS', 'HSD', 'POWER'] as const).forEach((f) => {
        out[f] += totals[f];
        if (totals[f] > 0) counts[f]++;
      });
    }
    (['MS', 'HSD', 'POWER'] as const).forEach((f) => {
      out[f] = counts[f] > 0 ? out[f] / counts[f] : 0;
    });
    return out;
  }, [dailyEntries]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Stock Panel</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <LiquidTank
            label="Petrol (MS)"
            fuelType="MS"
            currentStock={stockByFuel.MS.current}
            capacity={stockByFuel.MS.capacity}
            avgDaily={avgDailyByFuel.MS}
          />
          <LiquidTank
            label="Diesel (HSD)"
            fuelType="HSD"
            currentStock={stockByFuel.HSD.current}
            capacity={stockByFuel.HSD.capacity}
            avgDaily={avgDailyByFuel.HSD}
          />
          <LiquidTank
            label="Power"
            fuelType="POWER"
            currentStock={stockByFuel.POWER.current}
            capacity={stockByFuel.POWER.capacity}
            avgDaily={avgDailyByFuel.POWER}
          />
        </div>
      </CardContent>
    </Card>
  );
}
