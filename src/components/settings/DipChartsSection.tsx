import { useEffect, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { Droplet, Download, Upload, Eye, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import {
  listTanks,
  getDipChart,
  upsertDipChart,
  type TankRow,
  type DipChartRow,
} from '@/services/dipService';

const DEFAULT_MAX_POINT = 30;

export function DipChartsSection() {
  const { toast } = useToast();
  const { clientId } = useAuth();
  const [tanks, setTanks] = useState<TankRow[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [viewTankId, setViewTankId] = useState<string | null>(null);
  const [viewRows, setViewRows] = useState<DipChartRow[]>([]);
  const [busyTank, setBusyTank] = useState<string | null>(null);
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({});

  const load = async () => {
    setLoading(true);
    try {
      const t = await listTanks();
      setTanks(t);
      const entries = await Promise.all(
        t.map(async (tk) => [tk.id, (await getDipChart(tk.id)).length] as const)
      );
      const c: Record<string, number> = {};
      entries.forEach(([id, n]) => (c[id] = n));
      setCounts(c);
    } catch (e: any) {
      toast({ title: 'Failed to load tanks', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const downloadTemplate = (tank: TankRow) => {
    const data: any[][] = [['Point', 'Ltr']];
    for (let i = 1; i <= DEFAULT_MAX_POINT; i++) data.push([i, '']);
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'DipChart');
    const safe = tank.name.replace(/[^a-zA-Z0-9]/g, '_');
    XLSX.writeFile(wb, `DipChart_${safe}.xlsx`);
  };

  const handleUpload = async (tank: TankRow, file: File) => {
    if (!clientId) return;
    setBusyTank(tank.id);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<any>(ws, { defval: '' });
      const parsed: DipChartRow[] = [];
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        // Accept "Point"/"Ltr" or any case
        const pKey = Object.keys(r).find((k) => k.toLowerCase().trim() === 'point');
        const lKey = Object.keys(r).find((k) =>
          ['ltr', 'litres', 'liters', 'liter'].includes(k.toLowerCase().trim())
        );
        if (!pKey || !lKey) {
          throw new Error("Header row must include 'Point' and 'Ltr' columns.");
        }
        const pv = r[pKey];
        const lv = r[lKey];
        if (pv === '' || pv == null) continue; // skip blank rows
        const point = Number(pv);
        if (!Number.isFinite(point) || point < 0 || !Number.isInteger(point)) {
          throw new Error(`Row ${i + 2}: invalid Point value "${pv}".`);
        }
        if (lv === '' || lv == null) {
          throw new Error(`Row ${i + 2} is missing a liter value. Please fix and re-upload.`);
        }
        const liters = Number(lv);
        if (!Number.isFinite(liters) || liters < 0) {
          throw new Error(`Row ${i + 2}: invalid Ltr value "${lv}".`);
        }
        parsed.push({ point, liters });
      }
      if (parsed.length === 0) throw new Error('No data rows found in file.');
      await upsertDipChart(clientId, tank.id, parsed);
      toast({
        title: 'Chart uploaded',
        description: `${parsed.length} data points saved for ${tank.name}.`,
      });
      setCounts((c) => ({ ...c, [tank.id]: parsed.length }));
    } catch (e: any) {
      toast({ title: 'Upload failed', description: e.message, variant: 'destructive' });
    } finally {
      setBusyTank(null);
      const input = fileInputs.current[tank.id];
      if (input) input.value = '';
    }
  };

  const viewChart = async (tank: TankRow) => {
    setViewTankId(tank.id);
    setViewRows([]);
    try {
      const rows = await getDipChart(tank.id);
      setViewRows(rows);
    } catch (e: any) {
      toast({ title: 'Load failed', description: e.message, variant: 'destructive' });
    }
  };

  const viewTank = tanks.find((t) => t.id === viewTankId);

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Droplet className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle>Dip Charts</CardTitle>
              <CardDescription>
                Upload point-to-liters calibration chart for each tank
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : tanks.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No tanks configured. Add tanks in the Stock screen first.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {tanks.map((tank) => (
                <div key={tank.id} className="rounded-lg border p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-sm">{tank.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {tank.fuel_type} •{' '}
                        {counts[tank.id] > 0
                          ? `${counts[tank.id]} points saved`
                          : 'No chart uploaded'}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => downloadTemplate(tank)}
                    >
                      <Download className="w-3.5 h-3.5 mr-1" /> Template
                    </Button>
                    <input
                      ref={(el) => (fileInputs.current[tank.id] = el)}
                      type="file"
                      accept=".xlsx"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleUpload(tank, f);
                      }}
                    />
                    <Button
                      size="sm"
                      onClick={() => fileInputs.current[tank.id]?.click()}
                      disabled={busyTank === tank.id}
                    >
                      {busyTank === tank.id ? (
                        <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                      ) : (
                        <Upload className="w-3.5 h-3.5 mr-1" />
                      )}
                      Upload
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => viewChart(tank)}
                      disabled={!counts[tank.id]}
                    >
                      <Eye className="w-3.5 h-3.5 mr-1" /> View
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Sheet open={!!viewTankId} onOpenChange={(o) => !o && setViewTankId(null)}>
        <SheetContent side="bottom" className="h-[70vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              {viewTank ? `Dip Chart — ${viewTank.name}` : 'Dip Chart'}
            </SheetTitle>
          </SheetHeader>
          <div className="mt-4">
            {viewRows.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No data.</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    <th className="text-left p-2">Point</th>
                    <th className="text-right p-2">Ltr</th>
                  </tr>
                </thead>
                <tbody>
                  {viewRows.map((r) => (
                    <tr key={r.point} className="border-t">
                      <td className="p-2">{r.point}</td>
                      <td className="text-right p-2">{r.liters.toLocaleString('en-IN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
