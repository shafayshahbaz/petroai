import { useState, useMemo } from 'react';
import { format, parseISO, isWithinInterval } from 'date-fns';
import { 
  Calendar as CalendarIcon, 
  BookOpen, 
  Download, 
  FileSpreadsheet,
  ArrowLeft,
  Users,
  Landmark,
  Wallet,
  Receipt,
  Plus,
  ArrowDownToLine,
  ArrowUpFromLine,
  Search,
  List,
  LayoutGrid
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useCloudData, CloudDailyEntry } from '@/contexts/CloudDataContext';
import { cn } from '@/lib/utils';
import { formatAmount } from '@/lib/format';
import { useLanguage } from '@/contexts/LanguageContext';
import { AccountGroupCard } from '@/components/ledger/AccountGroupCard';
import { AccountListItem } from '@/components/ledger/AccountListItem';
import { LedgerTransactionTable, LedgerTransaction } from '@/components/ledger/LedgerTransactionTable';
import { PaymentReceiptModal } from '@/components/ledger/PaymentReceiptModal';
import { BankActionModal } from '@/components/ledger/BankActionModal';
import { MasterAccountList, MasterAccount, AccountType } from '@/components/ledger/MasterAccountList';
import { toast } from 'sonner';
import { DailyEntry, FuelType } from '@/types/petrol-pump';

// Account group types
type AccountGroup = 'debtors' | 'bank' | 'expenses' | 'cash';
type ViewMode = 'master' | 'groups' | 'accounts' | 'ledger';

// Get current financial year dates (April 1 - March 31)
function getFYDates() {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const fyStartYear = currentMonth < 3 ? currentYear - 1 : currentYear;
  
  return {
    start: new Date(fyStartYear, 3, 1),
    end: new Date(fyStartYear + 1, 2, 31),
  };
}

// Helper to convert cloud entry to local format
function cloudToLocalEntry(cloudEntry: CloudDailyEntry): DailyEntry {
  return {
    id: cloudEntry.id,
    date: cloudEntry.date,
    shiftName: cloudEntry.shift_name || undefined,
    fuelRates: cloudEntry.fuel_rates as Record<FuelType, number>,
    nozzles: cloudEntry.nozzles as any[],
    lubeItems: cloudEntry.lube_items as any[],
    expenses: cloudEntry.expenses as any[],
    incomes: cloudEntry.incomes as any[],
    creditSales: cloudEntry.credit_sales as any[],
    upiCollection: cloudEntry.upi_collection,
    cashDeposit: cloudEntry.cash_deposit,
    openingBalance: cloudEntry.opening_balance,
    testingDeduction: cloudEntry.testing_deduction as Record<FuelType, number>,
    createdAt: cloudEntry.created_at,
    updatedAt: cloudEntry.updated_at,
  };
}

