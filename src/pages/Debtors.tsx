import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { 
  BookUser, 
  Plus, 
  Phone,
  IndianRupee,
  ArrowDownCircle,
  ArrowUpCircle,
  AlertCircle,
  Search,
  Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { usePetrolPumpStore } from '@/store/petrol-pump-store';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function Debtors() {
  const { toast } = useToast();
  const { 
    debtors, 
    debtorTransactions,
    shiftEntries,
    addDebtor, 
    deleteDebtor,
    addDebtorTransaction
  } = usePetrolPumpStore();
  
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [newDebtor, setNewDebtor] = useState({ name: '', phone: '' });
  const [selectedDebtorId, setSelectedDebtorId] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentDescription, setPaymentDescription] = useState('');

  // Calculate total outstanding
  const totalOutstanding = useMemo(() => {
    return debtors.reduce((sum, d) => sum + d.totalDue, 0);
  }, [debtors]);

  // Get credit sales from shift entries that aren't linked to debtors yet
  const unlinkedCreditSales = useMemo(() => {
    // Get all shift entries with credit sales > 0
    return shiftEntries
      .filter((e) => e.creditSales > 0)
      .map((e) => ({
        shiftEntryId: e.id,
        date: e.businessDate,
        amount: e.creditSales,
        staffName: e.staffName,
        // Check if this shift entry is already linked
        isLinked: debtorTransactions.some((t) => t.shiftEntryId === e.id),
      }))
      .filter((e) => !e.isLinked);
  }, [shiftEntries, debtorTransactions]);

  // Filter debtors by search
  const filteredDebtors = useMemo(() => {
    if (!searchQuery) return debtors;
    const query = searchQuery.toLowerCase();
    return debtors.filter((d) => 
      d.name.toLowerCase().includes(query) ||
      d.phone?.toLowerCase().includes(query)
    );
  }, [debtors, searchQuery]);

  // Get transactions for selected debtor
  const selectedDebtorTransactions = useMemo(() => {
    if (!selectedDebtorId) return [];
    return debtorTransactions
      .filter((t) => t.debtorId === selectedDebtorId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [selectedDebtorId, debtorTransactions]);

  const selectedDebtor = debtors.find((d) => d.id === selectedDebtorId);

  const handleAddDebtor = () => {
    if (!newDebtor.name.trim()) {
      toast({ title: 'Error', description: 'Please enter debtor name', variant: 'destructive' });
      return;
    }
    addDebtor(newDebtor.name.trim(), newDebtor.phone || undefined);
    setNewDebtor({ name: '', phone: '' });
    setIsAddDialogOpen(false);
    toast({ title: 'Debtor Added', description: `${newDebtor.name} has been added.` });
  };

  const handleAddPayment = () => {
    if (!selectedDebtorId || paymentAmount <= 0) {
      toast({ title: 'Error', description: 'Please enter a valid payment amount', variant: 'destructive' });
      return;
    }
    
    addDebtorTransaction({
      debtorId: selectedDebtorId,
      date: format(new Date(), 'yyyy-MM-dd'),
      type: 'payment',
      amount: paymentAmount,
      description: paymentDescription || 'Payment received',
    });
    
    setPaymentAmount(0);
    setPaymentDescription('');
    setIsPaymentDialogOpen(false);
    toast({ title: 'Payment Recorded', description: `Payment of ${formatCurrency(paymentAmount)} recorded.` });
  };

  const handleLinkCreditSale = (shiftEntry: typeof unlinkedCreditSales[0]) => {
    if (!selectedDebtorId) {
      toast({ title: 'Error', description: 'Please select a debtor first', variant: 'destructive' });
      return;
    }
    
    addDebtorTransaction({
      debtorId: selectedDebtorId,
      date: shiftEntry.date,
      type: 'credit',
      amount: shiftEntry.amount,
      description: `Credit sale by ${shiftEntry.staffName}`,
      shiftEntryId: shiftEntry.shiftEntryId,
      staffName: shiftEntry.staffName,
    });
    
    toast({ title: 'Credit Linked', description: `Credit sale of ${formatCurrency(shiftEntry.amount)} linked to ${selectedDebtor?.name}.` });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <BookUser className="w-7 h-7" />
            Debtor/Credit Accounts
          </h1>
          <p className="text-muted-foreground">Track customer credit and outstanding dues</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Debtor
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Debtor</DialogTitle>
              <DialogDescription>Add a customer for credit tracking</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={newDebtor.name}
                  onChange={(e) => setNewDebtor({ ...newDebtor, name: e.target.value })}
                  placeholder="Customer name"
                />
              </div>
              <div className="space-y-2">
                <Label>Phone (Optional)</Label>
                <Input
                  value={newDebtor.phone}
                  onChange={(e) => setNewDebtor({ ...newDebtor, phone: e.target.value })}
                  placeholder="Phone number"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleAddDebtor}>Add Debtor</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Total Outstanding Alert */}
      {totalOutstanding > 0 && (
        <Card className="bg-red-500/10 border-red-500/30">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-6 h-6 text-red-600" />
              <div>
                <p className="text-sm text-red-600 font-medium">Total Credit Outstanding</p>
                <p className="text-2xl font-bold text-red-600">{formatCurrency(totalOutstanding)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Unlinked Credit Sales Alert */}
      {unlinkedCreditSales.length > 0 && (
        <Card className="bg-amber-500/10 border-amber-500/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-amber-700 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Unlinked Credit Sales ({unlinkedCreditSales.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-3">
              These credit sales from shifts need to be linked to a debtor. Select a debtor below, then click on a sale to link it.
            </p>
            <div className="flex flex-wrap gap-2">
              {unlinkedCreditSales.slice(0, 5).map((sale) => (
                <Button
                  key={sale.shiftEntryId}
                  variant="outline"
                  size="sm"
                  onClick={() => selectedDebtorId && handleLinkCreditSale(sale)}
                  disabled={!selectedDebtorId}
                  className="text-xs"
                >
                  {format(new Date(sale.date), 'dd MMM')} - {formatCurrency(sale.amount)}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Debtor List */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookUser className="w-5 h-5" />
              Debtors
            </CardTitle>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search..."
                className="pl-9"
              />
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              <div className="space-y-2 pr-4">
                {filteredDebtors.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No debtors found
                  </p>
                ) : (
                  filteredDebtors.map((d) => (
                    <div
                      key={d.id}
                      onClick={() => setSelectedDebtorId(d.id)}
                      className={cn(
                        "p-3 rounded-lg border cursor-pointer transition-colors",
                        selectedDebtorId === d.id
                          ? "bg-primary/10 border-primary"
                          : "hover:bg-muted/50"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{d.name}</p>
                          {d.phone && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              {d.phone}
                            </p>
                          )}
                        </div>
                        <Badge variant={d.totalDue > 0 ? "destructive" : "secondary"}>
                          {formatCurrency(d.totalDue)}
                        </Badge>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Debtor Details & Transactions */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <IndianRupee className="w-5 h-5" />
                  {selectedDebtor ? selectedDebtor.name : 'Transaction Ledger'}
                </CardTitle>
                <CardDescription>
                  {selectedDebtor ? (
                    <span className={selectedDebtor.totalDue > 0 ? 'text-red-600' : 'text-emerald-600'}>
                      Balance: {formatCurrency(selectedDebtor.totalDue)}
                    </span>
                  ) : (
                    'Select a debtor to view transactions'
                  )}
                </CardDescription>
              </div>
              {selectedDebtor && (
                <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <ArrowDownCircle className="w-4 h-4 mr-2" />
                      Record Payment
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Record Payment from {selectedDebtor.name}</DialogTitle>
                      <DialogDescription>Current Due: {formatCurrency(selectedDebtor.totalDue)}</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Amount (₹)</Label>
                        <Input
                          type="number"
                          value={paymentAmount || ''}
                          onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                          placeholder="0"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Description (Optional)</Label>
                        <Input
                          value={paymentDescription}
                          onChange={(e) => setPaymentDescription(e.target.value)}
                          placeholder="e.g., Cash payment"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsPaymentDialogOpen(false)}>Cancel</Button>
                      <Button onClick={handleAddPayment}>Record Payment</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {!selectedDebtor ? (
              <div className="text-center py-12 text-muted-foreground">
                Select a debtor to view their transaction history
              </div>
            ) : selectedDebtorTransactions.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No transactions yet
              </div>
            ) : (
              <ScrollArea className="h-[400px]">
                <div className="space-y-3 pr-4">
                  {selectedDebtorTransactions.map((t) => (
                    <div
                      key={t.id}
                      className={cn(
                        "flex items-center justify-between p-3 rounded-lg border",
                        t.type === 'credit' ? 'bg-red-500/5 border-red-500/20' : 'bg-emerald-500/5 border-emerald-500/20'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        {t.type === 'credit' ? (
                          <ArrowUpCircle className="w-5 h-5 text-red-600" />
                        ) : (
                          <ArrowDownCircle className="w-5 h-5 text-emerald-600" />
                        )}
                        <div>
                          <p className="font-medium text-sm">{t.description}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(t.date), 'dd MMM yyyy')}
                            {t.staffName && ` • ${t.staffName}`}
                          </p>
                        </div>
                      </div>
                      <span className={cn(
                        "font-mono font-semibold",
                        t.type === 'credit' ? 'text-red-600' : 'text-emerald-600'
                      )}>
                        {t.type === 'credit' ? '+' : '-'}{formatCurrency(t.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}