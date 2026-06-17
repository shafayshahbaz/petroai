import { useEffect, useMemo, useState } from 'react';
import { format, parseISO, isSameMonth } from 'date-fns';
import { CalendarIcon, Loader2, Landmark, Plus, ChevronDown, ChevronRight, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { formatRupees } from '@/lib/format';
import {
  createBankDeposit,
  listBankDeposits,
  deleteBankDeposit,
  BankDepositRecord,
} from '@/services/bankDepositService';

export default function Bank() {
  const { toast } = useToast();
  const { clientId } = useAuth();

  const [date, setDate] = useState<Date>(new Date());
  const [amount, setAmount] = useState('');
  const [bankName, setBankName] = useState('');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const [deposits, setDeposits] = useState<BankDepositRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    try {
      setDeposits(await listBankDeposits());
    } catch (e: any) {
      toast({ title: 'Failed to load deposits', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, []);

  const monthly = useMemo(() => {
    const now = new Date();
    const m = deposits.filter((d) => isSameMonth(parseISO(d.deposit_date), now));
    const total = m.reduce((s, d) => s + Number(d.amount || 0), 0);
    return { total, count: m.length };
  }, [deposits]);

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
        },
        clientId
      );
      toast({ title: 'Bank deposit recorded' });
      setAmount(''); setBankName(''); setReference(''); setNotes('');
      await refresh();
    } catch (e: any) {
      toast({ title: 'Save failed', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this deposit entry?')) return;
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
            Record cash deposits made to the bank. Reduces Cash in Hand.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Plus className="w-4 h-4" /> Record Bank Deposit
          </CardTitle>
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
              <Label>Amount Deposited (Rs.)</Label>
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
              <Label>Bank Name / Account</Label>
              <Input
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                placeholder="e.g. SBI - 1234"
                className="text-base"
              />
            </div>
            <div className="space-y-2">
              <Label>Reference No. / UTR</Label>
              <Input
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="Slip / UTR"
                className="text-base"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Optional remarks"
            />
          </div>
          <Button onClick={handleSave} disabled={saving || !clientId} className="w-full min-h-[48px]">
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
            Save Deposit
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Deposit History</CardTitle>
          <div className="text-xs text-muted-foreground text-right">
            This Month: <span className="font-semibold text-foreground">{formatRupees(monthly.total)}</span>{' '}
            across {monthly.count} transaction{monthly.count === 1 ? '' : 's'}
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : deposits.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              No bank deposits yet. Record your first one above.
            </p>
          ) : (
            deposits.map((d) => {
              const open = expanded === d.id;
              return (
                <div key={d.id} className="rounded-lg border bg-card">
                  <button
                    className="w-full p-3 flex items-center gap-3 text-left"
                    onClick={() => setExpanded(open ? null : d.id)}
                  >
                    {open ? <ChevronDown className="w-4 h-4 shrink-0" /> : <ChevronRight className="w-4 h-4 shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        <span className="font-semibold">{formatRupees(d.amount)}</span>
                        <span className="text-xs text-muted-foreground">
                          {format(parseISO(d.deposit_date), 'dd MMM yyyy')}
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
                      {d.notes && <div><span className="font-medium text-foreground">Notes: </span>{d.notes}</div>}
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
