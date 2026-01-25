import { useState, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { 
  Wallet, 
  Plus, 
  CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Users,
  Building2,
  Receipt,
  Trash2,
  Filter
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { usePetrolPumpStore } from '@/store/petrol-pump-store';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const EXPENSE_CATEGORIES = [
  'Staff/Tea',
  'Maintenance',
  'Utilities',
  'Transport',
  'Supplies',
  'Miscellaneous',
];

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

interface CombinedExpense {
  id: string;
  date: string;
  description: string;
  amount: number;
  category?: string;
  source: 'shift' | 'office';
  staffName?: string;
}

export default function Expenses() {
  const { toast } = useToast();
  const { 
    shiftEntries,
    officeExpenses,
    addOfficeExpense,
    deleteOfficeExpense
  } = usePetrolPumpStore();
  
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterSource, setFilterSource] = useState<string>('all');
  
  const [newExpense, setNewExpense] = useState({
    date: new Date(),
    category: 'Miscellaneous',
    description: '',
    amount: 0,
  });

  const monthStart = startOfMonth(selectedMonth);
  const monthEnd = endOfMonth(selectedMonth);

  // Combine shift expenses and office expenses
  const allExpenses: CombinedExpense[] = useMemo(() => {
    const expenses: CombinedExpense[] = [];

    // Add shift expenses
    shiftEntries.forEach((entry) => {
      if (entry.expenses > 0) {
        const entryDate = new Date(entry.businessDate);
        if (isWithinInterval(entryDate, { start: monthStart, end: monthEnd })) {
          expenses.push({
            id: `shift-${entry.id}`,
            date: entry.businessDate,
            description: `Shift expense by ${entry.staffName}`,
            amount: entry.expenses,
            source: 'shift',
            staffName: entry.staffName,
          });
        }
      }
    });

    // Add office expenses
    officeExpenses.forEach((exp) => {
      const expDate = new Date(exp.date);
      if (isWithinInterval(expDate, { start: monthStart, end: monthEnd })) {
        expenses.push({
          id: exp.id,
          date: exp.date,
          description: exp.description,
          amount: exp.amount,
          category: exp.category,
          source: 'office',
        });
      }
    });

    // Sort by date descending
    return expenses.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [shiftEntries, officeExpenses, monthStart, monthEnd]);

  // Apply filters
  const filteredExpenses = useMemo(() => {
    return allExpenses.filter((exp) => {
      if (filterSource !== 'all' && exp.source !== filterSource) return false;
      if (filterCategory !== 'all' && exp.category !== filterCategory) return false;
      return true;
    });
  }, [allExpenses, filterSource, filterCategory]);

  // Calculate totals
  const totals = useMemo(() => {
    const shiftTotal = allExpenses
      .filter((e) => e.source === 'shift')
      .reduce((sum, e) => sum + e.amount, 0);
    
    const officeTotal = allExpenses
      .filter((e) => e.source === 'office')
      .reduce((sum, e) => sum + e.amount, 0);
    
    const categoryTotals: Record<string, number> = {};
    allExpenses.forEach((exp) => {
      const cat = exp.category || 'Uncategorized';
      categoryTotals[cat] = (categoryTotals[cat] || 0) + exp.amount;
    });

    return {
      shiftTotal,
      officeTotal,
      grandTotal: shiftTotal + officeTotal,
      categoryTotals,
    };
  }, [allExpenses]);

  const handleAddExpense = () => {
    if (!newExpense.description.trim()) {
      toast({ title: 'Error', description: 'Please enter a description', variant: 'destructive' });
      return;
    }
    if (newExpense.amount <= 0) {
      toast({ title: 'Error', description: 'Please enter a valid amount', variant: 'destructive' });
      return;
    }

    addOfficeExpense({
      date: format(newExpense.date, 'yyyy-MM-dd'),
      category: newExpense.category,
      description: newExpense.description,
      amount: newExpense.amount,
    });

    setNewExpense({
      date: new Date(),
      category: 'Miscellaneous',
      description: '',
      amount: 0,
    });
    setIsAddDialogOpen(false);
    toast({ title: 'Expense Added', description: 'Office expense has been recorded.' });
  };

  const handleDeleteExpense = (id: string) => {
    deleteOfficeExpense(id);
    toast({ title: 'Expense Deleted', description: 'Expense has been removed.' });
  };

  const navigateMonth = (direction: number) => {
    const newDate = new Date(selectedMonth);
    newDate.setMonth(newDate.getMonth() + direction);
    setSelectedMonth(newDate);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Wallet className="w-7 h-7" />
            Expenses
          </h1>
          <p className="text-muted-foreground">Track and manage all expenses</p>
        </div>
        <div className="flex gap-2">
          <div className="flex items-center gap-2 bg-muted rounded-lg px-2">
            <Button variant="ghost" size="icon" onClick={() => navigateMonth(-1)}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="font-medium min-w-[120px] text-center text-sm">
              {format(selectedMonth, 'MMMM yyyy')}
            </span>
            <Button variant="ghost" size="icon" onClick={() => navigateMonth(1)}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Expense
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Office Expense</DialogTitle>
                <DialogDescription>Record a new office/manager expense</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {format(newExpense.date, 'PPP')}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={newExpense.date}
                        onSelect={(date) => date && setNewExpense({ ...newExpense, date })}
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select
                    value={newExpense.category}
                    onValueChange={(value) => setNewExpense({ ...newExpense, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {EXPENSE_CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Input
                    value={newExpense.description}
                    onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                    placeholder="What was the expense for?"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Amount (₹)</Label>
                  <Input
                    type="number"
                    value={newExpense.amount || ''}
                    onChange={(e) => setNewExpense({ ...newExpense, amount: parseFloat(e.target.value) || 0 })}
                    placeholder="0"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleAddExpense}>Add Expense</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-amber-500/10">
                <Users className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Shift Expenses</p>
                <p className="text-xl font-bold">{formatCurrency(totals.shiftTotal)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-blue-500/10">
                <Building2 className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Office Expenses</p>
                <p className="text-xl font-bold">{formatCurrency(totals.officeTotal)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-primary/10">
                <Receipt className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Expenses</p>
                <p className="text-xl font-bold text-primary">{formatCurrency(totals.grandTotal)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Category Breakdown */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-sm">By Category</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(totals.categoryTotals)
              .sort((a, b) => b[1] - a[1])
              .map(([category, amount]) => (
                <div key={category} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{category}</span>
                  <span className="font-mono font-medium">{formatCurrency(amount)}</span>
                </div>
              ))}
            {Object.keys(totals.categoryTotals).length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-2">No expenses this month</p>
            )}
          </CardContent>
        </Card>

        {/* Expense List */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <CardTitle className="flex items-center gap-2">
                <Receipt className="w-5 h-5" />
                Expense List
              </CardTitle>
              <div className="flex gap-2">
                <Select value={filterSource} onValueChange={setFilterSource}>
                  <SelectTrigger className="w-[130px]">
                    <Filter className="w-3 h-3 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sources</SelectItem>
                    <SelectItem value="shift">Shift Only</SelectItem>
                    <SelectItem value="office">Office Only</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterCategory} onValueChange={setFilterCategory}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {EXPENSE_CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              <div className="space-y-2 pr-4">
                {filteredExpenses.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No expenses found for this period
                  </p>
                ) : (
                  filteredExpenses.map((exp) => (
                    <div
                      key={exp.id}
                      className={cn(
                        "flex items-center justify-between p-3 rounded-lg border",
                        exp.source === 'shift' ? 'bg-amber-500/5 border-amber-500/20' : 'bg-blue-500/5 border-blue-500/20'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        {exp.source === 'shift' ? (
                          <Users className="w-4 h-4 text-amber-600" />
                        ) : (
                          <Building2 className="w-4 h-4 text-blue-600" />
                        )}
                        <div>
                          <p className="font-medium text-sm">{exp.description}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{format(new Date(exp.date), 'dd MMM yyyy')}</span>
                            {exp.category && (
                              <>
                                <span>•</span>
                                <Badge variant="outline" className="text-xs py-0">
                                  {exp.category}
                                </Badge>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-semibold">{formatCurrency(exp.amount)}</span>
                        {exp.source === 'office' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-red-600"
                            onClick={() => handleDeleteExpense(exp.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}