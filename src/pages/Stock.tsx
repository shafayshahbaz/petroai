import { useState, useEffect } from 'react';
import { useCloudData, CloudTank } from '@/contexts/CloudDataContext';
import { TankCard } from '@/components/stock/TankCard';
import { TankNozzleModal } from '@/components/stock/TankNozzleModal';
import { EditTankModal } from '@/components/stock/EditTankModal';
import { DeleteTankDialog } from '@/components/stock/DeleteTankDialog';
import { AddTankModal } from '@/components/stock/AddTankModal';
import { AddNozzleModal } from '@/components/stock/AddNozzleModal';
import { Button } from '@/components/ui/button';
import { Plus, Fuel, Rocket, WifiOff } from 'lucide-react';

export default function Stock() {
  const { tanks, nozzles, isLoading, isOnline } = useCloudData();
  const [selectedTank, setSelectedTank] = useState<CloudTank | null>(null);
  const [isConnectionModalOpen, setIsConnectionModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isAddTankModalOpen, setIsAddTankModalOpen] = useState(false);
  const [isAddNozzleModalOpen, setIsAddNozzleModalOpen] = useState(false);

  // Auto-trigger setup if no tanks AND no nozzles exist
  const isEmptyState = tanks.length === 0 && nozzles.length === 0;

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Auto-open Add Tank modal for first-time setup
  useEffect(() => {
    if (isEmptyState && !isLoading) {
      // Small delay to ensure component is mounted
      const timer = setTimeout(() => setIsAddTankModalOpen(true), 300);
      return () => clearTimeout(timer);
    }
  }, [isEmptyState, isLoading]);

  const handleManageConnections = (tank: CloudTank) => {
    setSelectedTank(tank);
    setIsConnectionModalOpen(true);
  };

  const handleEditTank = (tank: CloudTank) => {
    setSelectedTank(tank);
    setIsEditModalOpen(true);
  };

  const handleDeleteTank = (tank: CloudTank) => {
    setSelectedTank(tank);
    setIsDeleteDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
          <p className="text-muted-foreground">Loading tanks...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header with Action Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Stock & Tank Manager</h1>
          <p className="text-muted-foreground">Monitor tank levels and manage nozzle connections</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setIsAddTankModalOpen(true)} disabled={!isOnline}>
            <Plus className="w-4 h-4 mr-2" />
            Add Tank
          </Button>
          <Button variant="outline" onClick={() => setIsAddNozzleModalOpen(true)} disabled={!isOnline}>
            <Fuel className="w-4 h-4 mr-2" />
            Add Nozzle
          </Button>
        </div>
      </div>

      {/* Offline Warning */}
      {!isOnline && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive border border-destructive/20">
          <WifiOff className="w-4 h-4" />
          <span className="text-sm font-medium">You're offline. Changes are disabled until connection is restored.</span>
        </div>
      )}

      {/* Tank Grid */}
      {tanks.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {tanks.map((tank) => (
            <TankCard
              key={tank.id}
              tank={tank}
              onManageConnections={() => handleManageConnections(tank)}
              onEditTank={() => handleEditTank(tank)}
              onDeleteTank={() => handleDeleteTank(tank)}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="p-4 rounded-full bg-primary/10 mb-4">
            <Rocket className="w-12 h-12 text-primary" />
          </div>
          <h3 className="text-xl font-semibold mb-2">Let's Set Up Your Station!</h3>
          <p className="text-muted-foreground max-w-md mb-6">
            Start by adding your underground storage tanks. Then add nozzles and connect them to track fuel sales automatically.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button onClick={() => setIsAddTankModalOpen(true)} size="lg" disabled={!isOnline}>
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Tank
            </Button>
            <Button variant="outline" onClick={() => setIsAddNozzleModalOpen(true)} size="lg" disabled={!isOnline}>
              <Fuel className="w-4 h-4 mr-2" />
              Add a Nozzle
            </Button>
          </div>
        </div>
      )}

      {/* Tank-Nozzle Connection Modal */}
      <TankNozzleModal
        tank={selectedTank}
        isOpen={isConnectionModalOpen}
        onClose={() => {
          setIsConnectionModalOpen(false);
          setSelectedTank(null);
        }}
      />

      {/* Edit Tank Modal */}
      <EditTankModal
        tank={selectedTank}
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedTank(null);
        }}
      />

      {/* Delete Tank Dialog */}
      <DeleteTankDialog
        tank={selectedTank}
        isOpen={isDeleteDialogOpen}
        onClose={() => {
          setIsDeleteDialogOpen(false);
          setSelectedTank(null);
        }}
      />

      {/* Add Tank Modal */}
      <AddTankModal
        isOpen={isAddTankModalOpen}
        onClose={() => setIsAddTankModalOpen(false)}
      />

      {/* Add Nozzle Modal */}
      <AddNozzleModal
        isOpen={isAddNozzleModalOpen}
        onClose={() => setIsAddNozzleModalOpen(false)}
      />
    </div>
  );
}
