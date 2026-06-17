import { useEffect, useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { CalendarIcon, Plus, Trash2, Loader2, Check, Lock } from 'lucide-react';
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

const EXPENSE_TYPES = ['Pump Expense', 'Partner Withdrawal', 'Debtor Oil Given', 'Other'] as const;
const INCOME_TYPES = ['Lube Sale', 'POS Commission', 'Other'] as const;

const PRODUCT_LABEL: Record<string, string> = {
  MS: 'Petrol (MS)',
  HSD: 'Diesel (HSD)',
  POWER: 'Power',
};

const newId = () => Math.random().toString(36).slice(2, 10);

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
  const [productFilter, setProductFilter] = useState<string>('');
  const [nozzleId, setNozzleId] = useState<string>('');

  const selectedNozzle = useMemo(
    () => nozzles.find((n) => n.id === nozzleId),
    [nozzleId, nozzles]
  );
  const product = selectedNozzle?.fuel_type || productFilter || '';

  const filteredNozzles = useMemo(
    () => (productFilter ? nozzles.filter((n) => n.fuel_type === productFilter) : nozzles),
    [nozzles, productFilter]
  );

  // Last-reading lookup per nozzle (used to show product+reading in dropdown)
  const [lastReadings, setLastReadings] = useState<Record<string, number>>({});

  useEffect(() => {
    let alive = true;
    (async () => {
      const map: Record<string, number> = {};
      await Promise.all(
        filteredNozzles.map(async (n) => {
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
  }, [filteredNozzles]);

  const [opening, setOpening] = useState<string>('');
  const [openingLockInfo, setOpeningLockInfo] = useState<{
    date: string;
    nozzle_man_name: string;
  } | null>(null);
  const openingLocked = !!openingLockInfo;
  const [closing, setClosing] = useState<string>('');
  const [rate, setRate] = useState<string>('');

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

  // Load staff
  useEffect(() => {
    if (clientId) {
      listNozzleMen().then(setStaff).catch(() => {});
    }
  }, [clientId]);

  // Auto-fill rate when product or date changes
  useEffect(() => {
    if (!product) return;
    const ds = format(date, 'yyyy-MM-dd');
    getDailyRate(ds, product)
      .then((r) => {
        if (r != null) setRate(String(r));
      })
      .catch(() => {});
  }, [product, date]);

  // Rule 1: when a nozzle is selected, lock the opening reading to the
  // most recent closing reading recorded for that nozzle (all time).
  useEffect(() => {
    if (!nozzleId) {
      setOpening('');
      setOpeningLockInfo(null);
      return;
    }
    let alive = true;
    getLastClosingForNozzle(nozzleId)
      .then((last) => {
        if (!alive) return;
        if (last) {
          setOpening(String(last.closing_reading));
          setOpeningLockInfo({
            date: last.entry_date,
            nozzle_man_name: last.nozzle_man_name,
          });
        } else {
          // No history yet — first ever entry for this nozzle, user enters opening
          setOpening('');
          setOpeningLockInfo(null);
        }
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [nozzleId]);

  // Reset nozzle when product filter changes
  useEffect(() => {
    setNozzleId('');
  }, [productFilter]);

  const num = (s: string) => {
    const v = parseFloat(s);
    return Number.isFinite(v) ? v : 0;
  };

  const liters = Math.max(0, num(closing) - num(opening));
  const grossAmount = liters * num(rate);
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
    setExpenses((rows) => [
      ...rows,
      { id: newId(), type: 'Pump Expense', description: '', amount: 0 },
    ]);

  const updateExpense = (id: string, patch: Partial<PersonEntryExpense>) =>
    setExpenses((rows) => rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const removeExpense = (id: string) =>
    setExpenses((rows) => rows.filter((r) => r.id !== id));

  const addIncomeRow = () =>
    setIncomes((rows) => [
      ...rows,
      { id: newId(), type: 'Lube Sale', description: '', amount: 0 },
    ]);

  const updateIncome = (id: string, patch: Partial<PersonEntryIncome>) =>
    setIncomes((rows) => rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const removeIncome = (id: string) =>
    setIncomes((rows) => rows.filter((r) => r.id !== id));

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
    setProductFilter('');
    setNozzleId('');
    setOpening('');
    setOpeningLockInfo(null);
    setClosing('');
    setRate('');
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
    if (!selectedNozzle) {
      toast({ title: 'Select nozzle', variant: 'destructive' });
      return;
    }
    if (liters <= 0) {
      toast({ title: 'Closing must be greater than opening', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      const ds = format(date, 'yyyy-MM-dd');
      // Persist today's rate so subsequent entries auto-fill
      if (num(rate) > 0) {
        await upsertDailyRate(clientId, ds, product, num(rate));
      }
      const payload = {
        entry_date: ds,
        nozzle_man_id: nm.id,
        nozzle_man_name: nm.name,
        nozzle_id: selectedNozzle.id,
        nozzle_label: selectedNozzle.label,
        product,
        opening_reading: num(opening),
        closing_reading: num(closing),
        liters_sold: liters,
        rate: num(rate),
        gross_amount: grossAmount,
        expenses,
        total_expenses: totalExpenses,
        incomes,
        total_income: totalIncome,
        net_payable: netPayable,
        denominations: {
          d500: num(d500), d200: num(d200), d100: num(d100),
          d50: num(d50), d20: num(d20), d10: num(d10), coins: num(coins),
        },
        total_cash: totalCash,
        upi_received: num(upi),
        total_collected: totalCollected,
        difference,
      };
      await createPersonEntry(payload, clientId);

      setSummary({
        ...payload,
        date: format(date, 'dd MMM yyyy'),
      });
      toast({ title: 'Entry saved' });
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
        <p className="text-muted-foreground">Record a nozzle-man's shift settlement</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Shift Info</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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

            <div className="space-y-2">
              <Label>Product</Label>
              <Select value={productFilter} onValueChange={setProductFilter}>
                <SelectTrigger><SelectValue placeholder="Select product first" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="MS">Petrol (MS)</SelectItem>
                  <SelectItem value="HSD">Diesel (HSD)</SelectItem>
                  <SelectItem value="POWER">Power</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Nozzle</Label>
              <Select
                value={nozzleId}
                onValueChange={setNozzleId}
                disabled={!productFilter}
              >
                <SelectTrigger>
                  <SelectValue placeholder={productFilter ? 'Select nozzle' : 'Pick product first'} />
                </SelectTrigger>
                <SelectContent>
                  {filteredNozzles.map((n) => {
                    const last = lastReadings[n.id];
                    return (
                      <SelectItem key={n.id} value={n.id}>
                        {n.label} — {PRODUCT_LABEL[n.fuel_type] || n.fuel_type}
                        {last !== undefined && ` · last: ${last}`}
                      </SelectItem>
                    );
                  })}
                  {filteredNozzles.length === 0 && (
                    <div className="p-2 text-sm text-muted-foreground">
                      {productFilter ? 'No nozzles for this product' : 'Select a product first'}
                    </div>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Meter Readings & Rate</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                Opening Reading
                {openingLocked && <Lock className="w-3 h-3 text-muted-foreground" />}
              </Label>
              <Input
                type="number"
                inputMode="decimal"
                value={opening}
                onChange={(e) => !openingLocked && setOpening(e.target.value)}
                readOnly={openingLocked}
                className={cn('text-base', openingLocked && 'bg-muted cursor-not-allowed')}
              />
              {openingLocked && openingLockInfo && (
                <p className="text-xs text-muted-foreground">
                  Locked: fetched from last closing entry on{' '}
                  {format(parseISO(openingLockInfo.date), 'dd MMM yyyy')} by{' '}
                  {openingLockInfo.nozzle_man_name}.
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Closing Reading</Label>
              <Input type="number" inputMode="decimal" value={closing} onChange={(e) => setClosing(e.target.value)} className="text-base" />
            </div>
            <div className="space-y-2">
              <Label>Liters Sold</Label>
              <div className="h-10 rounded-md border bg-muted px-3 flex items-center font-semibold">
                {formatLiters(liters)} L
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Rate per Liter {product && `(${PRODUCT_LABEL[product]})`}</Label>
              <Input type="number" inputMode="decimal" value={rate} onChange={(e) => setRate(e.target.value)} className="text-base" />
            </div>
            <div className="space-y-2">
              <Label>Gross Sales Amount</Label>
              <div className="h-10 rounded-md border bg-primary/10 text-primary px-3 flex items-center font-bold text-lg">
                {formatRupees(grossAmount)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Expenses</CardTitle>
            <Button onClick={addExpenseRow} size="sm" variant="outline">
              <Plus className="w-4 h-4 mr-1" /> Add Expense
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
              <Plus className="w-4 h-4 mr-1" /> Add Income
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
              <div className="flex justify-between"><span className="text-muted-foreground">Nozzle</span><span className="font-medium">{summary.nozzle_label} ({PRODUCT_LABEL[summary.product] || summary.product})</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Liters Sold</span><span className="font-medium">{formatLiters(summary.liters_sold)} L</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Rate</span><span className="font-medium">{formatRupees(summary.rate)}</span></div>
              <div className="flex justify-between border-t pt-2"><span>Gross Sales</span><span className="font-semibold">{formatRupees(summary.gross_amount)}</span></div>
              <div className="flex justify-between"><span>Expenses</span><span className="font-semibold">{formatRupees(summary.total_expenses)}</span></div>
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
