import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertTriangle, Lock } from 'lucide-react';
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
  const [name, setName] = useState('');
  const [capacity, setCapacity] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (tank) {
      setName(tank.name);
      setCapacity(tank.capacity);
      setError(null);
    }
  }, [tank]);

  if (!tank) return null;

  const handleNameChange = (value: string) => {
    setName(value);
    if (!value.trim()) {
      setError('Tank name is required');
    } else {
      // Clear name error, but check capacity
      validateCapacity(capacity);
    }
  };

  const validateCapacity = (value: number) => {
    if (value < tank.currentStock) {
      setError(`Capacity cannot be less than current stock (${formatLiters(tank.currentStock)} L)`);
    } else if (value <= 0) {
      setError('Capacity must be greater than 0');
    } else if (!name.trim()) {
      setError('Tank name is required');
    } else {
      setError(null);
    }
  };

  const handleCapacityChange = (value: number) => {
    setCapacity(value);
    validateCapacity(value);
  };

  const handleSave = () => {
    if (error || capacity <= 0 || !name.trim()) return;

    updateTank(tank.id, { name: name.trim(), capacity });
    toast.success(`${name.trim()} updated successfully`);
    onClose();
  };

  const fillPercentage = capacity > 0 ? Math.min(100, (tank.currentStock / capacity) * 100) : 0;

  // Product type is locked if tank has stock
  const isProductLocked = tank.currentStock > 0;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Tank Details</DialogTitle>
          <DialogDescription>
            Update the name and capacity for this tank
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Tank Name */}
          <div className="space-y-2">
            <Label htmlFor="tankName">Tank Name</Label>
            <Input
              id="tankName"
              type="text"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g., MS Tank 1"
              className="h-12"
            />
          </div>

          {/* Product Type (Locked if has stock) */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              Product Type
              {isProductLocked && <Lock className="w-3 h-3 text-muted-foreground" />}
            </Label>
            <div className="flex items-center gap-2">
              <div 
                className="h-12 flex-1 rounded-md border bg-muted px-3 flex items-center"
                style={{ 
                  borderColor: tank.fuelType === 'MS' ? '#DB9121' : tank.fuelType === 'HSD' ? '#2A71B8' : '#E8665D',
                  borderWidth: '2px'
                }}
              >
                <span className="font-medium">{tank.fuelType}</span>
                {isProductLocked && (
                  <span className="ml-auto text-xs text-muted-foreground">
                    Cannot change while tank has stock
                  </span>
                )}
              </div>
            </div>
          </div>

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
          <Button onClick={handleSave} disabled={!!error || capacity <= 0 || !name.trim()}>
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
