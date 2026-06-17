import { useEffect, useMemo, useState } from 'react';
import { Wallet } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatRupees } from '@/lib/format';
import { useAuth } from '@/contexts/AuthContext';
import {
  listReports,
  listAllPersonEntries,
  DailySalesReport,
  PersonEntryRecord,
} from '@/services/personEntryService';
import { listBankDeposits, BankDepositRecord } from '@/services/bankDepositService';

/**
 * Cash in Hand =
 *   Σ Net Cash in Hand from confirmed daily reports
 *   − Σ bank deposits recorded AFTER the latest confirmed report date
 *
 * Net Cash in Hand per report = Total Collected of its entries
 *   − bank deposits recorded ON that report's date
 */
export function CashInHandCard() {
  const { clientId } = useAuth();
  const [reports, setReports] = useState<DailySalesReport[]>([]);
  const [entries, setEntries] = useState<PersonEntryRecord[]>([]);
  const [deposits, setDeposits] = useState<BankDepositRecord[]>([]);

  useEffect(() => {
    if (!clientId) return;
    Promise.all([listReports(), listAllPersonEntries(), listBankDeposits()])
      .then(([r, e, d]) => { setReports(r); setEntries(e); setDeposits(d); })
      .catch(() => {});
  }, [clientId]);

  const { cashInHand, lastDeposit, latestReportDate } = useMemo(() => {
    const confirmed = reports.filter((r) => r.confirmed);
    const depositByDate = new Map<string, number>();
    deposits.forEach((d) => {
      depositByDate.set(d.deposit_date, (depositByDate.get(d.deposit_date) || 0) + Number(d.amount || 0));
    });

    let totalNetCash = 0;
    for (const rep of confirmed) {
      const ids = new Set(rep.entry_ids || []);
      const repEntries = entries.filter((e) => ids.has(e.id));
      const collected = repEntries.reduce((s, e) => s + Number(e.total_collected || 0), 0);
      const depositsOnDate = depositByDate.get(rep.report_date) || 0;
      totalNetCash += collected - depositsOnDate;
    }

    const latestReportDate = confirmed
      .map((r) => r.report_date)
      .sort()
      .reverse()[0] || null;

    const postLatest = latestReportDate
      ? deposits.filter((d) => d.deposit_date > latestReportDate)
      : deposits;
    const postLatestSum = postLatest.reduce((s, d) => s + Number(d.amount || 0), 0);

    const cih = totalNetCash - postLatestSum;

    const sortedDeposits = [...deposits].sort((a, b) =>
      a.deposit_date < b.deposit_date ? 1 : a.deposit_date > b.deposit_date ? -1 : 0
    );
    const lastDeposit = sortedDeposits[0] || null;

    return { cashInHand: cih, lastDeposit, latestReportDate };
  }, [reports, entries, deposits]);

  return (
    <Card className="border-l-4 border-l-success">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Cash in Hand
        </CardTitle>
        <Wallet className="w-4 h-4 text-success" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-foreground">{formatRupees(cashInHand)}</div>
        <p className="text-xs text-muted-foreground mt-1">
          {lastDeposit
            ? `Last deposit: ${format(parseISO(lastDeposit.deposit_date), 'dd MMM yyyy')} · ${formatRupees(lastDeposit.amount)}`
            : 'No bank deposits recorded yet'}
        </p>
        {latestReportDate && (
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Through confirmed report of {format(parseISO(latestReportDate), 'dd MMM yyyy')}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
