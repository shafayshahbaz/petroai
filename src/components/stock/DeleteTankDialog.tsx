import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AlertTriangle, Droplets, Link2Off, Loader2 } from 'lucide-react';
import { UndergroundTank } from '@/types/purchase';
import { useCloudData } from '@/contexts/CloudDataContext';
import { formatLiters } from '@/lib/format';
import { toast } from 'sonner';

interface DeleteTankDialogProps {
  tank: UndergroundTank | null;
  isOpen: boolean;
  onClose: () => void;
}

export function DeleteTankDialog({ tank, isOpen, onClose }: DeleteTankDialogProps) {
  const { deleteTank, getNozzlesForTank, disconnectNozzle } = useCloudData();
  const [isDeleting, setIsDeleting] = useState(false);

  if (!tank) return null;

  const connectedNozzles = getNozzlesForTank(tank.id);
  const hasStock = tank.currentStock > 0;
  const hasConnectedNozzles = connectedNozzles.length > 0;

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      // Step 1: Disconnect all nozzles from this tank first
      if (hasConnectedNozzles) {
        for (const nozzleId of connectedNozzles) {
          await disconnectNozzle(nozzleId);
        }
      }
      
      // Step 2: Delete the tank
      await deleteTank(tank.id);
      
      toast.success(`${tank.name} has been deleted`, {
        description: hasConnectedNozzles 
          ? `${connectedNozzles.length} nozzle(s) have been disconnected.`
          : undefined
      });
      
      onClose();
    } catch (error: any) {
      console.error('Error deleting tank:', error);
      toast.error('Failed to delete tank', {
        description: error.message || 'Please try again',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && !isDeleting && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-5 h-5" />
            Delete {tank.name}?
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <p>
              This will permanently delete <strong>{tank.name}</strong> and its history.
              This action cannot be undone.
            </p>

            {/* Stock Warning */}
            {hasStock && (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
                <Droplets className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-foreground">Tank Has Fuel</p>
                  <p className="text-sm">
                    This tank still contains <strong>{formatLiters(tank.currentStock)} L</strong> of {tank.fuelType}.
                    Deleting it will erase this inventory record.
                  </p>
                </div>
              </div>
            )}

            {/* Connected Nozzles Warning */}
            {hasConnectedNozzles && (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted border">
                <Link2Off className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-foreground">Connected Nozzles</p>
                  <p className="text-sm">
                    {connectedNozzles.length} nozzle(s) are connected to this tank. 
                    They will be automatically set to "Unassigned" when this tank is deleted.
                  </p>
                </div>
              </div>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {isDeleting ? 'Deleting...' : 'Delete Tank'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
