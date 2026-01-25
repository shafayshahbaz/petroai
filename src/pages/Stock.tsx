import { useState, useEffect } from 'react';
import { usePurchaseStore } from '@/store/purchase-store';
import { usePetrolPumpStore } from '@/store/petrol-pump-store';
import { TankCard } from '@/components/stock/TankCard';
import { TankNozzleModal } from '@/components/stock/TankNozzleModal';
import { Button } from '@/components/ui/button';
import { Plus, Database } from 'lucide-react';
import { UndergroundTank } from '@/types/purchase';

export default function Stock() {
  const { tanks, initializeTanks } = usePurchaseStore();
  const [selectedTank, setSelectedTank] = useState<UndergroundTank | null>(null);
  const [isConnectionModalOpen, setIsConnectionModalOpen] = useState(false);

  useEffect(() => {
    initializeTanks();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [initializeTanks]);

  const handleManageConnections = (tank: UndergroundTank) => {
    setSelectedTank(tank);
    setIsConnectionModalOpen(true);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Stock & Tank Manager</h1>
          <p className="text-muted-foreground">Monitor tank levels and manage nozzle connections</p>
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
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="p-4 rounded-full bg-muted mb-4">
            <Database className="w-12 h-12 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium mb-2">No Tanks Configured</h3>
          <p className="text-muted-foreground max-w-md mb-4">
            Tanks will be automatically created when you complete your first tanker unloading entry.
          </p>
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
    </div>
  );
}
