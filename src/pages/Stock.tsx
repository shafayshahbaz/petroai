import { useState, useEffect } from 'react';
import { usePurchaseStore } from '@/store/purchase-store';
import { TankCard } from '@/components/stock/TankCard';
import { TankNozzleModal } from '@/components/stock/TankNozzleModal';
import { EditTankModal } from '@/components/stock/EditTankModal';
import { DeleteTankDialog } from '@/components/stock/DeleteTankDialog';
import { AddTankModal } from '@/components/stock/AddTankModal';
import { AddNozzleModal } from '@/components/stock/AddNozzleModal';
import { Button } from '@/components/ui/button';
import { Plus, Database, Fuel, Rocket } from 'lucide-react';
import { UndergroundTank } from '@/types/purchase';

export default function Stock() {
  const { tanks, registeredNozzles, initializeTanks } = usePurchaseStore();
  const [selectedTank, setSelectedTank] = useState<UndergroundTank | null>(null);
  const [isConnectionModalOpen, setIsConnectionModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isAddTankModalOpen, setIsAddTankModalOpen] = useState(false);
  const [isAddNozzleModalOpen, setIsAddNozzleModalOpen] = useState(false);

  // Auto-trigger setup if no tanks AND no nozzles exist
  const isEmptyState = tanks.length === 0 && registeredNozzles.length === 0;

  useEffect(() => {
    initializeTanks();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [initializeTanks]);

  // Auto-open Add Tank modal for first-time setup
  useEffect(() => {
    if (isEmptyState) {
      // Small delay to ensure component is mounted
      const timer = setTimeout(() => setIsAddTankModalOpen(true), 300);
      return () => clearTimeout(timer);
    }
  }, [isEmptyState]);

  const handleManageConnections = (tank: UndergroundTank) => {
    setSelectedTank(tank);
    setIsConnectionModalOpen(true);
  };

  const handleEditTank = (tank: UndergroundTank) => {
    setSelectedTank(tank);
    setIsEditModalOpen(true);
  };

  const handleDeleteTank = (tank: UndergroundTank) => {
    setSelectedTank(tank);
    setIsDeleteDialogOpen(true);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header with Action Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Stock & Tank Manager</h1>
          <p className="text-muted-foreground">Monitor tank levels and manage nozzle connections</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setIsAddTankModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Tank
          </Button>
          <Button variant="outline" onClick={() => setIsAddNozzleModalOpen(true)}>
            <Fuel className="w-4 h-4 mr-2" />
            Add Nozzle
          </Button>
        </div>
      </div>

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
            <Button onClick={() => setIsAddTankModalOpen(true)} size="lg">
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Tank
            </Button>
            <Button variant="outline" onClick={() => setIsAddNozzleModalOpen(true)} size="lg">
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
