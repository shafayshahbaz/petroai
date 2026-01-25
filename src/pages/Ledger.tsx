import { useState, useMemo } from 'react';
import { format, parseISO, isWithinInterval } from 'date-fns';
import { Calendar as CalendarIcon, BookOpen, Download, FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from '@/components/ui/table';
import { usePetrolPumpStore } from '@/store/petrol-pump-store';
import { cn } from '@/lib/utils';
import { formatAmount } from '@/lib/format';

type LedgerType = 'bank' | 'upi' | 'debtors' | 'expenses';

interface LedgerRow {
  date: string;
  particulars: string;
  remarks?: string;
  debit: number;
  credit: number;
}

// Get current financial year dates (April 1 - March 31)
function getFYDates() {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  
  // If we're in Jan-Mar, FY started last year
  const fyStartYear = currentMonth < 3 ? currentYear - 1 : currentYear;
  
  return {
    start: new Date(fyStartYear, 3, 1), // April 1
    end: new Date(fyStartYear + 1, 2, 31), // March 31
  };
}

const ledgerTabs: { id: LedgerType; label: string; description: string }[] = [
  { id: 'bank', label: 'Bank (Cash Deposit)', description: 'All bank deposit entries from daily sales' },
  { id: 'upi', label: 'UPI / Online', description: 'All UPI and online collection entries' },
  { id: 'debtors', label: 'Debtors (Credit Sales)', description: 'All credit transactions with debtors' },
  { id: 'expenses', label: 'Expenses', description: 'All expenses from daily entries' },
];

// Export to CSV/XLS
function exportToCSV(data: (LedgerRow & { balance: number })[], filename: string, includeRemarks: boolean) {
  const headers = includeRemarks 
    ? ['Date', 'Particulars', 'Remarks', 'Debit', 'Credit', 'Balance']
    : ['Date', 'Particulars', 'Debit', 'Credit', 'Balance'];
  
  const csvContent = [
    headers.join(','),
    ...data.map(row => {
      const values = includeRemarks 
        ? [
            format(parseISO(row.date), 'dd-MM-yyyy'),
            `"${row.particulars}"`,
            `"${row.remarks || ''}"`,
            row.debit.toFixed(2),
            row.credit.toFixed(2),
            row.balance.toFixed(2)
          ]
        : [
            format(parseISO(row.date), 'dd-MM-yyyy'),
            `"${row.particulars}"`,
            row.debit.toFixed(2),
            row.credit.toFixed(2),
            row.balance.toFixed(2)
          ];
      return values.join(',');
    })
  ].join('\n');
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}.csv`;
  link.click();
}

// Simple PDF export using print
function exportToPDF(ledgerLabel: string) {
  window.print();
}

export default function Ledger() {
  const { entries, debtors } = usePetrolPumpStore();
  const fyDates = getFYDates();
  
  const [selectedLedger, setSelectedLedger] = useState<LedgerType | null>(null);
  const [selectedDebtorId, setSelectedDebtorId] = useState<string>('all');
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: fyDates.start,
    to: fyDates.end,
  });

  const ledgerData = useMemo(() => {
    if (!selectedLedger) return [];

    const rows: LedgerRow[] = [];
    
    // Filter entries within date range
    const filteredEntries = entries.filter((entry) => {
      const entryDate = parseISO(entry.date);
      return isWithinInterval(entryDate, { start: dateRange.from, end: dateRange.to });
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    switch (selectedLedger) {
      case 'bank':
        filteredEntries.forEach((entry) => {
          if (entry.cashDeposit > 0) {
            rows.push({
              date: entry.date,
              particulars: `Cash Deposit - ${entry.shiftName || 'Daily Entry'}`,
              debit: entry.cashDeposit,
              credit: 0,
            });
          }
        });
        break;

      case 'upi':
        filteredEntries.forEach((entry) => {
          if (entry.upiCollection > 0) {
            rows.push({
              date: entry.date,
              particulars: `UPI Collection - ${entry.shiftName || 'Daily Entry'}`,
              debit: entry.upiCollection,
              credit: 0,
            });
          }
        });
        break;

      case 'debtors':
        // If specific debtor selected, filter only their transactions
        const targetDebtors = selectedDebtorId === 'all' 
          ? debtors 
          : debtors.filter(d => d.id === selectedDebtorId);
        
        // Add opening balances for debtors
        targetDebtors.forEach((debtor) => {
          if (debtor.openingBalance && debtor.openingBalance > 0) {
            rows.push({
              date: dateRange.from.toISOString().split('T')[0],
              particulars: `${debtor.name} - Opening Balance`,
              debit: debtor.openingBalance,
              credit: 0,
            });
          }
        });
        
        // Add credit sales from entries
        filteredEntries.forEach((entry) => {
          entry.creditSales?.forEach((cs) => {
            // Filter by selected debtor if not "all"
            if (selectedDebtorId === 'all' || cs.debtorId === selectedDebtorId) {
              rows.push({
                date: entry.date,
                particulars: cs.debtorName,
                remarks: cs.remarks || '',
                debit: cs.amount,
                credit: 0,
              });
            }
          });
        });
        
        // Sort by date
        rows.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        break;

      case 'expenses':
        filteredEntries.forEach((entry) => {
          entry.expenses?.forEach((exp) => {
            rows.push({
              date: entry.date,
              particulars: exp.description,
              debit: exp.amount,
              credit: 0,
            });
          });
        });
        break;
    }

    return rows;
  }, [selectedLedger, entries, debtors, dateRange, selectedDebtorId]);

  const totals = useMemo(() => {
    return ledgerData.reduce(
      (acc, row) => ({
        debit: acc.debit + row.debit,
        credit: acc.credit + row.credit,
      }),
      { debit: 0, credit: 0 }
    );
  }, [ledgerData]);

  // Calculate running balance
  const dataWithBalance = useMemo(() => {
    let runningBalance = 0;
    return ledgerData.map((row) => {
      runningBalance += row.debit - row.credit;
      return { ...row, balance: runningBalance };
    });
  }, [ledgerData]);

  if (!selectedLedger) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Master Ledger</h1>
          <p className="text-muted-foreground">Select a ledger to view transactions (Tally Style)</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {ledgerTabs.map((tab) => (
            <Card
              key={tab.id}
              className="cursor-pointer hover:border-primary transition-colors"
              onClick={() => setSelectedLedger(tab.id)}
            >
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <BookOpen className="h-5 w-5 text-primary" />
                  {tab.label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{tab.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const currentTab = ledgerTabs.find((t) => t.id === selectedLedger);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Button variant="ghost" className="mb-2 -ml-2" onClick={() => {
            setSelectedLedger(null);
            setSelectedDebtorId('all');
          }}>
            ← Back to Ledgers
          </Button>
          <h1 className="text-2xl font-bold text-foreground">{currentTab?.label}</h1>
          <p className="text-muted-foreground">{currentTab?.description}</p>
        </div>
        
        {/* Export Buttons */}
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => exportToCSV(dataWithBalance, `${selectedLedger}-ledger`, selectedLedger === 'debtors')}
          >
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Export XLS
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => exportToPDF(currentTab?.label || '')}
          >
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-wrap items-center gap-4">
            {/* Debtor Filter - Only show for debtors ledger */}
            {selectedLedger === 'debtors' && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Account:</span>
                <Select value={selectedDebtorId} onValueChange={setSelectedDebtorId}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="All Debtors" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Debtors</SelectItem>
                    {debtors.map((debtor) => (
                      <SelectItem key={debtor.id} value={debtor.id}>
                        {debtor.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">From:</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-[180px] justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(dateRange.from, 'dd-MM-yyyy')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateRange.from}
                    onSelect={(date) => date && setDateRange((prev) => ({ ...prev, from: date }))}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">To:</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-[180px] justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(dateRange.to, 'dd-MM-yyyy')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateRange.to}
                    onSelect={(date) => date && setDateRange((prev) => ({ ...prev, to: date }))}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <Button
              variant="secondary"
              onClick={() => {
                const fy = getFYDates();
                setDateRange({ from: fy.start, to: fy.end });
              }}
            >
              Reset to FY
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Ledger Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[120px]">Date</TableHead>
                <TableHead>Particulars / Description</TableHead>
                {selectedLedger === 'debtors' && <TableHead>Remarks</TableHead>}
                <TableHead className="text-right w-[140px]">Debit (Out)</TableHead>
                <TableHead className="text-right w-[140px]">Credit (In)</TableHead>
                <TableHead className="text-right w-[140px]">Balance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dataWithBalance.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={selectedLedger === 'debtors' ? 6 : 5} className="text-center py-8 text-muted-foreground">
                    No transactions found in the selected date range.
                  </TableCell>
                </TableRow>
              ) : (
                dataWithBalance.map((row, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-mono">{format(parseISO(row.date), 'dd-MM-yyyy')}</TableCell>
                    <TableCell>{row.particulars}</TableCell>
                    {selectedLedger === 'debtors' && <TableCell className="text-muted-foreground">{row.remarks}</TableCell>}
                    <TableCell className="text-right font-mono">
                      {row.debit > 0 ? formatAmount(row.debit) : '-'}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {row.credit > 0 ? formatAmount(row.credit) : '-'}
                    </TableCell>
                    <TableCell className="text-right font-mono font-medium">
                      {formatAmount(row.balance)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
            {dataWithBalance.length > 0 && (
              <TableFooter>
                <TableRow className="bg-muted/50 font-bold">
                  <TableCell colSpan={selectedLedger === 'debtors' ? 3 : 2}>Total</TableCell>
                  <TableCell className="text-right font-mono">{formatAmount(totals.debit)}</TableCell>
                  <TableCell className="text-right font-mono">{formatAmount(totals.credit)}</TableCell>
                  <TableCell className="text-right font-mono text-primary">
                    {formatAmount(totals.debit - totals.credit)}
                  </TableCell>
                </TableRow>
              </TableFooter>
            )}
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
