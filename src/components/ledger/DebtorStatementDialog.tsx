import { useEffect, useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { Loader2, Printer, Download, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useSettingsStore } from '@/store/settings-store';
import { formatAmount } from '@/lib/format';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  debtorId: string | null;
  debtorName: string;
  openingBalance?: number;
}

interface Row {
  date: string;
  particulars: string;
  debit: number;
  credit: number;
}

function buildHtml(opts: {
  company: string;
  name: string;
  rows: { date: string; particulars: string; debit: number; credit: number; balance: number }[];
  openingBalance: number;
  totals: { debit: number; credit: number };
  closing: number;
}) {
  const { company, name, rows, openingBalance, totals, closing } = opts;
  const fmt = (n: number) => (n ? n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-');
  return `<!doctype html><html><head><meta charset="utf-8"/><title>${name} — Ledger Statement</title>
<style>
  body{font-family:Arial,Helvetica,sans-serif;color:#111;margin:24px;}
  h1{text-align:center;margin:0 0 4px;font-size:20px;}
  h2{text-align:center;margin:0 0 16px;font-size:14px;font-weight:600;color:#444;}
  table{width:100%;border-collapse:collapse;font-size:12px;}
  th,td{border:1px solid #bbb;padding:6px 8px;}
  th{background:#f3f3f3;text-align:left;}
  td.num,th.num{text-align:right;font-variant-numeric:tabular-nums;}
  tr.opening td{background:#fafafa;font-style:italic;}
  tfoot td{font-weight:700;background:#f3f3f3;}
  .meta{display:flex;justify-content:space-between;font-size:11px;color:#555;margin-bottom:8px;}
  @media print{ body{margin:10mm;} button{display:none;} }
</style></head><body>
<h1>${company || 'Ledger Statement'}</h1>
<h2>${name}</h2>
<div class="meta"><span>Statement Date: ${format(new Date(), 'dd MMM yyyy')}</span><span>${rows.length} transaction(s)</span></div>
<table>
  <thead><tr>
    <th style="width:90px">Date</th><th>Particulars</th>
    <th class="num" style="width:110px">Debit</th>
    <th class="num" style="width:110px">Credit</th>
    <th class="num" style="width:130px">Balance</th>
  </tr></thead>
  <tbody>
    ${openingBalance !== 0 ? `<tr class="opening"><td>—</td><td>Opening Balance</td><td class="num">${openingBalance > 0 ? fmt(openingBalance) : '-'}</td><td class="num">${openingBalance < 0 ? fmt(Math.abs(openingBalance)) : '-'}</td><td class="num">${fmt(Math.abs(openingBalance))} ${openingBalance >= 0 ? 'Dr' : 'Cr'}</td></tr>` : ''}
    ${rows.map(r => `<tr>
      <td>${format(parseISO(r.date), 'dd-MM-yyyy')}</td>
      <td>${r.particulars}</td>
      <td class="num">${r.debit ? fmt(r.debit) : '-'}</td>
      <td class="num">${r.credit ? fmt(r.credit) : '-'}</td>
      <td class="num">${fmt(Math.abs(r.balance))} ${r.balance >= 0 ? 'Dr' : 'Cr'}</td>
    </tr>`).join('')}
  </tbody>
  <tfoot>
    <tr><td colspan="2">Total</td><td class="num">${fmt(totals.debit)}</td><td class="num">${fmt(totals.credit)}</td><td class="num">${fmt(Math.abs(closing))} ${closing >= 0 ? 'Dr' : 'Cr'}</td></tr>
    <tr><td colspan="4" style="text-align:right">Closing Balance</td><td class="num">${fmt(Math.abs(closing))} ${closing >= 0 ? 'Dr' : 'Cr'}</td></tr>
  </tfoot>
</table>
</body></html>`;
}

export function DebtorStatementDialog({ open, onOpenChange, debtorId, debtorName, openingBalance = 0 }: Props) {
  const { clientId } = useAuth();
  const { businessProfile } = useSettingsStore();
  const company = businessProfile.companyName || '';
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !clientId || !debtorId) return;
    setLoading(true);
    supabase
      .from('ledger_transactions')
      .select('*')
      .eq('client_id', clientId)
      .eq('account_type', 'debtor')
      .eq('account_id', debtorId)
      .order('transaction_date', { ascending: true })
      .then(({ data }) => {
        setRows(
          (data || []).map((t: any) => ({
            date: t.transaction_date,
            particulars: t.description + (t.remarks ? ` — ${t.remarks}` : ''),
            debit: t.transaction_type === 'DEBIT' ? Number(t.amount) : 0,
            credit: t.transaction_type === 'CREDIT' ? Number(t.amount) : 0,
          }))
        );
      })
      .finally(() => setLoading(false));
  }, [open, clientId, debtorId]);

  const computed = useMemo(() => {
    let bal = openingBalance;
    const withBal = rows.map((r) => {
      bal += r.debit - r.credit;
      return { ...r, balance: bal };
    });
    const totals = rows.reduce(
      (a, r) => ({ debit: a.debit + r.debit, credit: a.credit + r.credit }),
      { debit: 0, credit: 0 }
    );
    return { withBal, totals, closing: openingBalance + totals.debit - totals.credit };
  }, [rows, openingBalance]);

  const handlePrint = () => {
    const html = buildHtml({ company, name: debtorName, rows: computed.withBal, openingBalance, totals: computed.totals, closing: computed.closing });
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(html);
    w.document.close();
    setTimeout(() => w.print(), 250);
  };
  const handleDownload = () => {
    const html = buildHtml({ company, name: debtorName, rows: computed.withBal, openingBalance, totals: computed.totals, closing: computed.closing });
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${debtorName.replace(/\s+/g, '-')}-statement.html`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const fmt = (n: number) => (n ? formatAmount(n) : '-');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Ledger Statement</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin" /></div>
        ) : (
          <>
            <div className="text-center border-b pb-3 mb-3">
              {company && <h2 className="text-xl font-bold">{company}</h2>}
              <p className="text-sm text-muted-foreground">{debtorName}</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm border">
                <thead className="bg-muted/60">
                  <tr>
                    <th className="text-left p-2 border-b">Date</th>
                    <th className="text-left p-2 border-b">Particulars</th>
                    <th className="text-right p-2 border-b">Debit</th>
                    <th className="text-right p-2 border-b">Credit</th>
                    <th className="text-right p-2 border-b">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {openingBalance !== 0 && (
                    <tr className="italic bg-muted/30">
                      <td className="p-2">—</td>
                      <td className="p-2">Opening Balance</td>
                      <td className="p-2 text-right font-mono">{openingBalance > 0 ? fmt(openingBalance) : '-'}</td>
                      <td className="p-2 text-right font-mono">{openingBalance < 0 ? fmt(Math.abs(openingBalance)) : '-'}</td>
                      <td className="p-2 text-right font-mono">{fmt(Math.abs(openingBalance))} {openingBalance >= 0 ? 'Dr' : 'Cr'}</td>
                    </tr>
                  )}
                  {computed.withBal.length === 0 && openingBalance === 0 && (
                    <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">No transactions yet.</td></tr>
                  )}
                  {computed.withBal.map((r, i) => (
                    <tr key={i} className="border-b">
                      <td className="p-2 font-mono text-xs">{format(parseISO(r.date), 'dd-MM-yyyy')}</td>
                      <td className="p-2">{r.particulars}</td>
                      <td className="p-2 text-right font-mono">{fmt(r.debit)}</td>
                      <td className="p-2 text-right font-mono">{fmt(r.credit)}</td>
                      <td className="p-2 text-right font-mono">{fmt(Math.abs(r.balance))} {r.balance >= 0 ? 'Dr' : 'Cr'}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-muted font-bold">
                  <tr>
                    <td colSpan={2} className="p-2">Total</td>
                    <td className="p-2 text-right font-mono">{fmt(computed.totals.debit)}</td>
                    <td className="p-2 text-right font-mono">{fmt(computed.totals.credit)}</td>
                    <td className="p-2 text-right font-mono">{fmt(Math.abs(computed.closing))} {computed.closing >= 0 ? 'Dr' : 'Cr'}</td>
                  </tr>
                  <tr>
                    <td colSpan={4} className="p-2 text-right">Closing Balance</td>
                    <td className="p-2 text-right font-mono text-primary">{fmt(Math.abs(computed.closing))} {computed.closing >= 0 ? 'Dr' : 'Cr'}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t mt-3">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                <X className="w-4 h-4 mr-1" /> Close
              </Button>
              <Button variant="outline" onClick={handleDownload}>
                <Download className="w-4 h-4 mr-1" /> Download
              </Button>
              <Button onClick={handlePrint}>
                <Printer className="w-4 h-4 mr-1" /> Print / PDF
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
