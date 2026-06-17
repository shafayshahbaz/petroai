import { useEffect, useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import {
  Loader2,
  Lock,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  Check,
  FileText,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { formatRupees, formatLiters } from '@/lib/format';
import {
  listAllPersonEntries,
  saveDailySalesReport,
  PersonEntryRecord,
} from '@/services/personEntryService';

const PRODUCT_LABEL: Record<string, string> = {
  MS: 'Petrol (MS)',
  HSD: 'Diesel (HSD)',
  POWER: 'Power',
};

function todayStr() {
  return format(new Date(), 'yyyy-MM-dd');
}

export default function DailySalesReport() {
  const { toast } = useToast();
  const { clientId } = useAuth();
  const [entries, setEntries] = useState<PersonEntryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showIncluded, setShowIncluded] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const refresh = async () => {
    setLoading(true);
    try {
      const list = await listAllPersonEntries();
      setEntries(list);
    } catch (e: any) {
      toast({ title: 'Failed to load entries', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const today = todayStr();

  const { pending, todayList, included } = useMemo(() => {
    const pending: PersonEntryRecord[] = [];
    const todayList: PersonEntryRecord[] = [];
    const included: PersonEntryRecord[] = [];
    for (const e of entries) {
      if (e.report_inclusion_status === 'included') {
        included.push(e);
      } else if (e.entry_date === today) {
        todayList.push(e);
      } else if (e.entry_date < today) {
        pending.push(e);
      } else {
        // future-dated entries treat as today's group
        todayList.push(e);
      }
    }
    return { pending, todayList, included };
  }, [entries, today]);

  const selectableIds = useMemo(
    () => [...pending, ...todayList].map((e) => e.id),
    [pending, todayList]
  );

  const toggle = (id: string) => {
    setSelected((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const selectAll = () => setSelected(new Set(selectableIds));
  const deselectAll = () => setSelected(new Set());

  const selectedEntries = useMemo(
    () => entries.filter((e) => selected.has(e.id)),
    [entries, selected]
  );

  const reportDate = useMemo(() => {
    if (selectedEntries.length === 0) return null;
    return selectedEntries.map((e) => e.entry_date).sort().reverse()[0];
  }, [selectedEntries]);

  const totals = useMemo(() => {
    const t = { liters: 0, gross: 0, expenses: 0, net: 0, cash: 0, upi: 0, collected: 0 };
    for (const e of selectedEntries) {
      t.liters += +e.liters_sold || 0;
      t.gross += +e.gross_amount || 0;
      t.expenses += +e.total_expenses || 0;
      t.net += +e.net_payable || 0;
      t.cash += +e.total_cash || 0;
      t.upi += +e.upi_received || 0;
      t.collected += +e.total_collected || 0;
    }
    return t;
  }, [selectedEntries]);

  const handleConfirm = async (confirm: boolean) => {
    if (!clientId) return;
    if (selectedEntries.length === 0) {
      toast({ title: 'Select at least one entry', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const { merged } = await saveDailySalesReport({
        clientId,
        entries: selectedEntries,
        confirm,
      });
      toast({
        title: confirm ? 'Report Confirmed' : 'Saved as Draft',
        description: merged
          ? `Entries added to existing ${confirm ? 'report' : 'draft'} for ${reportDate}`
          : `Report for ${reportDate} ${confirm ? 'confirmed' : 'saved as draft'}`,
      });
      setSelected(new Set());
      setConfirmOpen(false);
      await refresh();
    } catch (e: any) {
      toast({ title: 'Failed', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const renderRow = (e: PersonEntryRecord, locked = false) => {
    const isChecked = selected.has(e.id);
    return (
      <div
        key={e.id}
        className={cn(
          'rounded-lg border p-3 flex gap-3 items-start',
          locked ? 'bg-muted/50 opacity-75' : isChecked ? 'border-primary bg-primary/5' : 'bg-card'
        )}
      >
        <div className="pt-0.5">
          {locked ? (
            <Lock className="w-4 h-4 text-muted-foreground" />
          ) : (
            <Checkbox checked={isChecked} onCheckedChange={() => toggle(e.id)} />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="font-semibold">{e.nozzle_man_name}</span>
            <Badge variant="secondary" className="text-xs">
              {e.nozzle_label} · {PRODUCT_LABEL[e.product] || e.product}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {format(parseISO(e.entry_date), 'dd MMM yyyy')}
            </span>
            {e.report_inclusion_status === 'draft' && (
              <Badge variant="outline" className="text-xs border-blue-500 text-blue-600">Draft</Badge>
            )}
          </div>
          <div className="mt-1 grid grid-cols-2 sm:grid-cols-4 gap-x-3 gap-y-1 text-xs">
            <span className="text-muted-foreground">Liters: <span className="text-foreground font-medium">{formatLiters(e.liters_sold)}</span></span>
            <span className="text-muted-foreground">Gross: <span className="text-foreground font-medium">{formatRupees(e.gross_amount)}</span></span>
            <span className="text-muted-foreground">Net: <span className="text-foreground font-medium">{formatRupees(e.net_payable)}</span></span>
            <span className="text-muted-foreground">Collected: <span className="text-foreground font-medium">{formatRupees(e.total_collected)}</span></span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in pb-32">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Daily Sales Report</h1>
          <p className="text-muted-foreground text-sm">
            Compile shift entries into a consolidated daily report
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={selectAll}>Select All</Button>
          <Button variant="outline" size="sm" onClick={deselectAll}>Deselect All</Button>
        </div>
      </div>

      {/* Group 1: Pending from previous days */}
      {pending.length > 0 && (
        <Card className="border-amber-300">
          <CardHeader className="bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 rounded-t-lg">
            <CardTitle className="text-base flex items-center gap-2 text-amber-900 dark:text-amber-200">
              <AlertTriangle className="w-4 h-4" />
              Pending from Previous Days ({pending.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 pt-4">
            {pending.map((e) => renderRow(e))}
          </CardContent>
        </Card>
      )}

      {/* Group 2: Today */}
      <Card className="border-primary/30">
        <CardHeader className="bg-primary/5 border-b rounded-t-lg">
          <CardTitle className="text-base text-primary">
            Today's Entries ({todayList.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 pt-4">
          {todayList.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No entries for today yet.
            </p>
          ) : (
            todayList.map((e) => renderRow(e))
          )}
        </CardContent>
      </Card>

      {/* Group 3: Included (locked) */}
      <Card className="border-muted">
        <button
          className="w-full"
          onClick={() => setShowIncluded((v) => !v)}
        >
          <CardHeader className="flex flex-row items-center justify-between py-3 cursor-pointer hover:bg-muted/40">
            <CardTitle className="text-base flex items-center gap-2 text-muted-foreground">
              <Lock className="w-4 h-4" />
              Already Included in a Report ({included.length})
            </CardTitle>
            {showIncluded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </CardHeader>
        </button>
        {showIncluded && (
          <CardContent className="space-y-2 pt-4">
            {included.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2 text-center">No locked entries.</p>
            ) : (
              included.map((e) => renderRow(e, true))
            )}
          </CardContent>
        )}
      </Card>

      {/* Action bar */}
      {selectedEntries.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 lg:left-64 z-30 bg-background border-t shadow-lg p-3">
          <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm">
              <div className="font-semibold">
                {selectedEntries.length} selected · Net {formatRupees(totals.net)}
              </div>
              {reportDate && (
                <div className="text-xs text-muted-foreground">
                  Report Date: {format(parseISO(reportDate), 'dd MMM yyyy')} (latest entry date)
                </div>
              )}
            </div>
            <Button onClick={() => setConfirmOpen(true)} className="min-h-[44px]">
              <FileText className="w-4 h-4 mr-2" />
              Create Sales Report
            </Button>
          </div>
        </div>
      )}

      {/* Confirm dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Sales Report</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            {reportDate && (
              <div className="rounded-md border bg-muted/40 px-3 py-2">
                <div className="font-semibold">
                  Report Date: {format(parseISO(reportDate), 'dd MMM yyyy')}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Based on latest entry date in selection
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              <Stat label="Entries" value={String(selectedEntries.length)} />
              <Stat label="Liters Sold" value={`${formatLiters(totals.liters)} L`} />
              <Stat label="Gross" value={formatRupees(totals.gross)} />
              <Stat label="Expenses" value={formatRupees(totals.expenses)} />
              <Stat label="Net Payable" value={formatRupees(totals.net)} bold />
              <Stat label="Total Collected" value={formatRupees(totals.collected)} bold />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => handleConfirm(false)} disabled={saving}>
              Save Draft
            </Button>
            <Button onClick={() => handleConfirm(true)} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
              Confirm & Lock
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Stat({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="rounded border bg-card px-3 py-2">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={cn('text-sm', bold ? 'font-bold text-primary' : 'font-medium')}>
        {value}
      </div>
    </div>
  );
}
