import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCloudData } from '@/contexts/CloudDataContext';
import { FuelType } from '@/types/petrol-pump';
import { toast } from 'sonner';
import { Database, Loader2 } from 'lucide-react';

interface AddTankModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AddTankModal({ isOpen, onClose }: AddTankModalProps) {
  const { addTank } = useCloudData();
  
  const [name, setName] = useState('');
  const [fuelType, setFuelType] = useState<FuelType>('MS');
  const [capacity, setCapacity] = useState<number>(10000);
  const [currentStock, setCurrentStock] = useState<number>(0);
  const [errors, setErrors] = useState<{ name?: string; capacity?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    const newErrors: { name?: string; capacity?: string } = {};
    
    if (!name.trim()) {
      newErrors.name = 'Tank name is required';
    }
    
    if (capacity <= 0) {
      newErrors.capacity = 'Capacity must be greater than 0';
    }
    
    if (currentStock > capacity) {
      newErrors.capacity = 'Current stock cannot exceed capacity';
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      await addTank({
        name: name.trim(),
        fuelType,
        capacity,
        currentStock: currentStock || 0,
      });

      toast.success(`${name} has been added successfully`);
      
      // Reset form
      setName('');
      setFuelType('MS');
      setCapacity(10000);
      setCurrentStock(0);
      setErrors({});
      onClose();
    } catch (error: any) {
      toast.error('Failed to add tank', {
        description: error.message || 'Please try again',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (isSubmitting) return;
    setName('');
    setFuelType('MS');
    setCapacity(10000);
    setCurrentStock(0);
    setErrors({});
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="w-5 h-5 text-primary" />
            Add New Tank
          </DialogTitle>
          <DialogDescription>
            Create a new underground storage tank for your station
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="tankName">Tank Name *</Label>
            <Input
              id="tankName"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (errors.name) setErrors({ ...errors, name: undefined });
              }}
              placeholder="e.g., MS Tank 1, HSD Underground"
              className={errors.name ? 'border-destructive' : ''}
              disabled={isSubmitting}
            />
            {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
          </div>

          <div className="space-y-2">
            <Label>Fuel Type *</Label>
            <Select value={fuelType} onValueChange={(v) => setFuelType(v as FuelType)} disabled={isSubmitting}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MS">MS (Petrol)</SelectItem>
                <SelectItem value="HSD">HSD (Diesel)</SelectItem>
                <SelectItem value="POWER">POWER (Premium)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="capacity">Total Capacity (L) *</Label>
              <Input
                id="capacity"
                type="number"
                value={capacity || ''}
                onChange={(e) => {
                  setCapacity(Number(e.target.value));
                  if (errors.capacity) setErrors({ ...errors, capacity: undefined });
                }}
                placeholder="10000"
                className={errors.capacity ? 'border-destructive' : ''}
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="currentStock">Opening Stock (L)</Label>
              <Input
                id="currentStock"
                type="number"
                value={currentStock || ''}
                onChange={(e) => setCurrentStock(Number(e.target.value))}
                placeholder="0"
                disabled={isSubmitting}
              />
            </div>
          </div>
          {errors.capacity && <p className="text-sm text-destructive">{errors.capacity}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Create Tank
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
