import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertTriangle } from 'lucide-react';
import { UndergroundTank } from '@/types/purchase';
import { usePurchaseStore } from '@/store/purchase-store';
import { formatLiters } from '@/lib/format';
import { toast } from 'sonner';

interface EditTankModalProps {
  tank: UndergroundTank | null;
  isOpen: boolean;
  onClose: () => void;
}

export function EditTankModal({ tank, isOpen, onClose }: EditTankModalProps) {
  const { updateTank } = usePurchaseStore();
  const [capacity, setCapacity] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (tank) {
      setCapacity(tank.capacity);
      setError(null);
    }
  }, [tank]);

  if (!tank) return null;

  const handleCapacityChange = (value: number) => {
    setCapacity(value);
    if (value < tank.currentStock) {
      setError(`Capacity cannot be less than current stock (${formatLiters(tank.currentStock)} L)`);
    } else if (value <= 0) {
      setError('Capacity must be greater than 0');
    } else {
      setError(null);
    }
  };

  const handleSave = () => {
    if (error || capacity <= 0) return;

    updateTank(tank.id, { capacity });
    toast.success(`${tank.name} capacity updated to ${formatLiters(capacity)} L`);
    onClose();
  };

  const fillPercentage = capacity > 0 ? Math.min(100, (tank.currentStock / capacity) * 100) : 0;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Tank Capacity</DialogTitle>
          <DialogDescription>
            Update the total capacity for <strong>{tank.name}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Current Stock Info */}
          <div className="p-3 rounded-lg bg-muted/50 border">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Current Stock:</span>
              <span className="font-medium">{formatLiters(tank.currentStock)} L</span>
            </div>
            <div className="flex justify-between text-sm mt-1">
              <span className="text-muted-foreground">Current Capacity:</span>
              <span className="font-medium">{formatLiters(tank.capacity)} L</span>
            </div>
          </div>

          {/* Capacity Input */}
          <div className="space-y-2">
            <Label htmlFor="capacity">New Capacity (Liters)</Label>
            <Input
              id="capacity"
              type="number"
              value={capacity || ''}
              onChange={(e) => handleCapacityChange(Number(e.target.value))}
              placeholder="e.g., 10000"
              className="h-12 text-lg"
            />
            {error && (
              <div className="flex items-center gap-2 text-destructive text-sm">
                <AlertTriangle className="w-4 h-4" />
                {error}
              </div>
            )}
          </div>

          {/* Preview */}
          {!error && capacity > 0 && (
            <div className="space-y-2">
              <Label className="text-muted-foreground">New Fill Level Preview</Label>
              <div className="w-full bg-muted rounded-full h-3">
                <div 
                  className="h-3 rounded-full transition-all duration-300"
                  style={{ 
                    width: `${fillPercentage}%`,
                    backgroundColor: tank.fuelType === 'MS' ? '#DB9121' : tank.fuelType === 'HSD' ? '#2A71B8' : '#E8665D'
                  }}
                />
              </div>
              <p className="text-sm text-muted-foreground text-center">
                {fillPercentage.toFixed(1)}% filled
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!!error || capacity <= 0}>
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
