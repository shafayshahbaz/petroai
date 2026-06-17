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
import { getOpeningCashInHand } from '@/services/openingBalancesService';

/**
 * Cash in Hand =
 *   Opening Cash in Hand (one-time, from Settings)
 *   + Σ Total Collected from confirmed daily reports
 *   − Σ ALL bank movements (deposits + cash transfers)
 *
 * Both Bank Deposits and Cash Transfers reduce Cash in Hand.
 */
export function CashInHandCard() {
  const { clientId } = useAuth();
  const [reports, setReports] = useState<DailySalesReport[]>([]);
  const [entries, setEntries] = useState<PersonEntryRecord[]>([]);
  const [deposits, setDeposits] = useState<BankDepositRecord[]>([]);
  const [openingCash, setOpeningCash] = useState(0);

  useEffect(() => {
    if (!clientId) return;
    Promise.all([
      listReports(),
      listAllPersonEntries(),
      listBankDeposits(),
      getOpeningCashInHand(clientId),
    ])
      .then(([r, e, d, oc]) => {
        setReports(r);
        setEntries(e);
        setDeposits(d);
        setOpeningCash(oc);
      })
      .catch(() => {});
  }, [clientId]);

  const { cashInHand, lastDeposit, latestReportDate } = useMemo(() => {
    const confirmed = reports.filter((r) => r.confirmed);
    let totalCollected = 0;
    for (const rep of confirmed) {
      const ids = new Set(rep.entry_ids || []);
      const repEntries = entries.filter((e) => ids.has(e.id));
      totalCollected += repEntries.reduce((s, e) => s + Number(e.total_collected || 0), 0);
    }

    const totalOutflow = deposits.reduce((s, d) => s + Number(d.amount || 0), 0);

    const cih = openingCash + totalCollected - totalOutflow;

    const sortedDeposits = [...deposits].sort((a, b) =>
      a.deposit_date < b.deposit_date ? 1 : a.deposit_date > b.deposit_date ? -1 : 0
    );
    const lastDeposit = sortedDeposits[0] || null;

    const latestReportDate =
      confirmed.map((r) => r.report_date).sort().reverse()[0] || null;

    return { cashInHand: cih, lastDeposit, latestReportDate };
  }, [reports, entries, deposits, openingCash]);

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
          Opening: {formatRupees(openingCash)}
        </p>
        <p className="text-xs text-muted-foreground">
          {lastDeposit
            ? `Last bank movement: ${format(parseISO(lastDeposit.deposit_date), 'dd MMM yyyy')} · ${formatRupees(lastDeposit.amount)} (${lastDeposit.transaction_type === 'cash_transfer' ? 'Cash Transfer' : 'Deposit'})`
            : 'No bank movements yet'}
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

