import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { usePetrolPumpStore, calculateTotals } from '@/store/petrol-pump-store';
import { Separator } from '@/components/ui/separator';

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(amount);
}

export function StepExpensesAndPayments() {
  const { 
    currentEntry, 
    addExpense, 
    updateExpense, 
    removeExpense,
    addIncome,
    updateIncome,
    removeIncome,
    updatePayments 
  } = usePetrolPumpStore();
  
  const [newExpense, setNewExpense] = useState({ description: '', amount: '' });
  const [newIncome, setNewIncome] = useState({ description: '', amount: '' });

  if (!currentEntry) return null;

  const expenses = currentEntry.expenses || [];
  const incomes = currentEntry.incomes || [];
  const totals = calculateTotals(currentEntry);

  const handleAddExpense = () => {
    if (newExpense.description && newExpense.amount) {
      addExpense({
        description: newExpense.description,
        amount: parseFloat(newExpense.amount) || 0,
      });
      setNewExpense({ description: '', amount: '' });
    }
  };

  const handleAddIncome = () => {
    if (newIncome.description && newIncome.amount) {
      addIncome({
        description: newIncome.description,
        amount: parseFloat(newIncome.amount) || 0,
      });
      setNewIncome({ description: '', amount: '' });
    }
  };

  const handleExpenseKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleAddExpense();
  };

  const handleIncomeKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleAddIncome();
  };

  return (
    <div className="space-y-8">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-sm text-amber-700 font-medium">MS Sales</p>
          <p className="text-xl font-bold text-amber-900">{formatCurrency(totals.fuelSales.MS.amount)}</p>
          <p className="text-xs text-amber-600">{totals.fuelSales.MS.liters.toFixed(2)} L × ₹{currentEntry.fuelRates?.MS || 0}</p>
        </div>
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-700 font-medium">POWER Sales</p>
          <p className="text-xl font-bold text-blue-900">{formatCurrency(totals.fuelSales.POWER.amount)}</p>
          <p className="text-xs text-blue-600">{totals.fuelSales.POWER.liters.toFixed(2)} L × ₹{currentEntry.fuelRates?.POWER || 0}</p>
        </div>
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-700 font-medium">HSD Sales</p>
          <p className="text-xl font-bold text-green-900">{formatCurrency(totals.fuelSales.HSD.amount)}</p>
          <p className="text-xs text-green-600">{totals.fuelSales.HSD.liters.toFixed(2)} L × ₹{currentEntry.fuelRates?.HSD || 0}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column - Incomes */}
        <div className="space-y-6">
          <h3 className="font-semibold text-lg text-success">Income / Inflow</h3>
          
          {/* Other Income Items */}
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Other income sources (POS commission, Fastag, etc.)</p>
            
            <div className="flex gap-2">
              <Input
                placeholder="Description"
                value={newIncome.description}
                onChange={(e) => setNewIncome({ ...newIncome, description: e.target.value })}
                onKeyPress={handleIncomeKeyPress}
                className="flex-1 h-10"
              />
              <Input
                type="number"
                placeholder="Amount"
                value={newIncome.amount}
                onChange={(e) => setNewIncome({ ...newIncome, amount: e.target.value })}
                onKeyPress={handleIncomeKeyPress}
                className="w-28 h-10 number-input"
              />
              <Button onClick={handleAddIncome} size="icon" className="h-10 w-10">
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            {incomes.length > 0 && (
              <div className="space-y-2">
                {incomes.map((income) => (
                  <div key={income.id} className="flex items-center gap-2 p-2 bg-muted/30 rounded">
                    <Input
                      value={income.description}
                      onChange={(e) => updateIncome(income.id, { description: e.target.value })}
                      className="flex-1 h-9"
                    />
                    <Input
                      type="number"
                      value={income.amount}
                      onChange={(e) => updateIncome(income.id, { amount: parseFloat(e.target.value) || 0 })}
                      className="w-24 h-9 number-input"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeIncome(income.id)}
                      className="h-8 w-8 text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Income Summary */}
          <div className="space-y-2 p-4 bg-success/10 rounded-lg">
            <div className="flex justify-between text-sm">
              <span>Opening Balance</span>
              <span className="font-mono">{formatCurrency(currentEntry.openingBalance || 0)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Fuel Sales</span>
              <span className="font-mono">{formatCurrency(totals.totalFuelAmount)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Lube Sales</span>
              <span className="font-mono">{formatCurrency(totals.totalLubeAmount)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Other Income</span>
              <span className="font-mono">{formatCurrency(totals.totalIncomes)}</span>
            </div>
            <Separator />
            <div className="flex justify-between font-semibold">
              <span>Total Inflow</span>
              <span className="font-mono text-success">{formatCurrency(totals.grandTotalIncome)}</span>
            </div>
          </div>
        </div>

        {/* Right Column - Expenses & Outflow */}
        <div className="space-y-6">
          <h3 className="font-semibold text-lg text-destructive">Expenses / Cash Outflow</h3>
          
          {/* Payment Collection */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Cash Deposit (SBI, etc.)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={currentEntry.cashDeposit || ''}
                  onChange={(e) => updatePayments(currentEntry.upiCollection || 0, parseFloat(e.target.value) || 0)}
                  className="h-11 pl-8 number-input"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>UPI / Online Collection (PhonePe, Paytm, etc.)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={currentEntry.upiCollection || ''}
                  onChange={(e) => updatePayments(parseFloat(e.target.value) || 0, currentEntry.cashDeposit || 0)}
                  className="h-11 pl-8 number-input"
                />
              </div>
            </div>
          </div>

          {/* Expenses */}
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Other expenses (Pump Exp, Withdrawals, etc.)</p>
            
            <div className="flex gap-2">
              <Input
                placeholder="Description"
                value={newExpense.description}
                onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                onKeyPress={handleExpenseKeyPress}
                className="flex-1 h-10"
              />
              <Input
                type="number"
                placeholder="Amount"
                value={newExpense.amount}
                onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                onKeyPress={handleExpenseKeyPress}
                className="w-28 h-10 number-input"
              />
              <Button onClick={handleAddExpense} size="icon" className="h-10 w-10">
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            {expenses.length > 0 && (
              <div className="space-y-2">
                {expenses.map((expense) => (
                  <div key={expense.id} className="flex items-center gap-2 p-2 bg-muted/30 rounded">
                    <Input
                      value={expense.description}
                      onChange={(e) => updateExpense(expense.id, { description: e.target.value })}
                      className="flex-1 h-9"
                    />
                    <Input
                      type="number"
                      value={expense.amount}
                      onChange={(e) => updateExpense(expense.id, { amount: parseFloat(e.target.value) || 0 })}
                      className="w-24 h-9 number-input"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeExpense(expense.id)}
                      className="h-8 w-8 text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Expense Summary */}
          <div className="space-y-2 p-4 bg-destructive/10 rounded-lg">
            <div className="flex justify-between text-sm">
              <span>Cash Deposit</span>
              <span className="font-mono">{formatCurrency(currentEntry.cashDeposit || 0)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>UPI Collection</span>
              <span className="font-mono">{formatCurrency(currentEntry.upiCollection || 0)}</span>
            </div>
            {expenses.map((expense) => (
              <div key={expense.id} className="flex justify-between text-sm">
                <span>{expense.description}</span>
                <span className="font-mono">{formatCurrency(expense.amount)}</span>
              </div>
            ))}
            <Separator />
            <div className="flex justify-between font-semibold">
              <span>Total Outflow</span>
              <span className="font-mono text-destructive">{formatCurrency(totals.totalExpenses)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Final Cash in Hand */}
      <div className="p-6 bg-primary rounded-lg text-primary-foreground">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-primary-foreground/80 text-sm">Cash in Hand</p>
            <p className="text-xs text-primary-foreground/60">Total Inflow - Total Outflow</p>
          </div>
          <p className="text-3xl font-bold font-mono">{formatCurrency(totals.cashInHand)}</p>
        </div>
      </div>
    </div>
  );
}
