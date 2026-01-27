import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePurchaseStore } from '@/store/purchase-store';
import { FuelType } from '@/types/petrol-pump';
import { toast } from 'sonner';
import { Fuel, Link2 } from 'lucide-react';

interface AddNozzleModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AddNozzleModal({ isOpen, onClose }: AddNozzleModalProps) {
  const { tanks, connectNozzleToTank } = usePurchaseStore();
  
  const [name, setName] = useState('');
  const [fuelType, setFuelType] = useState<FuelType>('MS');
  const [selectedTankId, setSelectedTankId] = useState<string>('');
  const [errors, setErrors] = useState<{ name?: string }>({});

  // Get compatible tanks based on fuel type
  const compatibleTanks = tanks.filter(t => t.fuelType === fuelType);

  const handleSubmit = () => {
    if (!name.trim()) {
      setErrors({ name: 'Nozzle name is required' });
      return;
    }

    // Create unique nozzle ID based on name
    const nozzleId = `nozzle-${fuelType}-${name.trim().replace(/\s+/g, '-')}`;

    // If a tank is selected, connect the nozzle to it
    if (selectedTankId) {
      connectNozzleToTank(nozzleId, selectedTankId);
      const tank = tanks.find(t => t.id === selectedTankId);
      toast.success(`${name} created and connected to ${tank?.name}`, {
        description: 'The nozzle will appear in Daily Entry when you create a new entry.'
      });
    } else {
      toast.success(`${name} registered successfully`, {
        description: 'Connect it to a tank from the Stock page to use in sales.'
      });
    }
    
    // Reset form
    setName('');
    setFuelType('MS');
    setSelectedTankId('');
    setErrors({});
    onClose();
  };

  const handleClose = () => {
    setName('');
    setFuelType('MS');
    setSelectedTankId('');
    setErrors({});
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Fuel className="w-5 h-5 text-primary" />
            Add New Nozzle
          </DialogTitle>
          <DialogDescription>
            Create a new dispensing nozzle and optionally connect it to a tank
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="nozzleName">Nozzle Name *</Label>
            <Input
              id="nozzleName"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (errors.name) setErrors({});
              }}
              placeholder="e.g., Pump 5 - East, N1, Machine 2 Right"
              className={errors.name ? 'border-destructive' : ''}
            />
            {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
            <p className="text-xs text-muted-foreground">
              This name will appear in reports and daily entries
            </p>
          </div>

          <div className="space-y-2">
            <Label>Fuel Type *</Label>
            <Select 
              value={fuelType} 
              onValueChange={(v) => {
                setFuelType(v as FuelType);
                setSelectedTankId(''); // Reset tank selection when fuel type changes
              }}
            >
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

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Link2 className="w-4 h-4" />
              Connect to Tank (Optional)
            </Label>
            <Select value={selectedTankId} onValueChange={setSelectedTankId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a tank to connect..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Don't connect now</SelectItem>
                {compatibleTanks.map((tank) => (
                  <SelectItem key={tank.id} value={tank.id}>
                    {tank.name} ({tank.fuelType})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {compatibleTanks.length === 0 && (
              <p className="text-xs text-amber-600">
                No {fuelType} tanks available. Create a tank first or connect later.
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>
            Create Nozzle
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}