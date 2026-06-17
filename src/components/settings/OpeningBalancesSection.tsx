import { useEffect, useState } from 'react';
import { Wallet, Save, Loader2, Gauge, IndianRupee } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useCloudData } from '@/contexts/CloudDataContext';
import { formatRupees } from '@/lib/format';
import {
  getOpeningCashInHand,
  setOpeningCashInHand,
  getDefaultRates,
  setDefaultRates,
  setNozzleOpeningReading,
} from '@/services/openingBalancesService';

const PRODUCTS = [
  { key: 'MS', label: 'Petrol (MS)' },
  { key: 'HSD', label: 'Diesel (HSD)' },
  { key: 'POWER', label: 'Power' },
];

export function OpeningBalancesSection() {
  const { toast } = useToast();
  const { clientId } = useAuth();
  const { nozzles, refreshData } = useCloudData() as any;

  const [cash, setCash] = useState('');
  const [rates, setRates] = useState<Record<string, string>>({});
  const [openings, setOpenings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [savingCash, setSavingCash] = useState(false);
  const [savingRates, setSavingRates] = useState(false);
  const [savingOpenings, setSavingOpenings] = useState(false);

  useEffect(() => {
    if (!clientId) return;
    (async () => {
      try {
        const [c, r] = await Promise.all([
          getOpeningCashInHand(clientId),
          getDefaultRates(clientId),
        ]);
        setCash(c ? String(c) : '');
        const rs: Record<string, string> = {};
        PRODUCTS.forEach((p) => (rs[p.key] = r[p.key] ? String(r[p.key]) : ''));
        setRates(rs);
      } catch (e: any) {
        toast({ title: 'Load failed', description: e.message, variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    })();
  }, [clientId]);

  useEffect(() => {
    const o: Record<string, string> = {};
    (nozzles || []).forEach((n: any) => {
      o[n.id] = n.opening_reading != null ? String(n.opening_reading) : '';
    });
    setOpenings(o);
  }, [nozzles]);

  const num = (s: string) => {
    const v = parseFloat(s);
    return Number.isFinite(v) ? v : 0;
  };

  const saveCash = async () => {
    if (!clientId) return;
    setSavingCash(true);
    try {
      await setOpeningCashInHand(clientId, num(cash));
      toast({ title: 'Opening Cash in Hand saved', description: formatRupees(num(cash)) });
    } catch (e: any) {
      toast({ title: 'Save failed', description: e.message, variant: 'destructive' });
    } finally {
      setSavingCash(false);
    }
  };

  const saveRates = async () => {
    if (!clientId) return;
    setSavingRates(true);
    try {
      const payload: Record<string, number> = {};
      Object.entries(rates).forEach(([k, v]) => {
        if (num(v) > 0) payload[k] = num(v);
      });
      await setDefaultRates(clientId, payload);
      toast({ title: 'Default rates saved' });
    } catch (e: any) {
      toast({ title: 'Save failed', description: e.message, variant: 'destructive' });
    } finally {
      setSavingRates(false);
    }
  };

  const saveOpenings = async () => {
    setSavingOpenings(true);
    try {
      await Promise.all(
        Object.entries(openings).map(([id, v]) => setNozzleOpeningReading(id, num(v)))
      );
      if (typeof refreshData === 'function') await refreshData();
      toast({ title: 'Nozzle opening readings saved' });
    } catch (e: any) {
      toast({ title: 'Save failed', description: e.message, variant: 'destructive' });
    } finally {
      setSavingOpenings(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 flex justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Opening Cash in Hand */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Wallet className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle>Opening Cash in Hand</CardTitle>
              <CardDescription>
                One-time setup. This amount is carried forward day by day on the Dashboard
                and the Bank screen.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Opening Cash (Rs.)</Label>
              <Input
                type="number"
                inputMode="decimal"
                value={cash}
                onChange={(e) => setCash(e.target.value)}
                placeholder="0"
                className="text-base"
              />
            </div>
          </div>
          <Button onClick={saveCash} disabled={savingCash}>
            {savingCash ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Save Opening Cash
          </Button>
        </CardContent>
      </Card>

      {/* Default Product Rates */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <IndianRupee className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle>Default Product Rates</CardTitle>
              <CardDescription>
                These rates auto-fill in Person Entry until a daily rate is recorded for
                that day. They also drive the Sales Report.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {PRODUCTS.map((p) => (
              <div key={p.key} className="space-y-2">
                <Label>{p.label} (Rs./Litre)</Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  value={rates[p.key] || ''}
                  onChange={(e) => setRates((r) => ({ ...r, [p.key]: e.target.value }))}
                  placeholder="0.00"
                  className="text-base"
                />
              </div>
            ))}
          </div>
          <Button onClick={saveRates} disabled={savingRates}>
            {savingRates ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Save Default Rates
          </Button>
        </CardContent>
      </Card>

      {/* Nozzle Opening Readings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Gauge className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle>Nozzle Opening Readings</CardTitle>
              <CardDescription>
                One-time setup per nozzle. Used as the Opening Reading in Person Entry
                until the first shift for that nozzle is saved. After that, the system
                locks the opening reading to the last closing reading automatically.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {(nozzles || []).length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No nozzles configured yet. Add nozzles from the Stock screen first.
            </p>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {nozzles.map((n: any) => (
                  <div key={n.id} className="space-y-2">
                    <Label className="text-sm">
                      {n.label}{' '}
                      <span className="text-xs text-muted-foreground">({n.fuel_type})</span>
                    </Label>
                    <Input
                      type="number"
                      inputMode="decimal"
                      value={openings[n.id] || ''}
                      onChange={(e) =>
                        setOpenings((o) => ({ ...o, [n.id]: e.target.value }))
                      }
                      placeholder="0"
                      className="text-base"
                    />
                  </div>
                ))}
              </div>
              <Button onClick={saveOpenings} disabled={savingOpenings}>
                {savingOpenings ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Save Opening Readings
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
