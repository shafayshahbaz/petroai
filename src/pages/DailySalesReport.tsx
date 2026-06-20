import { useEffect, useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import {
  Loader2,
  AlertTriangle,
  Check,
  FileText,
  Eye,
  Download,
  Printer,
  Edit3,
  Trash2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useSettingsStore } from '@/store/settings-store';
import { cn } from '@/lib/utils';
import { formatRupees, formatLiters } from '@/lib/format';
import {
  listAllPersonEntries,
  saveDailySalesReport,
  listReports,
  getEntriesForReport,
  unlockReport,
  updatePersonEntry,
  deletePersonEntry,
  getLastClosingForNozzle,
  PersonEntryRecord,
  DailySalesReport as DailySalesReportRow,
} from '@/services/personEntryService';
import { useCloudData } from '@/contexts/CloudDataContext';
import {
  listBankDepositsForDate,
  createBankDeposit,
} from '@/services/bankDepositService';
import {
  listTanks,
  getDipChart,
  computeLitersFromDip,
  saveDipReadings,
  getDipReadingsForDate,
  TankRow,
} from '@/services/dipService';
import {
  SalesReportPrintable,
  buildPrintableHtml,
  SalesReportData,
  DipReportRow,
} from '@/components/report/SalesReportPrintable';

const PRODUCT_LABEL: Record<string, string> = {
  MS: 'Petrol (MS)',
  HSD: 'Diesel (HSD)',
  POWER: 'Power',
};

function todayStr() {
  return format(new Date(), 'yyyy-MM-dd');
}

type WizardStep = 'idle' | 'bank' | 'dip' | 'confirm';

export default function DailySalesReport() {
  const { toast } = useToast();
  const { clientId } = useAuth();
  const { businessProfile } = useSettingsStore();
  const [entries, setEntries] = useState<PersonEntryRecord[]>([]);
  const [reports, setReports] = useState<DailySalesReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [viewOpen, setViewOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<'create' | 'view'>('create');

  // Wizard state
  const [wizard, setWizard] = useState<WizardStep>('idle');
  const [bankAmount, setBankAmount] = useState<string>('');
  const [bankName, setBankName] = useState<string>('');
  const [bankRef, setBankRef] = useState<string>('');
  const [bankSkipped, setBankSkipped] = useState(false);
  const [tanks, setTanks] = useState<TankRow[]>([]);
  const [dipInputs, setDipInputs] = useState<Record<string, string>>({});
  const [dipComputed, setDipComputed] = useState<DipReportRow[]>([]);
  const [dipSkipped, setDipSkipped] = useState(false);

  // View tab: report preview
  const [activeReport, setActiveReport] = useState<DailySalesReportRow | null>(null);
  const [activeReportData, setActiveReportData] = useState<SalesReportData | null>(null);
  const [reportViewOpen, setReportViewOpen] = useState(false);

  const refresh = async () => {
    setLoading(true);
    try {
      const [list, reps] = await Promise.all([listAllPersonEntries(), listReports()]);
      setEntries(list);
      setReports(reps);
    } catch (e: any) {
      toast({ title: 'Failed to load', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const today = todayStr();

  const { pending, todayList } = useMemo(() => {
    const pending: PersonEntryRecord[] = [];
    const todayList: PersonEntryRecord[] = [];
    for (const e of entries) {
      if (e.report_inclusion_status === 'included') continue;
      if (e.entry_date < today) pending.push(e);
      else todayList.push(e);
    }
    return { pending, todayList };
  }, [entries, today]);

  const selectableIds = useMemo(
    () => [...pending, ...todayList].map((e) => e.id),
    [pending, todayList]
  );

  const toggle = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
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
    const t = {
      liters: 0, gross: 0, expenses: 0, income: 0, net: 0,
      cash: 0, upi: 0, collected: 0,
      d500: 0, d200: 0, d100: 0, d50: 0, d20: 0, d10: 0, coins: 0,
    };
    for (const e of selectedEntries) {
      t.liters += +e.liters_sold || 0;
      t.gross += +e.gross_amount || 0;
      t.expenses += +e.total_expenses || 0;
      t.income += +e.total_income || 0;
      t.net += +e.net_payable || 0;
      t.cash += +e.total_cash || 0;
      t.upi += +e.upi_received || 0;
      t.collected += +e.total_collected || 0;
      const d = e.denominations || ({} as any);
      t.d500 += +d.d500 || 0;
      t.d200 += +d.d200 || 0;
      t.d100 += +d.d100 || 0;
      t.d50 += +d.d50 || 0;
      t.d20 += +d.d20 || 0;
      t.d10 += +d.d10 || 0;
      t.coins += +d.coins || 0;
    }
    return t;
  }, [selectedEntries]);

  const [bankToday, setBankToday] = useState<number>(0);
  useEffect(() => {
    if (!reportDate) { setBankToday(0); return; }
    listBankDepositsForDate(reportDate)
      .then((rows) => setBankToday(rows.reduce((s, r) => s + Number(r.amount || 0), 0)))
      .catch(() => setBankToday(0));
  }, [reportDate, wizard]);

  const netCashInHand = totals.collected - bankToday;

  const reportData: SalesReportData | null = useMemo(() => {
    if (!reportDate) return null;
    return {
      reportDate,
      entries: selectedEntries,
      totals,
      bankDeposited: bankToday,
      netCashInHand,
      businessName: businessProfile.companyName || undefined,
      dipReadings: dipComputed.length > 0 ? dipComputed : undefined,
    };
  }, [reportDate, selectedEntries, totals, bankToday, netCashInHand, dipComputed, businessProfile.companyName]);

  const handleDownload = (data: SalesReportData | null) => {
    if (!data) return;
    const html = buildPrintableHtml(data);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `daily-sales-report-${data.reportDate}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const handlePrint = (data: SalesReportData | null) => {
    if (!data) return;
    const html = buildPrintableHtml(data);
    const w = window.open('', '_blank');
    if (!w) {
      toast({ title: 'Pop-up blocked', description: 'Allow pop-ups to print', variant: 'destructive' });
      return;
    }
    w.document.write(html);
    w.document.close();
  };

  // ===== Wizard flow =====
  const startWizard = async () => {
    if (selectedEntries.length === 0) {
      toast({ title: 'Select at least one entry', variant: 'destructive' });
      return;
    }
    if (!reportDate) return;
    setBankSkipped(false);
    setDipSkipped(false);
    setDipComputed([]);
    setDipInputs({});
    setBankAmount('');
    setBankName('');
    setBankRef('');
    // Step 1 trigger: check bank deposits on reportDate
    try {
      const rows = await listBankDepositsForDate(reportDate);
      const total = rows.reduce((s, r) => s + Number(r.amount || 0), 0);
      if (total > 0) {
        // Already have a deposit → skip to Dip step
        await goToDipStep();
      } else {
        setWizard('bank');
      }
    } catch (e: any) {
      toast({ title: 'Failed', description: e.message, variant: 'destructive' });
    }
  };

  const handleBankYes = async () => {
    if (!clientId || !reportDate) return;
    const amt = Number(bankAmount);
    if (!amt || amt <= 0) {
      toast({ title: 'Enter amount', variant: 'destructive' });
      return;
    }
    try {
      await createBankDeposit(
        {
          deposit_date: reportDate,
          amount: amt,
          bank_name: bankName || null,
          reference_number: bankRef || null,
          notes: 'Added from Daily Sales Report wizard',
          transaction_type: 'deposit',
        },
        clientId
      );
      toast({ title: 'Bank deposit saved' });
      await goToDipStep();
    } catch (e: any) {
      toast({ title: 'Failed', description: e.message, variant: 'destructive' });
    }
  };

  const handleBankNo = async () => {
    setBankSkipped(true);
    await goToDipStep();
  };

  const goToDipStep = async () => {
    // Load tanks
    try {
      const tk = await listTanks();
      setTanks(tk);
      // Preload existing dip readings for date if any
      if (reportDate) {
        const existing = await getDipReadingsForDate(reportDate);
        const map: Record<string, string> = {};
        for (const r of existing) map[r.tank_id] = String(r.dip_reading);
        setDipInputs(map);
      }
      setWizard('dip');
    } catch (e: any) {
      toast({ title: 'Failed to load tanks', description: e.message, variant: 'destructive' });
    }
  };

  const handleDipNo = () => {
    setDipSkipped(true);
    setDipComputed([]);
    setWizard('confirm');
  };

  const handleDipYes = async () => {
    if (!clientId || !reportDate) return;
    try {
      const computed: DipReportRow[] = [];
      const toSave: any[] = [];
      for (const t of tanks) {
        const raw = dipInputs[t.id];
        if (raw == null || raw === '') continue;
        const dip = Number(raw);
        if (!Number.isFinite(dip)) continue;
        const chart = await getDipChart(t.id);
        const liters = computeLitersFromDip(chart, dip);
        const variance = liters != null ? Math.round((liters - Number(t.current_stock)) * 100) / 100 : null;
        computed.push({
          tank_name: t.name,
          fuel_type: t.fuel_type,
          dip_reading: dip,
          dip_liters: liters,
          system_liters: Number(t.current_stock),
          variance,
        });
        toSave.push({
          tank_id: t.id,
          date: reportDate,
          dip_reading: dip,
          dip_liters: liters,
          system_liters: Number(t.current_stock),
          variance,
        });
      }
      if (toSave.length > 0) {
        await saveDipReadings(clientId, reportDate, toSave);
      }
      setDipComputed(computed);
      setWizard('confirm');
    } catch (e: any) {
      toast({ title: 'Failed to save dip', description: e.message, variant: 'destructive' });
    }
  };

  const handleConfirm = async (confirm: boolean) => {
    if (!clientId) return;
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
      setWizard('idle');
      await refresh();
    } catch (e: any) {
      toast({ title: 'Failed', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  // ===== View tab =====
  const openSavedReport = async (r: DailySalesReportRow) => {
    setActiveReport(r);
    try {
      const [reportEntries, deposits, dipRows] = await Promise.all([
        getEntriesForReport(r.id),
        listBankDepositsForDate(r.report_date),
        getDipReadingsForDate(r.report_date),
      ]);
      const t = {
        liters: 0, gross: 0, expenses: 0, income: 0, net: 0,
        cash: 0, upi: 0, collected: 0,
        d500: 0, d200: 0, d100: 0, d50: 0, d20: 0, d10: 0, coins: 0,
      };
      for (const e of reportEntries) {
        t.liters += +e.liters_sold || 0;
        t.gross += +e.gross_amount || 0;
        t.expenses += +e.total_expenses || 0;
        t.income += +e.total_income || 0;
        t.net += +e.net_payable || 0;
        t.cash += +e.total_cash || 0;
        t.upi += +e.upi_received || 0;
        t.collected += +e.total_collected || 0;
        const d = e.denominations || ({} as any);
        t.d500 += +d.d500 || 0; t.d200 += +d.d200 || 0;
        t.d100 += +d.d100 || 0; t.d50 += +d.d50 || 0;
        t.d20 += +d.d20 || 0; t.d10 += +d.d10 || 0;
        t.coins += +d.coins || 0;
      }
      const bank = deposits.reduce((s, d) => s + Number(d.amount || 0), 0);
      let dipReadings: DipReportRow[] | undefined;
      if (dipRows.length > 0) {
        const tks = await listTanks();
        const tMap = new Map(tks.map((x) => [x.id, x]));
        dipReadings = dipRows.map((d) => {
          const tk = tMap.get(d.tank_id);
          return {
            tank_name: tk?.name || 'Tank',
            fuel_type: tk?.fuel_type || '',
            dip_reading: Number(d.dip_reading),
            dip_liters: d.dip_liters,
            system_liters: d.system_liters,
            variance: d.variance,
          };
        });
      }
      setActiveReportData({
        reportDate: r.report_date,
        entries: reportEntries,
        totals: t,
        bankDeposited: bank,
        netCashInHand: t.collected - bank,
        businessName: businessProfile.companyName || undefined,
        dipReadings,
      });
      setReportViewOpen(true);
    } catch (e: any) {
      toast({ title: 'Failed to open report', description: e.message, variant: 'destructive' });
    }
  };

  const handleUnlock = async (r: DailySalesReportRow) => {
    if (!window.confirm(`Unlock report for ${r.report_date}? Entries will be moved back to pending so you can edit them.`)) return;
    try {
      await unlockReport(r.id);
      toast({ title: 'Report unlocked', description: 'Entries moved back to pending.' });
      setReportViewOpen(false);
      setActiveReport(null);
      setActiveReportData(null);
      setTab('create');
      await refresh();
    } catch (e: any) {
      toast({ title: 'Failed to unlock', description: e.message, variant: 'destructive' });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const renderRow = (e: PersonEntryRecord) => {
    const isChecked = selected.has(e.id);
    return (
      <div
        key={e.id}
        className={cn(
          'rounded-lg border p-3 flex gap-3 items-start',
          isChecked ? 'border-primary bg-primary/5' : 'bg-card'
        )}
      >
        <div className="pt-0.5">
          <Checkbox checked={isChecked} onCheckedChange={() => toggle(e.id)} />
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
      <div>
        <h1 className="text-2xl font-bold text-foreground">Daily Sales Report</h1>
        <p className="text-muted-foreground text-sm">
          Compile shift entries into a consolidated daily report
        </p>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="create">Make Report</TabsTrigger>
          <TabsTrigger value="view">View Reports ({reports.length})</TabsTrigger>
        </TabsList>

        {/* ===== Make Report ===== */}
        <TabsContent value="create" className="space-y-6 mt-4">
          <div className="flex gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={selectAll}>Select All</Button>
            <Button variant="outline" size="sm" onClick={deselectAll}>Deselect All</Button>
          </div>

          {pending.length > 0 && (
            <Card className="border-amber-300">
              <CardHeader className="bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 rounded-t-lg">
                <CardTitle className="text-base flex items-center gap-2 text-amber-900 dark:text-amber-200">
                  <AlertTriangle className="w-4 h-4" />
                  Pending Unsettled Entries ({pending.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 pt-4">
                {pending.map((e) => renderRow(e))}
              </CardContent>
            </Card>
          )}

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

          {selectedEntries.length > 0 && reportDate && (
            <div className="fixed bottom-0 left-0 right-0 lg:left-64 z-30 bg-background border-t shadow-lg p-3">
              <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-3">
                <div className="text-sm">
                  <div className="font-semibold">
                    {selectedEntries.length} selected · Net {formatRupees(totals.net)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Report Date: {format(parseISO(reportDate), 'dd MMM yyyy')}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={() => setViewOpen(true)} className="min-h-[44px]">
                    <Eye className="w-4 h-4 mr-1" /> View
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleDownload(reportData)} className="min-h-[44px]">
                    <Download className="w-4 h-4 mr-1" /> Download
                  </Button>
                  <Button onClick={startWizard} className="min-h-[44px]">
                    <FileText className="w-4 h-4 mr-2" />
                    Create Report
                  </Button>
                </div>
              </div>
            </div>
          )}
        </TabsContent>

        {/* ===== View Reports ===== */}
        <TabsContent value="view" className="space-y-3 mt-4">
          {reports.length === 0 ? (
            <p className="text-center text-muted-foreground py-12 text-sm">
              No saved reports yet.
            </p>
          ) : (
            reports.map((r) => (
              <Card key={r.id} className="hover:border-primary/40 transition">
                <CardContent className="p-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="font-semibold flex items-center gap-2">
                      {format(parseISO(r.report_date), 'dd MMM yyyy')}
                      {r.confirmed ? (
                        <Badge className="bg-green-600 hover:bg-green-600">Confirmed</Badge>
                      ) : (
                        <Badge variant="outline" className="border-blue-500 text-blue-600">Draft</Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {r.entry_ids?.length || 0} entries · Net {formatRupees(Number((r.totals as any)?.net_payable || 0))}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => openSavedReport(r)} className="min-h-[44px]">
                      <Eye className="w-4 h-4 mr-1" /> View
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleUnlock(r)} className="min-h-[44px]">
                      <Edit3 className="w-4 h-4 mr-1" /> Edit
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Preview dialog for selected (create tab) */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0">
          <DialogHeader className="px-4 pt-4">
            <DialogTitle>Sales Report Preview</DialogTitle>
          </DialogHeader>
          {reportData && <SalesReportPrintable data={reportData} />}
          <DialogFooter className="px-4 pb-4 gap-2">
            <Button variant="outline" onClick={() => setViewOpen(false)}>Close</Button>
            <Button variant="outline" onClick={() => handleDownload(reportData)}>
              <Download className="w-4 h-4 mr-1" /> Download
            </Button>
            <Button onClick={() => handlePrint(reportData)}>
              <Printer className="w-4 h-4 mr-1" /> Print
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview dialog for saved report (view tab) */}
      <Dialog open={reportViewOpen} onOpenChange={setReportViewOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0">
          <DialogHeader className="px-4 pt-4">
            <DialogTitle>
              Report · {activeReport && format(parseISO(activeReport.report_date), 'dd MMM yyyy')}
            </DialogTitle>
          </DialogHeader>
          {activeReportData && <SalesReportPrintable data={activeReportData} />}
          <DialogFooter className="px-4 pb-4 gap-2 flex-wrap">
            {activeReport && (
              <Button variant="outline" onClick={() => handleUnlock(activeReport)} className="text-destructive">
                <Trash2 className="w-4 h-4 mr-1" /> Unlock & Edit
              </Button>
            )}
            <Button variant="outline" onClick={() => setReportViewOpen(false)}>Close</Button>
            <Button variant="outline" onClick={() => handleDownload(activeReportData)}>
              <Download className="w-4 h-4 mr-1" /> Download
            </Button>
            <Button onClick={() => handlePrint(activeReportData)}>
              <Printer className="w-4 h-4 mr-1" /> Print
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== Wizard Step: Bank Deposit ===== */}
      <Dialog open={wizard === 'bank'} onOpenChange={(o) => !o && setWizard('idle')}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Bank Deposit Today?</DialogTitle>
            <DialogDescription>
              No bank deposit recorded for {reportDate && format(parseISO(reportDate), 'dd MMM yyyy')}.
              Enter it now, or skip.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Amount *</Label>
              <Input
                type="number"
                inputMode="decimal"
                value={bankAmount}
                onChange={(e) => setBankAmount(e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Bank Name</Label>
                <Input value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="e.g. HDFC" />
              </div>
              <div>
                <Label>Reference #</Label>
                <Input value={bankRef} onChange={(e) => setBankRef(e.target.value)} placeholder="Optional" />
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={handleBankNo}>No / Skip</Button>
            <Button onClick={handleBankYes}>
              <Check className="w-4 h-4 mr-1" /> Save & Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== Wizard Step: Dip ===== */}
      <Dialog open={wizard === 'dip'} onOpenChange={(o) => !o && setWizard('idle')}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Did you take Dip today?</DialogTitle>
            <DialogDescription>
              Enter dip reading (cm) for each tank, or skip to exclude dip from this report.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {tanks.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No tanks configured.</p>
            ) : (
              tanks.map((t) => (
                <div key={t.id} className="rounded border p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <div className="font-semibold text-sm">{t.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {t.fuel_type} · System: {formatLiters(t.current_stock)} L
                      </div>
                    </div>
                  </div>
                  <Input
                    type="number"
                    step="0.1"
                    inputMode="decimal"
                    value={dipInputs[t.id] || ''}
                    onChange={(e) =>
                      setDipInputs((s) => ({ ...s, [t.id]: e.target.value }))
                    }
                    placeholder="Dip in cm (e.g. 10.8)"
                  />
                </div>
              ))
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={handleDipNo}>No / Skip</Button>
            <Button onClick={handleDipYes}>
              <Check className="w-4 h-4 mr-1" /> Save & Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== Wizard Step: Final Confirm ===== */}
      <Dialog open={wizard === 'confirm'} onOpenChange={(o) => !o && setWizard('idle')}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Confirm Sales Report</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            {reportDate && (
              <div className="rounded-md border bg-muted/40 px-3 py-2">
                <div className="font-semibold">
                  Report Date: {format(parseISO(reportDate), 'dd MMM yyyy')}
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              <Stat label="Entries" value={String(selectedEntries.length)} />
              <Stat label="Liters" value={`${formatLiters(totals.liters)} L`} />
              <Stat label="Gross" value={formatRupees(totals.gross)} />
              <Stat label="Net Payable" value={formatRupees(totals.net)} bold />
              <Stat label="Total Collected" value={formatRupees(totals.collected)} />
              <Stat
                label="Bank Deposited"
                value={formatRupees(bankToday)}
              />
              <Stat
                label="Net Cash in Hand"
                value={formatRupees(netCashInHand)}
                bold
              />
              <Stat
                label="Dip Recorded"
                value={dipComputed.length > 0 ? `${dipComputed.length} tank(s)` : 'Skipped'}
              />
            </div>
            {bankSkipped && (
              <p className="text-xs text-amber-600">
                Note: bank deposit was skipped for this report.
              </p>
            )}
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
