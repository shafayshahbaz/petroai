import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { usePetrolPumpStore } from '@/store/petrol-pump-store';
import { DailyTotals } from '@/types/petrol-pump';
import { cn } from '@/lib/utils';

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(amount);
}

interface InflowsSectionProps {
  totals: DailyTotals;
}

export function InflowsSection({ totals }: InflowsSectionProps) {
  const [newIncome, setNewIncome] = useState({ description: '', amount: '' });
  const [newLube, setNewLube] = useState({ name: '', quantity: '', rate: '' });
  
  const { 
    currentEntry, 
    addIncome, 
    removeIncome, 
    updateIncome,
    addLubeItem,
    removeLubeItem,
    updateLubeItem,
  } = usePetrolPumpStore();

  if (!currentEntry) return null;

  const handleAddIncome = () => {
    if (newIncome.description && newIncome.amount) {
      addIncome({ description: newIncome.description, amount: parseFloat(newIncome.amount) || 0 });
      setNewIncome({ description: '', amount: '' });
    }
  };

  const handleAddLube = () => {
    if (newLube.name && newLube.quantity && newLube.rate) {
      addLubeItem({
        name: newLube.name,
        quantity: parseFloat(newLube.quantity) || 0,
        rate: parseFloat(newLube.rate) || 0,
      });
      setNewLube({ name: '', quantity: '', rate: '' });
    }
  };

  return (
    <Card className="border-success/30">
      <CardHeader className="bg-success/5">
        <CardTitle className="text-success flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-success" />
          INFLOWS (Money Coming In)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        {/* Opening Cash */}
        <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
          <span className="font-medium">Opening Cash</span>
          <span className="font-mono font-semibold">{formatCurrency(totals.openingCash)}</span>
        </div>

        {/* Fuel Sales */}
        <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
          <span className="font-medium">Fuel Sales</span>
          <span className="font-mono font-semibold">{formatCurrency(totals.totalFuelAmount)}</span>
        </div>

        {/* Lube Sales */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="font-medium text-sm">Lube Sales</span>
            <span className="font-mono text-sm">{formatCurrency(totals.totalLubeAmount)}</span>
          </div>
          
          {/* Lube Items List */}
          {(currentEntry.lubeItems || []).map((lube) => (
            <div key={lube.id} className="flex items-center gap-2 text-sm pl-4">
              <Input
                value={lube.name}
                onChange={(e) => updateLubeItem(lube.id, { name: e.target.value })}
                className="h-8 flex-1"
                placeholder="Item name"
              />
              <Input
                type="number"
                value={lube.quantity || ''}
                onChange={(e) => updateLubeItem(lube.id, { quantity: parseFloat(e.target.value) || 0 })}
                className="h-8 w-16 text-right"
                placeholder="Qty"
              />
              <span className="text-muted-foreground">×</span>
              <Input
                type="number"
                value={lube.rate || ''}
                onChange={(e) => updateLubeItem(lube.id, { rate: parseFloat(e.target.value) || 0 })}
                className="h-8 w-20 text-right"
                placeholder="Rate"
              />
              <span className="font-mono w-20 text-right">
                {formatCurrency(lube.quantity * lube.rate)}
              </span>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8"
                onClick={() => removeLubeItem(lube.id)}
              >
                <Trash2 className="w-3 h-3 text-destructive" />
              </Button>
            </div>
          ))}
          
          {/* Add Lube Form */}
          <div className="flex items-center gap-2 text-sm pl-4">
            <Input
              value={newLube.name}
              onChange={(e) => setNewLube({ ...newLube, name: e.target.value })}
              className="h-8 flex-1"
              placeholder="New item"
            />
            <Input
              type="number"
              value={newLube.quantity}
              onChange={(e) => setNewLube({ ...newLube, quantity: e.target.value })}
              className="h-8 w-16 text-right"
              placeholder="Qty"
            />
            <span className="text-muted-foreground">×</span>
            <Input
              type="number"
              value={newLube.rate}
              onChange={(e) => setNewLube({ ...newLube, rate: e.target.value })}
              className="h-8 w-20 text-right"
              placeholder="Rate"
            />
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8"
              onClick={handleAddLube}
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Other Income */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="font-medium text-sm">Other Income</span>
            <span className="font-mono text-sm">{formatCurrency(totals.totalOtherIncome)}</span>
          </div>
          
          {/* Income Items List */}
          {(currentEntry.incomes || []).map((income) => (
            <div key={income.id} className="flex items-center gap-2 text-sm pl-4">
              <Input
                value={income.description}
                onChange={(e) => updateIncome(income.id, { description: e.target.value })}
                className="h-8 flex-1"
                placeholder="Description"
              />
              <Input
                type="number"
                value={income.amount || ''}
                onChange={(e) => updateIncome(income.id, { amount: parseFloat(e.target.value) || 0 })}
                className="h-8 w-28 text-right"
                placeholder="Amount"
              />
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8"
                onClick={() => removeIncome(income.id)}
              >
                <Trash2 className="w-3 h-3 text-destructive" />
              </Button>
            </div>
          ))}
          
          {/* Add Income Form */}
          <div className="flex items-center gap-2 text-sm pl-4">
            <Input
              value={newIncome.description}
              onChange={(e) => setNewIncome({ ...newIncome, description: e.target.value })}
              className="h-8 flex-1"
              placeholder="Add income item"
              onKeyPress={(e) => e.key === 'Enter' && handleAddIncome()}
            />
            <Input
              type="number"
              value={newIncome.amount}
              onChange={(e) => setNewIncome({ ...newIncome, amount: e.target.value })}
              className="h-8 w-28 text-right"
              placeholder="Amount"
            />
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8"
              onClick={handleAddIncome}
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Total Inflow */}
        <div className="flex justify-between items-center p-3 bg-success/10 rounded-lg border border-success/30">
          <span className="font-semibold text-success">TOTAL INFLOW</span>
          <span className="font-mono font-bold text-lg text-success">{formatCurrency(totals.totalInflow)}</span>
        </div>
      </CardContent>
    </Card>
  );
}
