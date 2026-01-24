import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { usePetrolPumpStore } from '@/store/petrol-pump-store';

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(amount);
}

export function StepLubeSales() {
  const { currentEntry, addLubeItem, updateLubeItem, removeLubeItem } = usePetrolPumpStore();
  const [newItem, setNewItem] = useState({ name: '', quantity: '', rate: '' });

  if (!currentEntry) return null;

  const lubeItems = currentEntry.lubeItems || [];

  const handleAddItem = () => {
    if (newItem.name && newItem.quantity && newItem.rate) {
      addLubeItem({
        name: newItem.name,
        quantity: parseFloat(newItem.quantity) || 0,
        rate: parseFloat(newItem.rate) || 0,
      });
      setNewItem({ name: '', quantity: '', rate: '' });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddItem();
    }
  };

  const totalLubeAmount = lubeItems.reduce(
    (sum, item) => sum + item.quantity * item.rate,
    0
  );

  return (
    <div className="space-y-6">
      <p className="text-muted-foreground">
        Add lube/oil items sold during this shift. Enter the product name, quantity, and rate per piece.
      </p>

      {/* Add New Item Form */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
        <div className="space-y-2">
          <Label htmlFor="itemName">Item Name</Label>
          <Input
            id="itemName"
            placeholder="e.g., HP Racer 1L"
            value={newItem.name}
            onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
            onKeyPress={handleKeyPress}
            className="h-11"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="quantity">Quantity</Label>
          <Input
            id="quantity"
            type="number"
            placeholder="0"
            value={newItem.quantity}
            onChange={(e) => setNewItem({ ...newItem, quantity: e.target.value })}
            onKeyPress={handleKeyPress}
            className="h-11 number-input"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="rate">Rate (₹)</Label>
          <Input
            id="rate"
            type="number"
            step="0.01"
            placeholder="0.00"
            value={newItem.rate}
            onChange={(e) => setNewItem({ ...newItem, rate: e.target.value })}
            onKeyPress={handleKeyPress}
            className="h-11 number-input"
          />
        </div>
        <div className="flex items-end">
          <Button onClick={handleAddItem} className="w-full h-11">
            <Plus className="w-4 h-4 mr-2" />
            Add Item
          </Button>
        </div>
      </div>

      {/* Items List */}
      {lubeItems.length > 0 ? (
        <div className="space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-2 font-medium text-muted-foreground">Item</th>
                  <th className="text-right py-3 px-2 font-medium text-muted-foreground">Qty</th>
                  <th className="text-right py-3 px-2 font-medium text-muted-foreground">Rate (₹)</th>
                  <th className="text-right py-3 px-2 font-medium text-muted-foreground">Total (₹)</th>
                  <th className="w-12"></th>
                </tr>
              </thead>
              <tbody>
                {lubeItems.map((item) => (
                  <tr key={item.id} className="border-b hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-2">
                      <Input
                        value={item.name}
                        onChange={(e) => updateLubeItem(item.id, { name: e.target.value })}
                        className="h-9"
                      />
                    </td>
                    <td className="py-3 px-2">
                      <Input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateLubeItem(item.id, { quantity: parseFloat(e.target.value) || 0 })}
                        className="h-9 w-20 number-input ml-auto"
                      />
                    </td>
                    <td className="py-3 px-2">
                      <Input
                        type="number"
                        step="0.01"
                        value={item.rate}
                        onChange={(e) => updateLubeItem(item.id, { rate: parseFloat(e.target.value) || 0 })}
                        className="h-9 w-24 number-input ml-auto"
                      />
                    </td>
                    <td className="py-3 px-2 text-right font-mono font-medium">
                      {formatCurrency(item.quantity * item.rate)}
                    </td>
                    <td className="py-3 px-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeLubeItem(item.id)}
                        className="h-8 w-8 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Total */}
          <div className="flex items-center justify-between p-4 bg-primary/10 rounded-lg">
            <span className="font-semibold">Total Lube Sales</span>
            <span className="font-mono font-bold text-lg">{formatCurrency(totalLubeAmount)}</span>
          </div>
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          <p>No lube items added yet.</p>
          <p className="text-sm">Add items using the form above.</p>
        </div>
      )}
    </div>
  );
}
