import { useEffect, useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { CalendarIcon, Plus, Trash2, Loader2, Check, Lock, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useCloudData } from '@/contexts/CloudDataContext';
import { cn } from '@/lib/utils';
import { formatRupees, formatLiters } from '@/lib/format';
import {
  listNozzleMen,
  addNozzleMan,
  NozzleMan,
} from '@/services/staffService';
import {
  createPersonEntry,
  getDailyRate,
  upsertDailyRate,
  getLastClosingForNozzle,
  PersonEntryExpense,
  PersonEntryIncome,
} from '@/services/personEntryService';
import { getDefaultRates } from '@/services/openingBalancesService';

const EXPENSE_TYPES = ['Pump Expense', 'Partner Withdrawal', 'Debtor Oil Given', 'Other'] as const;
const INCOME_TYPES = ['Lube Sale', 'POS Commission', 'Other'] as const;

const PRODUCT_LABEL: Record<string, string> = {
  MS: 'Petrol (MS)',
  HSD: 'Diesel (HSD)',
  POWER: 'Power',
};

const newId = () => Math.random().toString(36).slice(2, 10);

interface NozzleRow {
  rowId: string;
  nozzleId: string;
  opening: string;
  closing: string;
  rate: string;
  openingLockInfo: { date: string; nozzle_man_name: string } | null;
}

export default function PersonEntry() {
  const { toast } = useToast();
  const { clientId } = useAuth();
  const { nozzles } = useCloudData();

  const [date, setDate] = useState<Date>(new Date());
  const [staff, setStaff] = useState<NozzleMan[]>([]);
  const [staffOpen, setStaffOpen] = useState(false);
  const [newStaffName, setNewStaffName] = useState('');
  const [staffSaving, setStaffSaving] = useState(false);

  const [nozzleManId, setNozzleManId] = useState<string>('');
  const [rows, setRows] = useState<NozzleRow[]>([]);
  const [addProduct, setAddProduct] = useState<string>('');
  const [addNozzleId, setAddNozzleId] = useState<string>('');

  const [lastReadings, setLastReadings] = useState<Record<string, number>>({});

  const usedNozzleIds = useMemo(() => new Set(rows.map((r) => r.nozzleId)), [rows]);
  const availableNozzles = useMemo(
    () =>
      nozzles.filter(
        (n) => !usedNozzleIds.has(n.id) && (!addProduct || n.fuel_type === addProduct)
      ),
    [nozzles, usedNozzleIds, addProduct]
  );


  useEffect(() => {
    let alive = true;
    (async () => {
      const map: Record<string, number> = {};
      await Promise.all(
        nozzles.map(async (n) => {
          try {
            const last = await getLastClosingForNozzle(n.id);
            if (last) map[n.id] = last.closing_reading;
          } catch {}
        })
      );
      if (alive) setLastReadings(map);
    })();
    return () => {
      alive = false;
    };
  }, [nozzles]);

  const [expenses, setExpenses] = useState<PersonEntryExpense[]>([]);
  const [incomes, setIncomes] = useState<PersonEntryIncome[]>([]);

  const [d500, setD500] = useState<string>('');
  const [d200, setD200] = useState<string>('');
  const [d100, setD100] = useState<string>('');
  const [d50, setD50] = useState<string>('');
  const [d20, setD20] = useState<string>('');
  const [d10, setD10] = useState<string>('');
  const [coins, setCoins] = useState<string>('');
  const [upi, setUpi] = useState<string>('');

  const [submitting, setSubmitting] = useState(false);
  const [summary, setSummary] = useState<any | null>(null);

  useEffect(() => {
    if (clientId) listNozzleMen().then(setStaff).catch(() => {});
  }, [clientId]);

  const num = (s: string) => {
    const v = parseFloat(s);
    return Number.isFinite(v) ? v : 0;
  };

  const addRow = async (nozzleId: string) => {
    if (!nozzleId) return;
    const nz = nozzles.find((n) => n.id === nozzleId);
    if (!nz) return;
    const rowId = newId();
    // Push placeholder, then async fill opening + rate
    setRows((rs) => [
      ...rs,
      { rowId, nozzleId, opening: '', closing: '', rate: '', openingLockInfo: null },
    ]);
    setAddNozzleId('');
    setAddProduct('');

    // Fetch opening + rate in parallel
    try {
      const ds = format(date, 'yyyy-MM-dd');
      const [last, daily] = await Promise.all([
        getLastClosingForNozzle(nozzleId).catch(() => null),
        getDailyRate(ds, nz.fuel_type).catch(() => null),
      ]);
      let opening = '0';
      let openingLockInfo: NozzleRow['openingLockInfo'] = null;
      if (last) {
        // Auto-fetched & locked from last closing
        opening = String(last.closing_reading);
        openingLockInfo = { date: last.entry_date, nozzle_man_name: last.nozzle_man_name };
      } else {
        // No past reading → fall back to Settings opening, else default 0 (editable)
        const seed = Number((nz as any)?.opening_reading || 0);
        opening = seed > 0 ? String(seed) : '0';
      }

      let rate = daily != null ? String(daily) : '';
      if (!rate && clientId) {
        try {
          const defaults = await getDefaultRates(clientId);
          if (defaults[nz.fuel_type] != null) rate = String(defaults[nz.fuel_type]);
        } catch {}
      }
      setRows((rs) =>
        rs.map((r) => (r.rowId === rowId ? { ...r, opening, openingLockInfo, rate } : r))
      );
    } catch {}
  };

  const updateRow = (rowId: string, patch: Partial<NozzleRow>) =>
    setRows((rs) => rs.map((r) => (r.rowId === rowId ? { ...r, ...patch } : r)));

  const removeRow = (rowId: string) =>
    setRows((rs) => rs.filter((r) => r.rowId !== rowId));

  // Per-row computed
  const rowCalc = (r: NozzleRow) => {
    const liters = Math.max(0, num(r.closing) - num(r.opening));
    const gross = liters * num(r.rate);
    return { liters, gross };
  };

  const totalLiters = rows.reduce((s, r) => s + rowCalc(r).liters, 0);
  const grossAmount = rows.reduce((s, r) => s + rowCalc(r).gross, 0);
  const totalExpenses = expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const totalIncome = incomes.reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const netPayable = grossAmount + totalIncome - totalExpenses;
  const totalCash =
    num(d500) * 500 +
    num(d200) * 200 +
    num(d100) * 100 +
    num(d50) * 50 +
    num(d20) * 20 +
    num(d10) * 10 +
    num(coins);
  const totalCollected = totalCash + num(upi);
  const difference = totalCollected - netPayable;

  const addExpenseRow = () =>
    setExpenses((rs) => [...rs, { id: newId(), type: 'Pump Expense', description: '', amount: 0 }]);
  const updateExpense = (id: string, patch: Partial<PersonEntryExpense>) =>
    setExpenses((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const removeExpense = (id: string) =>
    setExpenses((rs) => rs.filter((r) => r.id !== id));

  const addIncomeRow = () =>
    setIncomes((rs) => [...rs, { id: newId(), type: 'Lube Sale', description: '', amount: 0 }]);
  const updateIncome = (id: string, patch: Partial<PersonEntryIncome>) =>
    setIncomes((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const removeIncome = (id: string) =>
    setIncomes((rs) => rs.filter((r) => r.id !== id));

  const handleAddStaff = async () => {
    if (!clientId || !newStaffName.trim()) return;
    setStaffSaving(true);
    try {
      const created = await addNozzleMan(newStaffName, clientId);
      const refreshed = await listNozzleMen();
      setStaff(refreshed);
      setNozzleManId(created.id);
      setNewStaffName('');
      setStaffOpen(false);
    } catch (e: any) {
      toast({ title: 'Failed', description: e.message, variant: 'destructive' });
    } finally {
      setStaffSaving(false);
    }
  };

  const reset = () => {
    setNozzleManId('');
    setRows([]);
    setAddNozzleId('');
    setAddProduct('');

    setExpenses([]);
    setIncomes([]);
    setD500(''); setD200(''); setD100(''); setD50(''); setD20(''); setD10(''); setCoins('');
    setUpi('');
  };

  const handleSubmit = async () => {
    if (!clientId) return;
    const nm = staff.find((s) => s.id === nozzleManId);
    if (!nm) {
      toast({ title: 'Select nozzle man', variant: 'destructive' });
      return;
    }
    if (rows.length === 0) {
      toast({ title: 'Add at least one nozzle', variant: 'destructive' });
      return;
    }
    for (const r of rows) {
      const { liters } = rowCalc(r);
      if (liters <= 0) {
        const nz = nozzles.find((n) => n.id === r.nozzleId);
        toast({
          title: `Closing must be greater than opening`,
          description: `Nozzle: ${nz?.label || ''}`,
          variant: 'destructive',
        });
        return;
      }
    }

    setSubmitting(true);
    try {
      const ds = format(date, 'yyyy-MM-dd');

      // Persist today's rate per distinct product
      const ratePerProduct = new Map<string, number>();
      for (const r of rows) {
        const nz = nozzles.find((n) => n.id === r.nozzleId);
        if (nz && num(r.rate) > 0 && !ratePerProduct.has(nz.fuel_type)) {
          ratePerProduct.set(nz.fuel_type, num(r.rate));
        }
      }
      await Promise.all(
        Array.from(ratePerProduct.entries()).map(([p, rt]) =>
          upsertDailyRate(clientId, ds, p, rt).catch(() => {})
        )
      );

      // Build one DB row per nozzle. Settlement fields (expenses/income/
      // denominations/upi/difference) are stored on the first row only so
      // aggregations don't double-count them.
      let lastPayload: any = null;
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        const nz = nozzles.find((n) => n.id === r.nozzleId)!;
        const { liters, gross } = rowCalc(r);
        const isPrimary = i === 0;
        const payload = {
          entry_date: ds,
          nozzle_man_id: nm.id,
          nozzle_man_name: nm.name,
          nozzle_id: nz.id,
          nozzle_label: nz.label,
          product: nz.fuel_type,
          opening_reading: num(r.opening),
          closing_reading: num(r.closing),
          liters_sold: liters,
          rate: num(r.rate),
          gross_amount: gross,
          expenses: isPrimary ? expenses : [],
          total_expenses: isPrimary ? totalExpenses : 0,
          incomes: isPrimary ? incomes : [],
          total_income: isPrimary ? totalIncome : 0,
          // For primary row, net_payable reflects full shift settlement;
          // for additional rows it's just this nozzle's gross.
          net_payable: isPrimary ? netPayable : gross,
          denominations: isPrimary
            ? {
                d500: num(d500), d200: num(d200), d100: num(d100),
                d50: num(d50), d20: num(d20), d10: num(d10), coins: num(coins),
              }
            : { d500: 0, d200: 0, d100: 0, d50: 0, d20: 0, d10: 0, coins: 0 },
          total_cash: isPrimary ? totalCash : 0,
          upi_received: isPrimary ? num(upi) : 0,
          total_collected: isPrimary ? totalCollected : 0,
          difference: isPrimary ? difference : 0,
        };
        await createPersonEntry(payload, clientId);
        lastPayload = payload;
      }

      setSummary({
        date: format(date, 'dd MMM yyyy'),
        nozzle_man_name: nm.name,
        nozzles: rows.map((r) => {
          const nz = nozzles.find((n) => n.id === r.nozzleId);
          const { liters, gross } = rowCalc(r);
          return {
            label: nz?.label || '',
            product: nz?.fuel_type || '',
            liters,
            rate: num(r.rate),
            gross,
          };
        }),
        gross_amount: grossAmount,
        total_expenses: totalExpenses,
        total_income: totalIncome,
        net_payable: netPayable,
        total_cash: totalCash,
        upi_received: num(upi),
        total_collected: totalCollected,
        difference,
      });
      toast({ title: `Saved ${rows.length} nozzle entr${rows.length === 1 ? 'y' : 'ies'}` });
      reset();
    } catch (e: any) {
      toast({ title: 'Save failed', description: e.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const diffColor =
    Math.abs(difference) < 0.01
      ? 'text-green-600 bg-green-50 border-green-200'
      : difference > 0
      ? 'text-blue-600 bg-blue-50 border-blue-200'
      : 'text-red-600 bg-red-50 border-red-200';

  const denomRow = (
    label: string,
    val: string,
    set: (v: string) => void,
    note: number
  ) => (
    <div className="grid grid-cols-3 gap-2 items-center">
      <Label className="text-sm">{label}</Label>
      <Input
        type="number"
        inputMode="numeric"
        value={val}
        onChange={(e) => set(e.target.value)}
        placeholder="0"
        className="text-base"
      />
      <span className="text-sm text-muted-foreground text-right">
        {formatRupees(num(val) * note)}
      </span>
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in pb-24">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Person Entry</h1>
        <p className="text-muted-foreground">Record a nozzle-man's shift settlement (multiple nozzles supported)</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Shift Info</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn('w-full justify-start font-normal', !date && 'text-muted-foreground')}
                  >
                    <CalendarIcon className="w-4 h-4 mr-2" />
                    {date ? format(date, 'dd MMM yyyy') : 'Pick date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={(d) => d && setDate(d)}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Nozzle Man</Label>
              <div className="flex gap-2">
                <Select value={nozzleManId} onValueChange={setNozzleManId}>
                  <SelectTrigger><SelectValue placeholder="Select nozzle man" /></SelectTrigger>
                  <SelectContent>
                    {staff.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                    {staff.length === 0 && (
                      <div className="p-2 text-sm text-muted-foreground">No staff yet</div>
                    )}
                  </SelectContent>
                </Select>
                <Button variant="outline" size="icon" onClick={() => setStaffOpen(true)} aria-label="Add nozzle man">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-base">Nozzles in this Shift</CardTitle>
            <Badge variant="secondary">{rows.length} selected</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add nozzle picker: product first, then nozzle */}
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2">
            <Select
              value={addProduct}
              onValueChange={(v) => {
                setAddProduct(v);
                setAddNozzleId('');
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="1. Select product" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MS">Petrol (MS)</SelectItem>
                <SelectItem value="HSD">Diesel (HSD)</SelectItem>
                <SelectItem value="POWER">Power</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={addNozzleId}
              onValueChange={setAddNozzleId}
              disabled={!addProduct}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    !addProduct
                      ? '2. Pick product first'
                      : availableNozzles.length > 0
                      ? '2. Select nozzle'
                      : 'No nozzles for this product'
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {availableNozzles.map((n) => {
                  const last = lastReadings[n.id];
                  return (
                    <SelectItem key={n.id} value={n.id}>
                      {n.label}
                      {last !== undefined && ` · last: ${last}`}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>

            <Button onClick={() => addRow(addNozzleId)} disabled={!addNozzleId}>
              <Plus className="w-4 h-4 mr-1" /> Add
            </Button>
          </div>


          {rows.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No nozzles added. Add one or more nozzles operated by this person.
            </p>
          )}

          {rows.map((r) => {
            const nz = nozzles.find((n) => n.id === r.nozzleId);
            const { liters, gross } = rowCalc(r);
            const locked = !!r.openingLockInfo;
            return (
              <div key={r.rowId} className="rounded-lg border p-3 space-y-3 bg-muted/30">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-semibold text-sm">{nz?.label}</div>
                    <div className="text-xs text-muted-foreground">
                      {PRODUCT_LABEL[nz?.fuel_type || ''] || nz?.fuel_type}
                    </div>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => removeRow(r.rowId)}
                    aria-label="Remove nozzle"
                    className="h-8 w-8"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs flex items-center gap-1">
                      Opening
                      {locked && <Lock className="w-3 h-3 text-muted-foreground" />}
                    </Label>
                    <Input
                      type="number"
                      inputMode="decimal"
                      value={r.opening}
                      onChange={(e) => !locked && updateRow(r.rowId, { opening: e.target.value })}
                      readOnly={locked}
                      className={cn('text-base', locked && 'bg-muted cursor-not-allowed')}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Closing</Label>
                    <Input
                      type="number"
                      inputMode="decimal"
                      value={r.closing}
                      onChange={(e) => updateRow(r.rowId, { closing: e.target.value })}
                      className="text-base"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Rate / L</Label>
                    <Input
                      type="number"
                      inputMode="decimal"
                      value={r.rate}
                      onChange={(e) => updateRow(r.rowId, { rate: e.target.value })}
                      className="text-base"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Liters</Label>
                    <div className="h-10 rounded-md border bg-background px-3 flex items-center font-medium text-sm">
                      {formatLiters(liters)}
                    </div>
                  </div>
                </div>

                <div className="flex justify-between border-t pt-2 text-sm">
                  <span className="text-muted-foreground">Sale Amount</span>
                  <span className="font-semibold text-primary">{formatRupees(gross)}</span>
                </div>

                {locked && r.openingLockInfo && (
                  <p className="text-[11px] text-muted-foreground">
                    Opening locked from {format(parseISO(r.openingLockInfo.date), 'dd MMM')} ·{' '}
                    {r.openingLockInfo.nozzle_man_name}
                  </p>
                )}
              </div>
            );
          })}

          {rows.length > 0 && (
            <div className="grid grid-cols-2 gap-2 border-t pt-3 text-sm">
              <div className="flex justify-between bg-muted/50 rounded px-2 py-1">
                <span className="text-muted-foreground">Total Liters</span>
                <span className="font-semibold">{formatLiters(totalLiters)}</span>
              </div>
              <div className="flex justify-between bg-primary/10 rounded px-2 py-1">
                <span className="text-muted-foreground">Total Sales</span>
                <span className="font-bold text-primary">{formatRupees(grossAmount)}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Expenses</CardTitle>
            <Button onClick={addExpenseRow} size="sm" variant="outline">
              <Plus className="w-4 h-4 mr-1" /> Add
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {expenses.length === 0 && (
            <p className="text-sm text-muted-foreground">No expenses added</p>
          )}
          {expenses.map((row) => (
            <div key={row.id} className="grid grid-cols-12 gap-2 items-end">
              <div className="col-span-12 md:col-span-3 space-y-1">
                <Label className="text-xs">Type</Label>
                <Select
                  value={row.type}
                  onValueChange={(v) => updateExpense(row.id, { type: v as any })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {EXPENSE_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-7 md:col-span-5 space-y-1">
                <Label className="text-xs">Description</Label>
                <Input
                  value={row.description}
                  onChange={(e) => updateExpense(row.id, { description: e.target.value })}
                  placeholder="e.g. Sweeper salary, Debtor name"
                  className="text-base"
                />
              </div>
              <div className="col-span-4 md:col-span-3 space-y-1">
                <Label className="text-xs">Amount</Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  value={row.amount || ''}
                  onChange={(e) =>
                    updateExpense(row.id, { amount: parseFloat(e.target.value) || 0 })
                  }
                  className="text-base"
                />
              </div>
              <div className="col-span-1">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => removeExpense(row.id)}
                  aria-label="Remove"
                >
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
          <div className="flex justify-between border-t pt-3 text-sm">
            <span className="text-muted-foreground">Total Deductions</span>
            <span className="font-semibold">{formatRupees(totalExpenses)}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Additional Income</CardTitle>
            <Button onClick={addIncomeRow} size="sm" variant="outline">
              <Plus className="w-4 h-4 mr-1" /> Add
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {incomes.length === 0 && (
            <p className="text-sm text-muted-foreground">No additional income added</p>
          )}
          {incomes.map((row) => (
            <div key={row.id} className="grid grid-cols-12 gap-2 items-end">
              <div className="col-span-12 md:col-span-3 space-y-1">
                <Label className="text-xs">Type</Label>
                <Select
                  value={row.type}
                  onValueChange={(v) => updateIncome(row.id, { type: v as any })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {INCOME_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-7 md:col-span-5 space-y-1">
                <Label className="text-xs">Description</Label>
                <Input
                  value={row.description}
                  onChange={(e) => updateIncome(row.id, { description: e.target.value })}
                  placeholder={
                    row.type === 'Lube Sale'
                      ? 'e.g. Engine oil 1L'
                      : row.type === 'POS Commission'
                      ? 'e.g. Card swipe commission'
                      : 'e.g. Misc income'
                  }
                  className="text-base"
                />
              </div>
              <div className="col-span-4 md:col-span-3 space-y-1">
                <Label className="text-xs">Amount</Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  value={row.amount || ''}
                  onChange={(e) =>
                    updateIncome(row.id, { amount: parseFloat(e.target.value) || 0 })
                  }
                  className="text-base"
                />
              </div>
              <div className="col-span-1">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => removeIncome(row.id)}
                  aria-label="Remove"
                >
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
          <div className="flex justify-between border-t pt-3 text-sm">
            <span className="text-muted-foreground">Total Additional Income</span>
            <span className="font-semibold text-green-600">{formatRupees(totalIncome)}</span>
          </div>
        </CardContent>
      </Card>

      <Card className="border-2 border-primary/40">
        <CardContent className="py-4 flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <span className="text-base font-medium">Net Payable</span>
            <span className="text-2xl md:text-3xl font-extrabold text-primary">
              {formatRupees(netPayable)}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Gross {formatRupees(grossAmount)} + Income {formatRupees(totalIncome)} − Deductions {formatRupees(totalExpenses)} = {formatRupees(netPayable)}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Cash Received Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {denomRow('500 note × qty', d500, setD500, 500)}
          {denomRow('200 note × qty', d200, setD200, 200)}
          {denomRow('100 note × qty', d100, setD100, 100)}
          {denomRow('50 note × qty', d50, setD50, 50)}
          {denomRow('20 note × qty', d20, setD20, 20)}
          {denomRow('10 note × qty', d10, setD10, 10)}
          <div className="grid grid-cols-3 gap-2 items-center">
            <Label className="text-sm">Coins (amount)</Label>
            <Input
              type="number"
              inputMode="decimal"
              value={coins}
              onChange={(e) => setCoins(e.target.value)}
              placeholder="0"
              className="text-base"
            />
            <span className="text-sm text-muted-foreground text-right">
              {formatRupees(num(coins))}
            </span>
          </div>
          <div className="flex justify-between border-t pt-3">
            <span className="font-medium">Total Cash</span>
            <span className="font-semibold">{formatRupees(totalCash)}</span>
          </div>
          <div className="space-y-2">
            <Label>UPI Received (PhonePe / etc.)</Label>
            <Input
              type="number"
              inputMode="decimal"
              value={upi}
              onChange={(e) => setUpi(e.target.value)}
              className="text-base"
            />
          </div>
          <div className="flex justify-between border-t pt-3">
            <span className="font-medium">Total Collected</span>
            <span className="font-bold text-lg">{formatRupees(totalCollected)}</span>
          </div>
          <div className={cn('rounded-md border px-3 py-3 flex items-center justify-between', diffColor)}>
            <span className="font-medium">
              Difference{' '}
              {Math.abs(difference) < 0.01
                ? '(Balanced)'
                : difference > 0
                ? '(Excess)'
                : '(Short)'}
            </span>
            <span className="font-bold text-lg">{formatRupees(difference)}</span>
          </div>
        </CardContent>
      </Card>

      <Button
        className="w-full min-h-[48px] text-base"
        onClick={handleSubmit}
        disabled={submitting || !clientId}
      >
        {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
        Submit Entry
      </Button>

      {/* Add staff modal */}
      <Dialog open={staffOpen} onOpenChange={setStaffOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Nozzle Man</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Name</Label>
            <Input
              value={newStaffName}
              onChange={(e) => setNewStaffName(e.target.value)}
              autoFocus
              placeholder="e.g. Ramesh Kumar"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStaffOpen(false)}>Cancel</Button>
            <Button onClick={handleAddStaff} disabled={!newStaffName.trim() || staffSaving}>
              {staffSaving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Summary modal */}
      <Dialog open={!!summary} onOpenChange={(o) => !o && setSummary(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Entry Summary</DialogTitle>
          </DialogHeader>
          {summary && (
            <div id="entry-summary" className="space-y-2 text-sm bg-card p-4 rounded-md border">
              <div className="flex justify-between"><span className="text-muted-foreground">Date</span><span className="font-medium">{summary.date}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Nozzle Man</span><span className="font-medium">{summary.nozzle_man_name}</span></div>
              <div className="border-t pt-2 space-y-1">
                {summary.nozzles.map((n: any, i: number) => (
                  <div key={i} className="flex justify-between text-xs">
                    <span className="text-muted-foreground">
                      {n.label} ({PRODUCT_LABEL[n.product] || n.product}) · {formatLiters(n.liters)}L @ {formatRupees(n.rate)}
                    </span>
                    <span className="font-medium">{formatRupees(n.gross)}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between border-t pt-2"><span>Gross Sales</span><span className="font-semibold">{formatRupees(summary.gross_amount)}</span></div>
              <div className="flex justify-between"><span>Expenses</span><span className="font-semibold">{formatRupees(summary.total_expenses)}</span></div>
              <div className="flex justify-between"><span>Income</span><span className="font-semibold">{formatRupees(summary.total_income)}</span></div>
              <div className="flex justify-between"><span>Net Payable</span><span className="font-bold text-primary">{formatRupees(summary.net_payable)}</span></div>
              <div className="flex justify-between"><span>Total Cash</span><span className="font-semibold">{formatRupees(summary.total_cash)}</span></div>
              <div className="flex justify-between"><span>UPI</span><span className="font-semibold">{formatRupees(summary.upi_received)}</span></div>
              <div className="flex justify-between"><span>Total Collected</span><span className="font-semibold">{formatRupees(summary.total_collected)}</span></div>
              <div className="flex justify-between"><span>Difference</span><span className="font-bold">{formatRupees(summary.difference)}</span></div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setSummary(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
