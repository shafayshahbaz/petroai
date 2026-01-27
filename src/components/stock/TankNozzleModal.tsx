import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { usePurchaseStore } from '@/store/purchase-store';
import { UndergroundTank } from '@/types/purchase';
import { FuelType } from '@/types/petrol-pump';
import { Link2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface TankNozzleModalProps {
  tank: UndergroundTank | null;
  isOpen: boolean;
  onClose: () => void;
}

export function TankNozzleModal({ tank, isOpen, onClose }: TankNozzleModalProps) {
  const { tanks, tankNozzleConnections, connectNozzleToTank, disconnectNozzle, getRegisteredNozzles } = usePurchaseStore();
  
  const [selectedNozzles, setSelectedNozzles] = useState<string[]>([]);
  const [confirmMove, setConfirmMove] = useState<{ nozzleId: string; fromTankName: string } | null>(null);
  
  // Get nozzles that match this tank's fuel type from registered nozzles
  const compatibleNozzles = useMemo(() => {
    const registeredNozzles = getRegisteredNozzles?.() || [];
    return registeredNozzles
      .filter((nozzle) => nozzle.fuelType === tank?.fuelType)
      .map((nozzle) => ({
        id: nozzle.id,
        label: nozzle.label,
        fuelType: nozzle.fuelType,
      }));
  }, [tank?.fuelType, getRegisteredNozzles]);

  // Load currently connected nozzles when modal opens
  useEffect(() => {
    if (tank && isOpen) {
      const currentConnections = tankNozzleConnections
        .filter((conn) => conn.tankId === tank.id)
        .map((conn) => conn.nozzleId);
      setSelectedNozzles(currentConnections);
    }
  }, [tank, isOpen, tankNozzleConnections]);

  // Find which tank a nozzle is currently connected to
  const getConnectedTank = (nozzleId: string): UndergroundTank | null => {
    const connection = tankNozzleConnections.find((c) => c.nozzleId === nozzleId);
    if (!connection) return null;
    return tanks.find((t) => t.id === connection.tankId) || null;
  };

  const handleNozzleToggle = (nozzleId: string, checked: boolean) => {
    if (checked) {
      // Check if nozzle is connected to another tank
      const currentTank = getConnectedTank(nozzleId);
      if (currentTank && currentTank.id !== tank?.id) {
        // Show confirmation dialog
        setConfirmMove({ nozzleId, fromTankName: currentTank.name });
        return;
      }
      setSelectedNozzles((prev) => [...prev, nozzleId]);
    } else {
      setSelectedNozzles((prev) => prev.filter((id) => id !== nozzleId));
    }
  };

  const handleConfirmMove = () => {
    if (confirmMove) {
      setSelectedNozzles((prev) => [...prev, confirmMove.nozzleId]);
      setConfirmMove(null);
    }
  };

  const handleSave = () => {
    if (!tank) return;

    // Get current connections for this tank
    const currentConnections = tankNozzleConnections
      .filter((conn) => conn.tankId === tank.id)
      .map((conn) => conn.nozzleId);

    // Disconnect removed nozzles
    currentConnections.forEach((nozzleId) => {
      if (!selectedNozzles.includes(nozzleId)) {
        disconnectNozzle(nozzleId);
      }
    });

    // Connect new nozzles
    selectedNozzles.forEach((nozzleId) => {
      const existingConnection = tankNozzleConnections.find((c) => c.nozzleId === nozzleId);
      if (!existingConnection || existingConnection.tankId !== tank.id) {
        connectNozzleToTank(nozzleId, tank.id);
      }
    });

    toast.success(`Connections updated for ${tank.name}`);
    onClose();
  };

  if (!tank) return null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link2 className="w-5 h-5" />
              Connect Nozzles to {tank.name}
            </DialogTitle>
            <DialogDescription>
              Select which {tank.fuelType} nozzles draw fuel from this tank.
              A nozzle can only be connected to one tank at a time.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-3">
            {compatibleNozzles.length === 0 ? (
              <div className="text-center py-6 space-y-2">
                <p className="text-muted-foreground">
                  No {tank.fuelType} nozzles found.
                </p>
                <p className="text-sm text-muted-foreground">
                  Create nozzles using the "Add Nozzle" button on the Stock page first.
                </p>
              </div>
            ) : (
              compatibleNozzles.map((nozzle) => {
                const connectedTank = getConnectedTank(nozzle.id);
                const isConnectedToThis = connectedTank?.id === tank.id;
                const isConnectedToOther = connectedTank && connectedTank.id !== tank.id;
                const isSelected = selectedNozzles.includes(nozzle.id);

                return (
                  <div
                    key={nozzle.id}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-lg border transition-colors",
                      isSelected && "bg-primary/5 border-primary/20",
                      !isSelected && "hover:bg-muted/50"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Checkbox
                        id={nozzle.id}
                        checked={isSelected}
                        onCheckedChange={(checked) => handleNozzleToggle(nozzle.id, !!checked)}
                      />
                      <label
                        htmlFor={nozzle.id}
                        className="font-medium cursor-pointer"
                      >
                        {nozzle.fuelType} - {nozzle.label}
                      </label>
                    </div>
                    
                    {isConnectedToOther && (
                      <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50">
                        On {connectedTank.name}
                      </Badge>
                    )}
                    {isConnectedToThis && !isSelected && (
                      <Badge variant="outline" className="text-green-600 border-green-300 bg-green-50">
                        Connected
                      </Badge>
                    )}
                  </div>
                );
              })
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              Save Connections
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog for Moving Nozzle */}
      <AlertDialog open={!!confirmMove} onOpenChange={() => setConfirmMove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Move Nozzle Connection?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This nozzle is currently connected to <strong>{confirmMove?.fromTankName}</strong>.
              Moving it will disconnect from that tank and connect to <strong>{tank?.name}</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmMove}>
              Move Nozzle
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
