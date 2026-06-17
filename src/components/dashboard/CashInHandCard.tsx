import { useEffect, useMemo, useState } from 'react';
import { Wallet } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatRupees } from '@/lib/format';
import { useCloudData } from '@/contexts/CloudDataContext';
import { listPersonEntries, PersonEntryRecord } from '@/services/personEntryService';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Cash in Hand (Undeposited) =
 *   previous closing cash-in-hand (from latest daily_entries)
 *   + sum(total_cash) of undeposited person_entries
 *   - sum of expenses on those entries categorised as
 *     Pump Expense / Partner Withdrawal / Debtor Oil Given
 */
export function CashInHandCard() {
  const { dailyEntries } = useCloudData();
  const { clientId } = useAuth();
  const [personEntries, setPersonEntries] = useState<PersonEntryRecord[]>([]);

  useEffect(() => {
    if (!clientId) return;
    listPersonEntries().then(setPersonEntries).catch(() => {});
  }, [clientId]);

  const prevClosing = useMemo(() => {
    if (dailyEntries.length === 0) return 0;
    const sorted = [...dailyEntries].sort((a, b) => (a.date < b.date ? 1 : -1));
    const last = sorted[0];
    // Same formula used elsewhere
    const rates = last.fuel_rates || {};
    const testing = last.testing_deduction || {};
    let totalFuelAmount = 0;
    const fuels: Record<string, number> = { MS: 0, HSD: 0, POWER: 0 };
    (last.nozzles || []).forEach((n: any) => {
      const l = Math.max(0, (n.closingReading || 0) - (n.openingReading || 0));
      if (fuels[n.fuelType] !== undefined) fuels[n.fuelType] += l;
    });
    (['MS', 'HSD', 'POWER'] as const).forEach((f) => {
      const net = Math.max(0, fuels[f] - (Number(testing[f]) || 0));
      totalFuelAmount += net * (Number(rates[f]) || 0);
    });
    const totalLube = (last.lube_items || []).reduce((s: number, x: any) => s + (x.quantity || 0) * (x.rate || 0), 0);
    const totalIncomes = (last.incomes || []).reduce((s: number, x: any) => s + (x.amount || 0), 0);
    const totalCredit = (last.credit_sales || []).reduce((s: number, x: any) => s + (x.amount || 0), 0);
    const totalExpenses = (last.expenses || []).reduce((s: number, x: any) => s + (x.amount || 0), 0);
    const grand = totalFuelAmount + totalLube + totalIncomes + (last.opening_balance || 0);
    const out = totalExpenses + (last.upi_collection || 0) + (last.cash_deposit || 0) + totalCredit;
    return Math.round((grand - out) * 100) / 100;
  }, [dailyEntries]);

  const { addedCash, deducted } = useMemo(() => {
    const undeposited = personEntries.filter((p) => !p.deposited);
    let addedCash = 0;
    let deducted = 0;
    undeposited.forEach((p) => {
      addedCash += Number(p.total_cash) || 0;
      (p.expenses || []).forEach((e) => {
        if (
          e.type === 'Pump Expense' ||
          e.type === 'Partner Withdrawal' ||
          e.type === 'Debtor Oil Given'
        ) {
          deducted += Number(e.amount) || 0;
        }
      });
    });
    return { addedCash, deducted };
  }, [personEntries]);

  const cashInHand = prevClosing + addedCash - deducted;

  return (
    <Card className="border-l-4 border-l-success">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Cash in Hand (Undeposited)
        </CardTitle>
        <Wallet className="w-4 h-4 text-success" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-foreground">{formatRupees(cashInHand)}</div>
        <p className="text-xs text-muted-foreground mt-1">
          Prev: {formatRupees(prevClosing)} + Cash: {formatRupees(addedCash)} − Paid out: {formatRupees(deducted)}
        </p>
      </CardContent>
    </Card>
  );
}
