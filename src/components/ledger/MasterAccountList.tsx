import { useMemo, useState } from 'react';
import { Search, ChevronRight, Users, Landmark, Receipt, Wallet } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatAmount } from '@/lib/format';
import { cn } from '@/lib/utils';

// Account type definitions
export type AccountType = 'Debtor' | 'Bank' | 'Expense' | 'Cash' | 'Partner' | 'Creditor';

export interface MasterAccount {
  id: string;
  name: string;
  type: AccountType;
  balance: number;
  subtitle?: string;
}

interface MasterAccountListProps {
  accounts: MasterAccount[];
  onAccountClick: (account: MasterAccount) => void;
}

const typeIcons: Record<AccountType, React.ComponentType<{ className?: string }>> = {
  Debtor: Users,
  Bank: Landmark,
  Expense: Receipt,
  Cash: Wallet,
  Partner: Users,
  Creditor: Users,
};

const typeColors: Record<AccountType, string> = {
  Debtor: 'text-orange-600 bg-orange-100',
  Bank: 'text-blue-600 bg-blue-100',
  Expense: 'text-red-600 bg-red-100',
  Cash: 'text-green-600 bg-green-100',
  Partner: 'text-purple-600 bg-purple-100',
  Creditor: 'text-indigo-600 bg-indigo-100',
};

export function MasterAccountList({ accounts, onAccountClick }: MasterAccountListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<AccountType | 'All'>('All');

  // Get unique account types for filter
  const accountTypes = useMemo(() => {
    const types = new Set<AccountType>();
    accounts.forEach(a => types.add(a.type));
    return Array.from(types);
  }, [accounts]);

  // Filter accounts
  const filteredAccounts = useMemo(() => {
    return accounts.filter(account => {
      const matchesSearch = searchQuery.trim() === '' || 
        account.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        account.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (account.subtitle && account.subtitle.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesType = typeFilter === 'All' || account.type === typeFilter;
      
      return matchesSearch && matchesType;
    });
  }, [accounts, searchQuery, typeFilter]);

  // Calculate totals
  const totals = useMemo(() => {
    return filteredAccounts.reduce(
      (acc, account) => ({
        debit: acc.debit + (account.balance > 0 ? account.balance : 0),
        credit: acc.credit + (account.balance < 0 ? Math.abs(account.balance) : 0),
      }),
      { debit: 0, credit: 0 }
    );
  }, [filteredAccounts]);

  return (
    <div className="space-y-4">
      {/* Search and Type Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by Account Name or Type..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setTypeFilter('All')}
            className={cn(
              "px-3 py-1.5 text-sm rounded-full border transition-colors",
              typeFilter === 'All' 
                ? "bg-primary text-primary-foreground border-primary" 
                : "bg-background hover:bg-muted border-border"
            )}
          >
            All
          </button>
          {accountTypes.map(type => {
            const Icon = typeIcons[type];
            return (
              <button
                key={type}
                onClick={() => setTypeFilter(type)}
                className={cn(
                  "px-3 py-1.5 text-sm rounded-full border transition-colors flex items-center gap-1.5",
                  typeFilter === type
                    ? typeColors[type] + " border-current"
                    : "bg-background hover:bg-muted border-border"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {type}
              </button>
            );
          })}
        </div>
      </div>

      {/* Results Count */}
      <p className="text-sm text-muted-foreground">
        Showing {filteredAccounts.length} of {accounts.length} accounts
      </p>

      {/* Master Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-[40%]">Account Name</TableHead>
                  <TableHead className="w-[20%]">Account Type</TableHead>
                  <TableHead className="text-right w-[20%]">Current Balance</TableHead>
                  <TableHead className="w-[5%]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAccounts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      {searchQuery || typeFilter !== 'All' 
                        ? 'No accounts match your search criteria.' 
                        : 'No accounts found. Start by adding debtors or recording transactions.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAccounts.map((account) => {
                    const Icon = typeIcons[account.type];
                    return (
                      <TableRow
                        key={account.id}
                        className="cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => onAccountClick(account)}
                      >
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">{account.name}</span>
                            {account.subtitle && (
                              <span className="text-xs text-muted-foreground">{account.subtitle}</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className={cn(
                            "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium",
                            typeColors[account.type]
                          )}>
                            <Icon className="h-3 w-3" />
                            {account.type}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex flex-col items-end">
                            <span className={cn(
                              "font-mono font-medium",
                              account.balance >= 0 ? 'text-foreground' : 'text-red-600'
                            )}>
                              {formatAmount(Math.abs(account.balance))}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {account.balance >= 0 ? 'Dr' : 'Cr'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
          
          {/* Totals Footer */}
          {filteredAccounts.length > 0 && (
            <div className="border-t bg-muted/50 px-4 py-3 flex justify-between items-center">
              <span className="font-medium text-sm">Totals</span>
              <div className="flex gap-8 text-sm">
                <span>
                  <span className="text-muted-foreground mr-2">Debit:</span>
                  <span className="font-mono font-medium">{formatAmount(totals.debit)}</span>
                </span>
                <span>
                  <span className="text-muted-foreground mr-2">Credit:</span>
                  <span className="font-mono font-medium text-red-600">{formatAmount(totals.credit)}</span>
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
