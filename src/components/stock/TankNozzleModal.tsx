import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { CloudTank, useCloudData } from '@/contexts/CloudDataContext';
import { Link2, AlertTriangle, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface TankNozzleModalProps {
  tank: CloudTank | null;
  isOpen: boolean;
  onClose: () => void;
}

export function TankNozzleModal({ tank, isOpen, onClose }: TankNozzleModalProps) {
  const { tanks, nozzles, updateNozzle, deleteNozzle, isOnline } = useCloudData();
  
  const [selectedNozzles, setSelectedNozzles] = useState<string[]>([]);
  const [confirmMove, setConfirmMove] = useState<{ nozzleId: string; fromTankName: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ nozzleId: string; nozzleLabel: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  // Get nozzles that match this tank's fuel type
  const compatibleNozzles = useMemo(() => {
    return nozzles.filter((n) => n.fuel_type === tank?.fuel_type);
  }, [nozzles, tank?.fuel_type]);

  // Load currently connected nozzles when modal opens
  useEffect(() => {
    if (tank && isOpen) {
      const currentConnections = nozzles
        .filter((n) => n.tank_id === tank.id)
        .map((n) => n.id);
      setSelectedNozzles(currentConnections);
    }
  }, [tank, isOpen, nozzles]);

  // Find which tank a nozzle is currently connected to
  const getConnectedTank = (nozzleId: string): CloudTank | null => {
    const nozzle = nozzles.find((n) => n.id === nozzleId);
    if (!nozzle?.tank_id) return null;
    return tanks.find((t) => t.id === nozzle.tank_id) || null;
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

  const handleDeleteNozzle = (nozzleId: string, nozzleLabel: string) => {
    setConfirmDelete({ nozzleId, nozzleLabel });
  };

  const handleConfirmDelete = async () => {
    if (confirmDelete) {
      await deleteNozzle(confirmDelete.nozzleId);
      setSelectedNozzles((prev) => prev.filter(id => id !== confirmDelete.nozzleId));
      toast.success(`Nozzle "${confirmDelete.nozzleLabel}" deleted`);
      setConfirmDelete(null);
    }
  };

  const handleConfirmMove = () => {
    if (confirmMove) {
      setSelectedNozzles((prev) => [...prev, confirmMove.nozzleId]);
      setConfirmMove(null);
    }
  };

  const handleSave = async () => {
    if (!tank) return;

    setIsSaving(true);
    try {
      // Update nozzle connections
      for (const nozzle of compatibleNozzles) {
        const shouldBeConnected = selectedNozzles.includes(nozzle.id);
        const isCurrentlyConnected = nozzle.tank_id === tank.id;
        
        if (shouldBeConnected && !isCurrentlyConnected) {
          // Connect to this tank
          await updateNozzle(nozzle.id, { tank_id: tank.id });
        } else if (!shouldBeConnected && isCurrentlyConnected) {
          // Disconnect from this tank
          await updateNozzle(nozzle.id, { tank_id: null });
        }
      }

      toast.success(`Connections updated for ${tank.name}`);
      onClose();
    } catch (error) {
      console.error('Error saving connections:', error);
      toast.error('Failed to update connections');
    } finally {
      setIsSaving(false);
    }
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
              Select which {tank.fuel_type} nozzles draw fuel from this tank.
              A nozzle can only be connected to one tank at a time.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-3">
            {compatibleNozzles.length === 0 ? (
              <div className="text-center py-6 space-y-2">
                <p className="text-muted-foreground">
                  No {tank.fuel_type} nozzles found.
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
                        disabled={!isOnline}
                      />
                      <label
                        htmlFor={nozzle.id}
                        className="font-medium cursor-pointer"
                      >
                        {nozzle.fuel_type} - {nozzle.label}
                      </label>
                    </div>
                    
                    <div className="flex items-center gap-2">
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
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteNozzle(nozzle.id, nozzle.label);
                        }}
                        title={`Delete ${nozzle.label}`}
                        disabled={!isOnline}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving || !isOnline}>
              {isSaving ? 'Saving...' : 'Save Connections'}
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

      {/* Confirmation Dialog for Deleting Nozzle */}
      <AlertDialog open={!!confirmDelete} onOpenChange={() => setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-destructive" />
              Delete Nozzle?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>"{confirmDelete?.nozzleLabel}"</strong>? 
              This will remove the nozzle from the system permanently.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={!isOnline}
            >
              Delete Nozzle
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