// Export to CSV
function exportToCSV(data: (LedgerTransaction & { balance: number })[], filename: string, showRemarks: boolean) {
  const headers = showRemarks 
    ? ['Date', 'Particulars', 'Remarks', 'Debit', 'Credit', 'Balance']
    : ['Date', 'Particulars', 'Debit', 'Credit', 'Balance'];
  
  const csvContent = [
    headers.join(','),
    ...data.map(row => {
      const values = showRemarks 
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

export default function Ledger() {
  const { dailyEntries: cloudEntries, debtors: cloudDebtors, updateDebtor } = useCloudData();
  const { t } = useLanguage();
  const fyDates = getFYDates();

  // Convert cloud data to local format
  const entries = useMemo(() => cloudEntries.map(cloudToLocalEntry), [cloudEntries]);
  const debtors = useMemo(() => cloudDebtors.map(d => ({
    id: d.id,
    name: d.name,
    contactNumber: d.contact_number || undefined,
    openingBalance: d.opening_balance,
    totalOutstanding: d.total_outstanding,
  })), [cloudDebtors]);
  
  // Navigation state - default to master view
  const [viewMode, setViewMode] = useState<ViewMode>('master');
  const [selectedGroup, setSelectedGroup] = useState<AccountGroup | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [selectedAccountName, setSelectedAccountName] = useState<string>('');
  
  // Date filter
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: fyDates.start,
    to: fyDates.end,
  });

  // Modal state
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [bankActionModalOpen, setBankActionModalOpen] = useState(false);
  const [bankActionType, setBankActionType] = useState<'deposit' | 'withdrawal'>('deposit');
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  
  // Ledger search state for transaction filtering (must be before any early returns)
  const [ledgerSearchQuery, setLedgerSearchQuery] = useState('');
  // Calculate group summaries
  const groupSummaries = useMemo(() => {
    // Debtors - total outstanding
    const debtorBalance = debtors.reduce((sum, d) => sum + (d.totalOutstanding || 0), 0);
    
    // Bank - total deposits from entries
    const bankBalance = entries.reduce((sum, e) => sum + (e.cashDeposit || 0), 0);
    
    // Expenses - total expenses
    const expenseBalance = entries.reduce((sum, e) => {
      return sum + (e.expenses?.reduce((s, exp) => s + exp.amount, 0) || 0);
    }, 0);
    
    // Cash - current cash in hand (from last entry)
    const sortedEntries = [...entries].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    let cashBalance = 0;
    if (sortedEntries.length > 0) {
      const lastEntry = sortedEntries[0];
      // Calculate from last entry
      const fuelSales = lastEntry.nozzles?.reduce((sum, n) => {
        const liters = n.closingReading - n.openingReading;
        const rate = lastEntry.fuelRates?.[n.fuelType] || 0;
        return sum + (liters * rate);
      }, 0) || 0;
      const lubeSales = lastEntry.lubeItems?.reduce((sum, l) => sum + (l.quantity * l.rate), 0) || 0;
      const incomes = lastEntry.incomes?.reduce((sum, i) => sum + i.amount, 0) || 0;
      const expenses = lastEntry.expenses?.reduce((sum, e) => sum + e.amount, 0) || 0;
      const creditSales = lastEntry.creditSales?.reduce((sum, c) => sum + c.amount, 0) || 0;
      
      cashBalance = (lastEntry.openingBalance || 0) + fuelSales + lubeSales + incomes 
        - expenses - (lastEntry.cashDeposit || 0) - (lastEntry.upiCollection || 0) - creditSales;
    }

    return {
      debtors: { balance: debtorBalance, count: debtors.length },
      bank: { balance: bankBalance, count: 1 }, // Single bank account for now
      expenses: { balance: expenseBalance, count: getUniqueExpenseHeads().length },
      cash: { balance: cashBalance, count: 1 },
    };
  }, [entries, debtors]);

  // Get unique expense heads
  function getUniqueExpenseHeads() {
    const heads = new Set<string>();
    entries.forEach(e => {
      e.expenses?.forEach(exp => heads.add(exp.description));
    });
    return Array.from(heads);
  }

  // Build unified Master Account list (all accounts in one view)
  const masterAccounts = useMemo<MasterAccount[]>(() => {
    const accounts: MasterAccount[] = [];

    // Add all debtors
    debtors.forEach(debtor => {
      accounts.push({
        id: debtor.id,
        name: debtor.name,
        type: 'Debtor' as AccountType,
        balance: debtor.totalOutstanding || 0,
        subtitle: debtor.contactNumber,
      });
    });

    // Add bank account
    accounts.push({
      id: 'main-bank',
      name: 'Main Bank Account',
      type: 'Bank' as AccountType,
      balance: groupSummaries.bank.balance,
      subtitle: 'All bank deposits',
    });

    // Add expense heads
    getUniqueExpenseHeads().forEach(head => {
      const total = entries.reduce((sum, e) => {
        return sum + (e.expenses?.filter(exp => exp.description === head)
          .reduce((s, exp) => s + exp.amount, 0) || 0);
      }, 0);
      accounts.push({
        id: `expense-${head}`,
        name: head,
        type: 'Expense' as AccountType,
        balance: total,
      });
    });

    // Add cash account
    accounts.push({
      id: 'cash',
      name: 'Cash Account',
      type: 'Cash' as AccountType,
      balance: groupSummaries.cash.balance,
      subtitle: 'Daily cash movements',
    });

    return accounts;
  }, [debtors, entries, groupSummaries]);

  // Get ledger transactions based on selection
  const ledgerData = useMemo(() => {
    if (!selectedGroup || !selectedAccountId) return [];

    const rows: LedgerTransaction[] = [];
    
    const filteredEntries = entries.filter((entry) => {
      const entryDate = parseISO(entry.date);
      return isWithinInterval(entryDate, { start: dateRange.from, end: dateRange.to });
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    switch (selectedGroup) {
      case 'debtors':
        // Credit sales for this debtor
        filteredEntries.forEach((entry) => {
          entry.creditSales?.forEach((cs) => {
            if (cs.debtorId === selectedAccountId) {
              rows.push({
                id: cs.id,
                date: entry.date,
                particulars: `Credit Sale - ${entry.shiftName || 'Daily Entry'}`,
                remarks: cs.remarks || '',
                debit: cs.amount,
                credit: 0,
              });
            }
          });
        });
        break;

      case 'bank':
        // Bank deposits
        filteredEntries.forEach((entry) => {
          if (entry.cashDeposit > 0) {
            rows.push({
              id: entry.id + '-deposit',
              date: entry.date,
              particulars: `Cash Deposit - ${entry.shiftName || 'Daily Entry'}`,
              debit: entry.cashDeposit,
              credit: 0,
            });
          }
        });
        break;

      case 'expenses':
        // Expenses matching this head
        filteredEntries.forEach((entry) => {
          entry.expenses?.forEach((exp) => {
            if (exp.description === selectedAccountId) {
              rows.push({
                id: exp.id,
                date: entry.date,
                particulars: exp.description,
                debit: exp.amount,
                credit: 0,
              });
            }
          });
        });
        break;

      case 'cash':
        // All cash movements
        filteredEntries.forEach((entry) => {
          // Fuel Sales
          const fuelSales = entry.nozzles?.reduce((sum, n) => {
            const liters = Math.max(0, n.closingReading - n.openingReading);
            const rate = entry.fuelRates?.[n.fuelType] || 0;
            return sum + (liters * rate);
          }, 0) || 0;
          
          if (fuelSales > 0) {
            rows.push({
              id: entry.id + '-fuel',
              date: entry.date,
              particulars: 'Fuel Sales',
              debit: fuelSales,
              credit: 0,
            });
          }

          // Lube Sales
          const lubeSales = entry.lubeItems?.reduce((sum, l) => sum + (l.quantity * l.rate), 0) || 0;
          if (lubeSales > 0) {
            rows.push({
              id: entry.id + '-lube',
              date: entry.date,
              particulars: 'Lube Sales',
              debit: lubeSales,
              credit: 0,
            });
          }

          // Other Income
          entry.incomes?.forEach((inc) => {
            rows.push({
              id: inc.id,
              date: entry.date,
              particulars: `Income: ${inc.description}`,
              debit: inc.amount,
              credit: 0,
            });
          });

          // Expenses (outflow)
          entry.expenses?.forEach((exp) => {
            rows.push({
              id: exp.id,
              date: entry.date,
              particulars: `Expense: ${exp.description}`,
              debit: 0,
              credit: exp.amount,
            });
          });

          // Bank Deposit
          if (entry.cashDeposit > 0) {
            rows.push({
              id: entry.id + '-bank',
              date: entry.date,
              particulars: 'Bank Deposit',
              debit: 0,
              credit: entry.cashDeposit,
            });
          }

          // UPI Collection
          if (entry.upiCollection > 0) {
            rows.push({
              id: entry.id + '-upi',
              date: entry.date,
              particulars: 'UPI Collection',
              debit: 0,
              credit: entry.upiCollection,
            });
          }

          // Credit Sales
          entry.creditSales?.forEach((cs) => {
            rows.push({
              id: cs.id + '-cash',
              date: entry.date,
              particulars: `Credit Sale: ${cs.debtorName}`,
              debit: 0,
              credit: cs.amount,
            });
          });
        });
        break;
    }

    return rows;
  }, [selectedGroup, selectedAccountId, entries, dateRange]);

  // Filter ledger data based on search query (searches all columns)
  // Must be defined before early returns
  const filteredLedgerData = useMemo(() => {
    if (!ledgerSearchQuery.trim()) return ledgerData;
    
    const query = ledgerSearchQuery.toLowerCase();
    return ledgerData.filter(row => 
      row.date.includes(query) ||
      row.particulars.toLowerCase().includes(query) ||
      (row.remarks && row.remarks.toLowerCase().includes(query)) ||
      row.debit.toString().includes(query) ||
      row.credit.toString().includes(query)
    );
  }, [ledgerData, ledgerSearchQuery]);

  // Get opening balance for selected account
  const openingBalance = useMemo(() => {
    if (selectedGroup === 'debtors' && selectedAccountId) {
      const debtor = debtors.find(d => d.id === selectedAccountId);
      return debtor?.openingBalance || 0;
    }
    return 0;
  }, [selectedGroup, selectedAccountId, debtors]);

  // Navigation handlers
  const navigateToGroup = (group: AccountGroup) => {
    setSelectedGroup(group);
    setViewMode('accounts');
  };

  const navigateToLedger = (accountId: string, accountName: string, group?: AccountGroup) => {
    setSelectedAccountId(accountId);
    setSelectedAccountName(accountName);
    if (group) {
      setSelectedGroup(group);
    }
    setViewMode('ledger');
  };

  // Handle master account click - navigate directly to ledger
  const handleMasterAccountClick = (account: MasterAccount) => {
    let group: AccountGroup;
    let accountId = account.id;
    
    switch (account.type) {
      case 'Debtor':
        group = 'debtors';
        break;
      case 'Bank':
        group = 'bank';
        break;
      case 'Expense':
        group = 'expenses';
        // Extract original expense head name from ID
        accountId = account.name;
        break;
      case 'Cash':
        group = 'cash';
        break;
      default:
        group = 'debtors';
    }
    
    setSelectedGroup(group);
    navigateToLedger(accountId, account.name, group);
  };

  const goBack = () => {
    if (viewMode === 'ledger') {
      // Go back to master view instead of accounts
      setViewMode('master');
      setSelectedAccountId(null);
      setSelectedAccountName('');
      setSelectedGroup(null);
    } else if (viewMode === 'accounts') {
      setViewMode('groups');
      setSelectedGroup(null);
    } else if (viewMode === 'groups') {
      setViewMode('master');
    }
  };

  // Handle payment receipt
  const handlePaymentReceipt = (data: {
    date: string;
    amount: number;
    paymentMode: string;
    remarks: string;
  }) => {
    if (!selectedAccountId) return;

    const debtor = debtors.find(d => d.id === selectedAccountId);
    if (debtor) {
      // Update debtor's outstanding balance in cloud
      updateDebtor(selectedAccountId, {
        total_outstanding: Math.max(0, (debtor.totalOutstanding || 0) - data.amount),
      });
      toast.success(`Receipt of ₹${formatAmount(data.amount)} recorded for ${debtor.name}`);
    }
  };

  // Handle bank actions
  const handleBankAction = (data: { date: string; amount: number; remarks: string }) => {
    toast.success(`${bankActionType === 'deposit' ? 'Deposit' : 'Withdrawal'} of ₹${formatAmount(data.amount)} recorded`);
    // Note: Actual bank transaction storage would require extending the data model
  };

  // Render Master View (Default - Tally Style All Accounts)
  if (viewMode === 'master') {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <BookOpen className="h-6 w-6 text-primary" />
              {t('ledger')}
            </h1>
            <p className="text-muted-foreground">Master Account Browser • All Accounts</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setViewMode('groups')}
              className="gap-2"
            >
              <LayoutGrid className="h-4 w-4" />
              Group View
            </Button>
          </div>
        </div>

        <MasterAccountList 
          accounts={masterAccounts}
          onAccountClick={handleMasterAccountClick}
        />
      </div>
    );
  }

  // Render Groups View
  if (viewMode === 'groups') {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <BookOpen className="h-6 w-6 text-primary" />
              {t('ledger')}
            </h1>
            <p className="text-muted-foreground">Account Groups • Tally Style</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setViewMode('master')}
              className="gap-2"
            >
              <List className="h-4 w-4" />
              Master List
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AccountGroupCard
            title="Debtors (Customers)"
            icon={Users}
            balance={groupSummaries.debtors.balance}
            accountCount={groupSummaries.debtors.count}
            onClick={() => navigateToGroup('debtors')}
            colorClass="bg-orange-100 text-orange-700"
          />
          <AccountGroupCard
            title="Bank Accounts"
            icon={Landmark}
            balance={groupSummaries.bank.balance}
            accountCount={groupSummaries.bank.count}
            onClick={() => navigateToGroup('bank')}
            colorClass="bg-blue-100 text-blue-700"
          />
          <AccountGroupCard
            title="Expense Heads"
            icon={Receipt}
            balance={groupSummaries.expenses.balance}
            accountCount={groupSummaries.expenses.count}
            onClick={() => navigateToGroup('expenses')}
            colorClass="bg-red-100 text-red-700"
          />
          <AccountGroupCard
            title="Cash Account"
            icon={Wallet}
            balance={groupSummaries.cash.balance}
            accountCount={1}
            onClick={() => navigateToGroup('cash')}
            colorClass="bg-green-100 text-green-700"
          />
        </div>
      </div>
    );
  }

  // Render Accounts List View
  if (viewMode === 'accounts' && selectedGroup) {
    const groupTitles: Record<AccountGroup, string> = {
      debtors: 'Debtors (Customers)',
      bank: 'Bank Accounts',
      expenses: 'Expense Heads',
      cash: 'Cash Account',
    };

    // Filter accounts based on search query
    const filteredDebtors = debtors.filter(d => 
      d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (d.contactNumber && d.contactNumber.includes(searchQuery))
    );
    const filteredExpenseHeads = getUniqueExpenseHeads().filter(h =>
      h.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <Button variant="ghost" className="mb-2 -ml-2 gap-2" onClick={goBack}>
            <ArrowLeft className="h-4 w-4" />
            {t('back')} to Ledger
          </Button>
          <h1 className="text-2xl font-bold text-foreground">{groupTitles[selectedGroup]}</h1>
          <p className="text-muted-foreground">Select an account to view transactions</p>
        </div>

        {/* Search Bar */}
        {(selectedGroup === 'debtors' || selectedGroup === 'expenses') && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={`Search ${selectedGroup === 'debtors' ? 'debtors' : 'expense heads'}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        )}

        <Card>
          <CardContent className="p-0">
            {selectedGroup === 'debtors' && (
              filteredDebtors.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  {searchQuery ? `No debtors matching "${searchQuery}"` : 'No debtors found. Add debtors from the Debtors page.'}
                </div>
              ) : (
                filteredDebtors.map((debtor) => (
                  <AccountListItem
                    key={debtor.id}
                    name={debtor.name}
                    balance={debtor.totalOutstanding || 0}
                    subtitle={debtor.contactNumber}
                    onClick={() => navigateToLedger(debtor.id, debtor.name)}
                  />
                ))
              )
            )}

            {selectedGroup === 'bank' && (
              <AccountListItem
                name="Main Bank Account"
                balance={groupSummaries.bank.balance}
                subtitle="All bank deposits"
                onClick={() => navigateToLedger('main-bank', 'Main Bank Account')}
              />
            )}

            {selectedGroup === 'expenses' && (
              filteredExpenseHeads.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  {searchQuery ? `No expense heads matching "${searchQuery}"` : 'No expenses recorded yet.'}
                </div>
              ) : (
                filteredExpenseHeads.map((head) => {
                  const total = entries.reduce((sum, e) => {
                    return sum + (e.expenses?.filter(exp => exp.description === head)
                      .reduce((s, exp) => s + exp.amount, 0) || 0);
                  }, 0);
                  return (
                    <AccountListItem
                      key={head}
                      name={head}
                      balance={total}
                      onClick={() => navigateToLedger(head, head)}
                    />
                  );
                })
              )
            )}

            {selectedGroup === 'cash' && (
              <AccountListItem
                name="Cash Account"
                balance={groupSummaries.cash.balance}
                subtitle="Daily cash movements"
                onClick={() => navigateToLedger('cash', 'Cash Account')}
              />
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Render Individual Ledger View
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Button variant="ghost" className="mb-2 -ml-2 gap-2" onClick={goBack}>
            <ArrowLeft className="h-4 w-4" />
            {t('back')} to Master Ledger
          </Button>
          <h1 className="text-2xl font-bold text-foreground">{selectedAccountName}</h1>
          <p className="text-muted-foreground">Ledger Account • Transaction History</p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {/* Action Buttons based on account type */}
          {selectedGroup === 'debtors' && (
            <Button onClick={() => setPaymentModalOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Receipt
            </Button>
          )}
          
          {selectedGroup === 'bank' && (
            <>
              <Button 
                variant="outline" 
                className="gap-2"
                onClick={() => {
                  setBankActionType('deposit');
                  setBankActionModalOpen(true);
                }}
              >
                <ArrowDownToLine className="h-4 w-4" />
                Cash Deposit
              </Button>
              <Button 
                variant="outline" 
                className="gap-2"
                onClick={() => {
                  setBankActionType('withdrawal');
                  setBankActionModalOpen(true);
                }}
              >
                <ArrowUpFromLine className="h-4 w-4" />
                Cash Withdrawal
              </Button>
            </>
          )}

          <Button 
            variant="outline" 
            size="sm"
            onClick={() => {
              let runningBalance = openingBalance;
              const dataWithBalance = filteredLedgerData.map((row) => {
                runningBalance += row.debit - row.credit;
                return { ...row, balance: runningBalance };
              });
              exportToCSV(dataWithBalance, `${selectedAccountName}-ledger`, selectedGroup === 'debtors');
            }}
          >
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Export XLS
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => window.print()}
          >
            <Download className="h-4 w-4 mr-2" />
            Print {ledgerSearchQuery ? 'Filtered' : ''} View
          </Button>
        </div>
      </div>

      {/* Date Filters and Search */}
      <Card>
        <CardContent className="py-4 space-y-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">From:</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-[140px] justify-start text-left font-normal">
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
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">To:</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-[140px] justify-start text-left font-normal">
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
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                const fy = getFYDates();
                setDateRange({ from: fy.start, to: fy.end });
              }}
            >
              Reset to FY
            </Button>
          </div>

          {/* Universal Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by date, particulars, remarks, or amount..."
              value={ledgerSearchQuery}
              onChange={(e) => setLedgerSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          {ledgerSearchQuery && (
            <div className="text-sm text-muted-foreground">
              Showing {filteredLedgerData.length} of {ledgerData.length} transactions
              {filteredLedgerData.length > 0 && ' • Print/Export will use filtered data'}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Ledger Table */}
      <LedgerTransactionTable
        transactions={filteredLedgerData}
        showRemarks={selectedGroup === 'debtors'}
        openingBalance={openingBalance}
      />

      {/* Payment Receipt Modal */}
      <PaymentReceiptModal
        open={paymentModalOpen}
        onOpenChange={setPaymentModalOpen}
        debtorName={selectedAccountName}
        onSubmit={handlePaymentReceipt}
      />

      {/* Bank Action Modal */}
      <BankActionModal
        open={bankActionModalOpen}
        onOpenChange={setBankActionModalOpen}
        actionType={bankActionType}
        bankName={selectedAccountName}
        onSubmit={handleBankAction}
      />
    </div>
  );
}
