import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { Loader2, Save, Edit2, AlertTriangle, Droplet } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import {
  listTanks,
  getDipChart,
  getDipReadingsForDate,
  saveDipReadings,
  listRecentDipReadings,
  computeLitersFromDip,
  type TankRow,
  type DipChartRow,
  type DipReadingRow,
} from '@/services/dipService';
import { cn } from '@/lib/utils';

interface TankState {
  tank: TankRow;
  chart: DipChartRow[];
  dip: string; // input
  dipLiters: number | null;
  systemLiters: number;
  variance: number | null;
  existingId?: string;
}

export default function Dip() {
  const { toast } = useToast();
  const { clientId } = useAuth();
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [tankStates, setTankStates] = useState<TankState[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [history, setHistory] = useState<DipReadingRow[]>([]);
  const [tanksMap, setTanksMap] = useState<Record<string, TankRow>>({});
  const [historyLimit, setHistoryLimit] = useState(30);

  const loadAll = async () => {
    setLoading(true);
    try {
      const tanks = await listTanks();
      const map: Record<string, TankRow> = {};
      tanks.forEach((t) => (map[t.id] = t));
      setTanksMap(map);

      const charts = await Promise.all(tanks.map((t) => getDipChart(t.id)));
      const existing = await getDipReadingsForDate(date);
      const existingByTank = new Map(existing.map((e) => [e.tank_id, e]));

      const states: TankState[] = tanks.map((t, i) => {
        const ex = existingByTank.get(t.id);
        const dipStr = ex ? String(ex.dip_reading) : '';
        const dipLit = ex?.dip_liters ?? null;
        return {
          tank: t,
          chart: charts[i],
          dip: dipStr,
          dipLiters: dipLit,
          systemLiters: t.current_stock,
          variance: dipLit != null ? Math.round((dipLit - t.current_stock) * 100) / 100 : null,
          existingId: ex?.id,
        };
      });
      setTankStates(states);
      setEditing(existing.length === 0);

      const hist = await listRecentDipReadings(historyLimit);
      setHistory(hist);
    } catch (e: any) {
      toast({ title: 'Failed to load', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  const updateDip = (idx: number, value: string) => {
    setTankStates((prev) => {
      const next = [...prev];
      const s = { ...next[idx] };
      s.dip = value;
      const num = parseFloat(value);
      if (Number.isFinite(num) && num >= 0) {
        const lit = computeLitersFromDip(s.chart, num);
        s.dipLiters = lit;
        s.variance = lit != null ? Math.round((lit - s.systemLiters) * 100) / 100 : null;
      } else {
        s.dipLiters = null;
        s.variance = null;
      }
      next[idx] = s;
      return next;
    });
  };

  const handleSave = async () => {
    if (!clientId) return;
    const valid = tankStates.filter((s) => s.dip.trim() !== '' && Number.isFinite(parseFloat(s.dip)));
    if (valid.length === 0) {
      toast({ title: 'Enter at least one dip reading', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      await saveDipReadings(
        clientId,
        date,
        valid.map((s) => ({
          tank_id: s.tank.id,
          date,
          dip_reading: parseFloat(s.dip),
          dip_liters: s.dipLiters,
          system_liters: s.systemLiters,
          variance: s.variance,
        }))
      );
      toast({ title: 'Saved', description: `Dip readings saved for ${date}` });
      setEditing(false);
      await loadAll();
    } catch (e: any) {
      toast({ title: 'Save failed', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  // Group history by date for table display
  const historyByDate = useMemo(() => {
    const map = new Map<string, Record<string, DipReadingRow>>();
    history.forEach((r) => {
      if (!map.has(r.date)) map.set(r.date, {});
      map.get(r.date)![r.tank_id] = r;
    });
    return Array.from(map.entries())
      .sort(([a], [b]) => (a < b ? 1 : -1))
      .slice(0, historyLimit);
  }, [history, historyLimit]);

  const tankList = Object.values(tanksMap);

  return (
    <div className="space-y-6 animate-fade-in pb-24">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <Droplet className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dip Measurement</h1>
          <p className="text-sm text-muted-foreground">
            Record end-of-day physical tank dip readings
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-end gap-3 sm:justify-between">
            <div className="space-y-2">
              <Label>Date</Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full sm:w-56"
              />
            </div>
            {!editing && !loading && tankStates.some((s) => s.existingId) && (
              <Button variant="outline" onClick={() => setEditing(true)}>
                <Edit2 className="w-4 h-4 mr-2" /> Edit
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : tankStates.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No tanks configured. Add tanks in the Stock screen first.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {tankStates.map((s, idx) => {
                const noChart = s.chart.length === 0;
                const varianceColor =
                  s.variance == null
                    ? 'text-muted-foreground'
                    : Math.abs(s.variance) <= 50
                    ? 'text-green-600'
                    : 'text-red-600';
                return (
                  <div
                    key={s.tank.id}
                    className="rounded-lg border bg-card p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-base">{s.tank.name}</h3>
                      <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground">
                        {s.tank.fuel_type}
                      </span>
                    </div>
                    {noChart && (
                      <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 dark:bg-amber-950/30 p-2 rounded">
                        <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                        <span>Dip chart not uploaded. Upload in Settings to enable auto-calculation.</span>
                      </div>
                    )}
                    <div className="space-y-1.5">
                      <Label className="text-xs">Dip Reading (in points, e.g. 10.8)</Label>
                      <Input
                        type="number"
                        inputMode="decimal"
                        step="0.1"
                        placeholder="e.g. 10.8"
                        value={s.dip}
                        readOnly={!editing}
                        onChange={(e) => updateDip(idx, e.target.value)}
                        className="text-base h-11"
                      />
                    </div>
                    <div className="text-xs space-y-1 pt-1 border-t">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Stock as per Dip:</span>
                        <span className="font-medium">
                          {s.dipLiters != null ? `${s.dipLiters.toLocaleString('en-IN')} Ltrs` : '—'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Stock as per System:</span>
                        <span className="font-medium">
                          {s.systemLiters.toLocaleString('en-IN')} Ltrs
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Variance:</span>
                        <span className={cn('font-bold', varianceColor)}>
                          {s.variance != null
                            ? `${s.variance > 0 ? '+' : ''}${s.variance.toLocaleString('en-IN')} Ltrs`
                            : '—'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {editing && tankStates.length > 0 && (
            <Button className="w-full mt-4 h-11" onClick={handleSave} disabled={saving}>
              {saving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Save Dip Readings
            </Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Dip History</CardTitle>
        </CardHeader>
        <CardContent>
          {historyByDate.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No dip history yet.</p>
          ) : (
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <table className="w-full text-xs sm:text-sm min-w-[600px]">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-2">Date</th>
                    {tankList.map((t) => (
                      <th key={t.id} className="text-right p-2 whitespace-nowrap">
                        {t.name}<br />
                        <span className="text-[10px] text-muted-foreground font-normal">
                          Dip / Ltrs
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {historyByDate.map(([d, rows]) => (
                    <tr key={d} className="border-t">
                      <td className="p-2 font-medium">{d}</td>
                      {tankList.map((t) => {
                        const r = rows[t.id];
                        return (
                          <td key={t.id} className="text-right p-2 whitespace-nowrap">
                            {r ? (
                              <>
                                <div>{r.dip_reading}</div>
                                <div className="text-muted-foreground text-[10px]">
                                  {r.dip_liters != null
                                    ? `${Number(r.dip_liters).toLocaleString('en-IN')} L`
                                    : '—'}
                                </div>
                              </>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {history.length >= historyLimit && (
            <Button
              variant="outline"
              className="w-full mt-3"
              onClick={() => setHistoryLimit((l) => l + 30)}
            >
              Load More
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
