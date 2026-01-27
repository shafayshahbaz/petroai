import { format, parseISO } from 'date-fns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from '@/components/ui/table';
import { formatAmount } from '@/lib/format';
import { cn } from '@/lib/utils';

export interface LedgerTransaction {
  id: string;
  date: string;
  particulars: string;
  remarks?: string;
  debit: number;
  credit: number;
}

interface LedgerTransactionTableProps {
  transactions: LedgerTransaction[];
  showRemarks?: boolean;
  openingBalance?: number;
}

export function LedgerTransactionTable({
  transactions,
  showRemarks = false,
  openingBalance = 0,
}: LedgerTransactionTableProps) {
  // Calculate running balance
  let runningBalance = openingBalance;
  const transactionsWithBalance = transactions.map((txn) => {
    runningBalance += txn.debit - txn.credit;
    return { ...txn, balance: runningBalance };
  });

  const totals = transactions.reduce(
    (acc, txn) => ({
      debit: acc.debit + txn.debit,
      credit: acc.credit + txn.credit,
    }),
    { debit: 0, credit: 0 }
  );

  const closingBalance = openingBalance + totals.debit - totals.credit;

  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="w-[100px]">Date</TableHead>
            <TableHead>Particulars</TableHead>
            {showRemarks && <TableHead>Remarks</TableHead>}
            <TableHead className="text-right w-[120px]">Debit</TableHead>
            <TableHead className="text-right w-[120px]">Credit</TableHead>
            <TableHead className="text-right w-[130px]">Balance</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {/* Opening Balance Row */}
          {openingBalance !== 0 && (
            <TableRow className="bg-blue-50/50">
              <TableCell className="font-mono text-muted-foreground">-</TableCell>
              <TableCell className="font-medium text-blue-700">Opening Balance</TableCell>
              {showRemarks && <TableCell>-</TableCell>}
              <TableCell className="text-right font-mono">
                {openingBalance > 0 ? formatAmount(openingBalance) : '-'}
              </TableCell>
              <TableCell className="text-right font-mono">
                {openingBalance < 0 ? formatAmount(Math.abs(openingBalance)) : '-'}
              </TableCell>
              <TableCell className={cn(
                "text-right font-mono font-medium",
                openingBalance >= 0 ? 'text-foreground' : 'text-red-600'
              )}>
                {formatAmount(Math.abs(openingBalance))} {openingBalance >= 0 ? 'Dr' : 'Cr'}
              </TableCell>
            </TableRow>
          )}

          {transactionsWithBalance.length === 0 && openingBalance === 0 ? (
            <TableRow>
              <TableCell colSpan={showRemarks ? 6 : 5} className="text-center py-8 text-muted-foreground">
                No transactions found.
              </TableCell>
            </TableRow>
          ) : (
            transactionsWithBalance.map((txn) => (
              <TableRow key={txn.id}>
                <TableCell className="font-mono text-sm">
                  {format(parseISO(txn.date), 'dd-MM-yy')}
                </TableCell>
                <TableCell>{txn.particulars}</TableCell>
                {showRemarks && (
                  <TableCell className="text-muted-foreground text-sm">
                    {txn.remarks || '-'}
                  </TableCell>
                )}
                <TableCell className="text-right font-mono">
                  {txn.debit > 0 ? formatAmount(txn.debit) : '-'}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {txn.credit > 0 ? formatAmount(txn.credit) : '-'}
                </TableCell>
                <TableCell className={cn(
                  "text-right font-mono font-medium",
                  txn.balance >= 0 ? 'text-foreground' : 'text-red-600'
                )}>
                  {formatAmount(Math.abs(txn.balance))} {txn.balance >= 0 ? 'Dr' : 'Cr'}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
        {(transactionsWithBalance.length > 0 || openingBalance !== 0) && (
          <TableFooter>
            <TableRow className="bg-muted font-bold">
              <TableCell colSpan={showRemarks ? 3 : 2}>Closing Balance</TableCell>
              <TableCell className="text-right font-mono">{formatAmount(totals.debit)}</TableCell>
              <TableCell className="text-right font-mono">{formatAmount(totals.credit)}</TableCell>
              <TableCell className={cn(
                "text-right font-mono",
                closingBalance >= 0 ? 'text-primary' : 'text-red-600'
              )}>
                {formatAmount(Math.abs(closingBalance))} {closingBalance >= 0 ? 'Dr' : 'Cr'}
              </TableCell>
            </TableRow>
          </TableFooter>
        )}
      </Table>
    </div>
  );
}
