import { useEffect, useMemo, useState } from 'react';
import { format, parseISO, isSameMonth } from 'date-fns';
import {
  CalendarIcon, Loader2, Landmark, Plus, ChevronDown, ChevronRight, Trash2,
  Wallet, ArrowDownToLine, ArrowLeftRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { formatRupees } from '@/lib/format';
import {
  createBankDeposit,
  listBankDeposits,
  deleteBankDeposit,
  BankDepositRecord,
  BankTxnType,
} from '@/services/bankDepositService';
import {
  listReports,
  listAllPersonEntries,
} from '@/services/personEntryService';
import { getOpeningCashInHand } from '@/services/openingBalancesService';

export default function Bank() {
  const { toast } = useToast();
  const { clientId } = useAuth();

  // Form state (shared between tabs)
  const [txnType, setTxnType] = useState<BankTxnType>('deposit');
  const [date, setDate] = useState<Date>(new Date());
  const [amount, setAmount] = useState('');
  const [bankName, setBankName] = useState('');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const [deposits, setDeposits] = useState<BankDepositRecord[]>([]);
  const [openingCash, setOpeningCash] = useState(0);
  const [collected, setCollected] = useState(0);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  const refresh = async () => {
    if (!clientId) return;
    setLoading(true);
    try {
      const [d, rs, es, oc] = await Promise.all([
        listBankDeposits(),
        listReports(),
        listAllPersonEntries(),
        getOpeningCashInHand(clientId),
      ]);
      setDeposits(d);
      setOpeningCash(oc);
      const confirmed = rs.filter((r) => r.confirmed);
      const idSet = new Set<string>();
      confirmed.forEach((r) => (r.entry_ids || []).forEach((id) => idSet.add(id)));
      const total = es
        .filter((e) => idSet.has(e.id))
        .reduce((s, e) => s + Number(e.total_collected || 0), 0);
      setCollected(total);
    } catch (e: any) {
      toast({ title: 'Failed to load', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, [clientId]);

  const totalOutflow = useMemo(
    () => deposits.reduce((s, d) => s + Number(d.amount || 0), 0),
    [deposits]
  );
  const cashInHand = openingCash + collected - totalOutflow;

  const monthly = useMemo(() => {
    const now = new Date();
    const m = deposits.filter((d) => isSameMonth(parseISO(d.deposit_date), now));
    const dep = m.filter((d) => d.transaction_type === 'deposit')
      .reduce((s, d) => s + Number(d.amount || 0), 0);
    const tr = m.filter((d) => d.transaction_type === 'cash_transfer')
      .reduce((s, d) => s + Number(d.amount || 0), 0);
    return { dep, tr, count: m.length };
  }, [deposits]);

  const resetForm = () => {
    setAmount(''); setBankName(''); setReference(''); setNotes('');
  };

  const handleSave = async () => {
    if (!clientId) return;
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) {
      toast({ title: 'Enter a valid amount', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      await createBankDeposit(
        {
          deposit_date: format(date, 'yyyy-MM-dd'),
          amount: amt,
          bank_name: bankName.trim() || null,
          reference_number: reference.trim() || null,
          notes: notes.trim() || null,
          transaction_type: txnType,
        },
        clientId
      );
      toast({
        title: txnType === 'deposit' ? 'Bank deposit recorded' : 'Cash transfer recorded',
        description: 'Cash in Hand updated.',
      });
      resetForm();
      await refresh();
    } catch (e: any) {
      toast({ title: 'Save failed', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this entry?')) return;
    try {
      await deleteBankDeposit(id);
      toast({ title: 'Deleted' });
      await refresh();
    } catch (e: any) {
      toast({ title: 'Delete failed', description: e.message, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-24">
      <div className="flex items-center gap-2">
        <Landmark className="w-6 h-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold text-foreground">Bank</h1>
          <p className="text-muted-foreground text-sm">
            Bank deposits and cash transfers — both reduce Cash in Hand.
          </p>
        </div>
      </div>

      {/* Cash in Hand summary */}
      <Card className="border-l-4 border-l-success">
        <CardContent className="py-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-success/10">
              <Wallet className="w-5 h-5 text-success" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">Current Cash in Hand</p>
              <p className="text-2xl font-bold">{formatRupees(cashInHand)}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Opening {formatRupees(openingCash)} + Collected {formatRupees(collected)} − Bank {formatRupees(totalOutflow)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Plus className="w-4 h-4" /> Record Transaction
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={txnType} onValueChange={(v) => setTxnType(v as BankTxnType)}>
            <TabsList className="grid grid-cols-2 w-full mb-4">
              <TabsTrigger value="deposit" className="gap-1">
                <ArrowDownToLine className="w-4 h-4" /> Bank Deposit
              </TabsTrigger>
              <TabsTrigger value="cash_transfer" className="gap-1">
                <ArrowLeftRight className="w-4 h-4" /> Cash Transfer
              </TabsTrigger>
            </TabsList>

            <TabsContent value="deposit" className="m-0">
              <p className="text-xs text-muted-foreground mb-3">
                You deposited cash from the pump into the bank.
              </p>
            </TabsContent>
            <TabsContent value="cash_transfer" className="m-0">
              <p className="text-xs text-muted-foreground mb-3">
                Someone paid the amount directly into your bank account, and you handed them cash from the pump. Cash in Hand is reduced.
              </p>
            </TabsContent>

            <div className="space-y-4">
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
                        {format(date, 'dd MMM yyyy')}
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
                  <Label>Amount (Rs.)</Label>
                  <Input
                    type="number"
                    inputMode="decimal"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0"
                    className="text-base"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{txnType === 'deposit' ? 'Bank / Account' : 'Bank Received Into'}</Label>
                  <Input
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    placeholder="e.g. SBI - 1234"
                    className="text-base"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Reference / UTR</Label>
                  <Input
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    placeholder={txnType === 'deposit' ? 'Slip / UTR' : 'Payer / UTR'}
                    className="text-base"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Remarks</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder={txnType === 'cash_transfer' ? 'Who received the cash, purpose, etc.' : 'Optional remarks'}
                />
              </div>
              <Button onClick={handleSave} disabled={saving || !clientId} className="w-full min-h-[48px]">
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                Save {txnType === 'deposit' ? 'Deposit' : 'Cash Transfer'}
              </Button>
            </div>
          </Tabs>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap">
          <CardTitle className="text-base">Transaction History</CardTitle>
          <div className="text-xs text-muted-foreground text-right">
            This Month — Deposits: <span className="font-semibold text-foreground">{formatRupees(monthly.dep)}</span>
            {' · '}Cash Transfers: <span className="font-semibold text-foreground">{formatRupees(monthly.tr)}</span>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : deposits.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              No transactions yet. Record your first one above.
            </p>
          ) : (
            deposits.map((d) => {
              const open = expanded === d.id;
              const isTransfer = d.transaction_type === 'cash_transfer';
              return (
                <div key={d.id} className="rounded-lg border bg-card">
                  <button
                    className="w-full p-3 flex items-center gap-3 text-left"
                    onClick={() => setExpanded(open ? null : d.id)}
                  >
                    {open ? <ChevronDown className="w-4 h-4 shrink-0" /> : <ChevronRight className="w-4 h-4 shrink-0" />}
                    <div className={cn(
                      'p-1.5 rounded-md shrink-0',
                      isTransfer ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                    )}>
                      {isTransfer ? <ArrowLeftRight className="w-4 h-4" /> : <ArrowDownToLine className="w-4 h-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        <span className="font-semibold">{formatRupees(d.amount)}</span>
                        <span className="text-xs text-muted-foreground">
                          {format(parseISO(d.deposit_date), 'dd MMM yyyy')}
                        </span>
                        <span className={cn(
                          'text-[10px] px-1.5 py-0.5 rounded font-medium',
                          isTransfer ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                        )}>
                          {isTransfer ? 'CASH TRANSFER' : 'BANK DEPOSIT'}
                        </span>
                        {d.bank_name && (
                          <span className="text-xs px-2 py-0.5 rounded bg-muted">{d.bank_name}</span>
                        )}
                      </div>
                      {d.reference_number && (
                        <div className="text-xs text-muted-foreground mt-0.5">Ref: {d.reference_number}</div>
                      )}
                    </div>
                  </button>
                  {open && (
                    <div className="border-t px-3 py-2 text-xs text-muted-foreground space-y-1">
                      {d.notes && <div><span className="font-medium text-foreground">Remarks: </span>{d.notes}</div>}
                      <div>Recorded: {format(parseISO(d.created_at), 'dd MMM yyyy HH:mm')}</div>
                      <div className="pt-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(d.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-3 h-3 mr-1" /> Delete
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
