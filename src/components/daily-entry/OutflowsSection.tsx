import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { usePetrolPumpStore } from '@/store/petrol-pump-store';
import { DailyTotals } from '@/types/petrol-pump';

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(amount);
}

interface OutflowsSectionProps {
  totals: DailyTotals;
}

export function OutflowsSection({ totals }: OutflowsSectionProps) {
  const [newExpense, setNewExpense] = useState({ description: '', amount: '' });
  const [newCredit, setNewCredit] = useState({ customerName: '', amount: '' });
  
  const { 
    currentEntry, 
    addExpense, 
    removeExpense, 
    updateExpense,
    addCredit,
    removeCredit,
    updateCredit,
    updatePayments,
  } = usePetrolPumpStore();

  if (!currentEntry) return null;

  const handleAddExpense = () => {
    if (newExpense.description && newExpense.amount) {
      addExpense({ description: newExpense.description, amount: parseFloat(newExpense.amount) || 0 });
      setNewExpense({ description: '', amount: '' });
    }
  };

  const handleAddCredit = () => {
    if (newCredit.customerName && newCredit.amount) {
      addCredit({ customerName: newCredit.customerName, amount: parseFloat(newCredit.amount) || 0 });
      setNewCredit({ customerName: '', amount: '' });
    }
  };

  return (
    <Card className="border-destructive/30">
      <CardHeader className="bg-destructive/5">
        <CardTitle className="text-destructive flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-destructive" />
          OUTFLOWS (Money Going Out)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        {/* Expenses */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="font-medium text-sm">Expenses</span>
            <span className="font-mono text-sm">{formatCurrency(totals.totalExpenses)}</span>
          </div>
          
          {/* Expense Items List */}
          {(currentEntry.expenses || []).map((expense) => (
            <div key={expense.id} className="flex items-center gap-2 text-sm pl-4">
              <Input
                value={expense.description}
                onChange={(e) => updateExpense(expense.id, { description: e.target.value })}
                className="h-8 flex-1"
                placeholder="Description"
              />
              <Input
                type="number"
                value={expense.amount || ''}
                onChange={(e) => updateExpense(expense.id, { amount: parseFloat(e.target.value) || 0 })}
                className="h-8 w-28 text-right"
                placeholder="Amount"
              />
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8"
                onClick={() => removeExpense(expense.id)}
              >
                <Trash2 className="w-3 h-3 text-destructive" />
              </Button>
            </div>
          ))}
          
          {/* Add Expense Form */}
          <div className="flex items-center gap-2 text-sm pl-4">
            <Input
              value={newExpense.description}
              onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
              className="h-8 flex-1"
              placeholder="Add expense (Staff, Tea, etc.)"
              onKeyPress={(e) => e.key === 'Enter' && handleAddExpense()}
            />
            <Input
              type="number"
              value={newExpense.amount}
              onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
              className="h-8 w-28 text-right"
              placeholder="Amount"
            />
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8"
              onClick={handleAddExpense}
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Bank Deposit */}
        <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
          <span className="font-medium">Bank Deposit</span>
          <Input
            type="number"
            value={currentEntry.bankDeposit || ''}
            onChange={(e) => updatePayments(currentEntry.upiCollection || 0, parseFloat(e.target.value) || 0)}
            className="w-32 h-9 text-right font-mono"
            placeholder="0.00"
          />
        </div>

        {/* UPI/Digital Collection */}
        <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
          <span className="font-medium">UPI/Digital Collection</span>
          <Input
            type="number"
            value={currentEntry.upiCollection || ''}
            onChange={(e) => updatePayments(parseFloat(e.target.value) || 0, currentEntry.bankDeposit || 0)}
            className="w-32 h-9 text-right font-mono"
            placeholder="0.00"
          />
        </div>

        {/* Credit Given */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="font-medium text-sm">Credit Given</span>
            <span className="font-mono text-sm">{formatCurrency(totals.totalCredits)}</span>
          </div>
          
          {/* Credit Items List */}
          {(currentEntry.credits || []).map((credit) => (
            <div key={credit.id} className="flex items-center gap-2 text-sm pl-4">
              <Input
                value={credit.customerName}
                onChange={(e) => updateCredit(credit.id, { customerName: e.target.value })}
                className="h-8 flex-1"
                placeholder="Customer name"
              />
              <Input
                type="number"
                value={credit.amount || ''}
                onChange={(e) => updateCredit(credit.id, { amount: parseFloat(e.target.value) || 0 })}
                className="h-8 w-28 text-right"
                placeholder="Amount"
              />
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8"
                onClick={() => removeCredit(credit.id)}
              >
                <Trash2 className="w-3 h-3 text-destructive" />
              </Button>
            </div>
          ))}
          
          {/* Add Credit Form */}
          <div className="flex items-center gap-2 text-sm pl-4">
            <Input
              value={newCredit.customerName}
              onChange={(e) => setNewCredit({ ...newCredit, customerName: e.target.value })}
              className="h-8 flex-1"
              placeholder="Customer name"
              onKeyPress={(e) => e.key === 'Enter' && handleAddCredit()}
            />
            <Input
              type="number"
              value={newCredit.amount}
              onChange={(e) => setNewCredit({ ...newCredit, amount: e.target.value })}
              className="h-8 w-28 text-right"
              placeholder="Amount"
            />
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8"
              onClick={handleAddCredit}
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Total Outflow */}
        <div className="flex justify-between items-center p-3 bg-destructive/10 rounded-lg border border-destructive/30">
          <span className="font-semibold text-destructive">TOTAL OUTFLOW</span>
          <span className="font-mono font-bold text-lg text-destructive">{formatCurrency(totals.totalOutflow)}</span>
        </div>
      </CardContent>
    </Card>
  );
}
