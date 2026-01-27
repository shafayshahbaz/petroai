import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertTriangle, Lock, Loader2 } from 'lucide-react';
import { UndergroundTank } from '@/types/purchase';
import { useCloudData } from '@/contexts/CloudDataContext';
import { formatLiters } from '@/lib/format';
import { toast } from 'sonner';

interface EditTankModalProps {
  tank: UndergroundTank | null;
  isOpen: boolean;
  onClose: () => void;
}

export function EditTankModal({ tank, isOpen, onClose }: EditTankModalProps) {
  const { updateTank, updateTankStock } = useCloudData();
  const [name, setName] = useState('');
  const [capacity, setCapacity] = useState<number>(0);
  const [currentStock, setCurrentStock] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [stockError, setStockError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (tank) {
      setName(tank.name);
      setCapacity(tank.capacity);
      setCurrentStock(tank.currentStock);
      setError(null);
      setStockError(null);
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
    if (value < currentStock) {
      setError(`Capacity cannot be less than current stock (${formatLiters(currentStock)} L)`);
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
    // Revalidate stock against new capacity
    validateStock(currentStock, value);
  };

  const validateStock = (stock: number, cap: number = capacity) => {
    if (stock < 0) {
      setStockError('Stock cannot be negative');
    } else if (stock > cap) {
      setStockError(`Stock cannot exceed capacity (${formatLiters(cap)} L)`);
    } else {
      setStockError(null);
    }
  };

  const handleStockChange = (value: number) => {
    setCurrentStock(value);
    validateStock(value);
  };

  const handleSave = async () => {
    if (error || stockError || capacity <= 0 || !name.trim()) return;

    setIsSaving(true);
    try {
      // Update tank name and capacity
      await updateTank(tank.id, { name: name.trim(), capacity });
      
      // Update stock if changed
      if (currentStock !== tank.currentStock) {
        await updateTankStock(tank.id, currentStock);
      }
      
      toast.success(`${name.trim()} updated successfully`);
      onClose();
    } catch (err: any) {
      toast.error('Failed to update tank', {
        description: err.message || 'Please try again',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const fillPercentage = capacity > 0 ? Math.min(100, (currentStock / capacity) * 100) : 0;

  // Product type is locked if tank has stock
  const isProductLocked = tank.currentStock > 0;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isSaving && onClose()}>
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
              disabled={isSaving}
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

          {/* Current Stock Input (Editable) */}
          <div className="space-y-2">
            <Label htmlFor="currentStock" className="flex items-center gap-2">
              Current Stock (Liters)
              <span className="text-xs text-muted-foreground font-normal">- Stock Correction</span>
            </Label>
            <Input
              id="currentStock"
              type="number"
              value={currentStock || ''}
              onChange={(e) => handleStockChange(Number(e.target.value))}
              placeholder="e.g., 5000"
              className="h-12 text-lg"
              disabled={isSaving}
            />
            {stockError && (
              <div className="flex items-center gap-2 text-destructive text-sm">
                <AlertTriangle className="w-4 h-4" />
                {stockError}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Use this to correct initial dip reading or calibration errors
            </p>
          </div>

          {/* Capacity Input */}
          <div className="space-y-2">
            <Label htmlFor="capacity">Total Capacity (Liters)</Label>
            <Input
              id="capacity"
              type="number"
              value={capacity || ''}
              onChange={(e) => handleCapacityChange(Number(e.target.value))}
              placeholder="e.g., 10000"
              className="h-12 text-lg"
              disabled={isSaving}
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
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!!error || !!stockError || capacity <= 0 || !name.trim() || isSaving}>
            {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
