import { useState, useMemo } from 'react';
import { Droplets, AlertTriangle, Settings, Info, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { usePetrolPumpStore } from '@/store/petrol-pump-store';
import { FuelType, Tank } from '@/types/petrol-pump';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

// Color mapping for fuel types - MS=Orange, HSD=Blue, POWER=Pink/Purple
const FUEL_COLORS: Record<FuelType, { 
  primary: string; 
  gradient: string; 
  bg: string; 
  border: string;
  text: string;
  wave: string;
}> = {
  MS: { 
    primary: 'bg-amber-500', 
    gradient: 'from-amber-400 via-amber-500 to-orange-600',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    text: 'text-amber-600',
    wave: 'bg-amber-400',
  },
  HSD: { 
    primary: 'bg-blue-600', 
    gradient: 'from-blue-400 via-blue-500 to-indigo-600',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
    text: 'text-blue-600',
    wave: 'bg-blue-400',
  },
  POWER: { 
    primary: 'bg-pink-500', 
    gradient: 'from-pink-400 via-pink-500 to-purple-600',
    bg: 'bg-pink-500/10',
    border: 'border-pink-500/30',
    text: 'text-pink-600',
    wave: 'bg-pink-400',
  },
};

const FUEL_LABELS: Record<FuelType, string> = {
  MS: 'Petrol (MS)',
  HSD: 'Diesel (HSD)',
  POWER: 'Power',
};

function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 0,
  }).format(num);
}

interface TankVisualizerProps {
  tank: Tank;
  onClick: () => void;
}

// Horizontal tank with liquid fill animation
function TankVisualizer({ tank, onClick }: TankVisualizerProps) {
  const { name, fuelType, currentStock, capacity, lowStockThreshold } = tank;
  const fillPercent = capacity > 0 ? Math.min(100, Math.max(0, (currentStock / capacity) * 100)) : 0;
  const isLowStock = currentStock <= lowStockThreshold;
  const colors = FUEL_COLORS[fuelType];

  return (
    <Card 
      className={cn(
        "relative overflow-hidden transition-all duration-300 hover:shadow-xl cursor-pointer group",
        colors.border,
        colors.bg,
        isLowStock && "border-destructive bg-destructive/5"
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        {/* Tank Info Header */}
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-bold text-foreground">{name}</h3>
            <p className={cn("text-xs font-medium", colors.text)}>
              {FUEL_LABELS[fuelType]}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isLowStock && (
              <div className="flex items-center gap-1 text-destructive">
                <AlertTriangle className="w-4 h-4" />
              </div>
            )}
            <Info className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>

        {/* Horizontal Tank Container - Liquid Fill Style */}
        <div className="relative h-20 w-full mb-3">
          {/* Tank Body - Horizontal Cylinder Shape */}
          <div className="absolute inset-0 rounded-full border-4 border-muted-foreground/20 bg-muted/40 overflow-hidden">
            {/* Liquid Fill */}
            <div 
              className={cn(
                "absolute bottom-0 left-0 top-0 transition-all duration-700 ease-out",
                "bg-gradient-to-r",
                colors.gradient
              )}
              style={{ width: `${fillPercent}%` }}
            >
              {/* Wave Animation on the edge */}
              <div className="absolute top-0 bottom-0 right-0 w-4 overflow-hidden">
                <div 
                  className={cn(
                    "absolute h-[200%] w-4 animate-wave",
                    colors.wave,
                    "opacity-70"
                  )}
                  style={{
                    borderRadius: '50%',
                    right: '-2px',
                  }}
                />
              </div>
              
              {/* Bubble Effects */}
              <div className="absolute inset-0 overflow-hidden">
                <div className="absolute bottom-2 left-[20%] w-2 h-2 rounded-full bg-white/30 animate-bounce" style={{ animationDelay: '0s' }} />
                <div className="absolute bottom-4 left-[40%] w-1.5 h-1.5 rounded-full bg-white/25 animate-bounce" style={{ animationDelay: '0.5s' }} />
                <div className="absolute bottom-3 left-[60%] w-1 h-1 rounded-full bg-white/20 animate-bounce" style={{ animationDelay: '1s' }} />
              </div>
            </div>

            {/* Tank Markings */}
            <div className="absolute inset-0 flex items-center justify-between px-4">
              {[0, 25, 50, 75, 100].map((mark) => (
                <div 
                  key={mark} 
                  className="h-2 w-0.5 bg-muted-foreground/20"
                />
              ))}
            </div>
          </div>

          {/* End caps for cylinder look */}
          <div className="absolute left-0 top-0 bottom-0 w-4 rounded-l-full bg-muted-foreground/10 border-l-4 border-muted-foreground/20" />
          <div className="absolute right-0 top-0 bottom-0 w-4 rounded-r-full bg-muted-foreground/10 border-r-4 border-muted-foreground/20" />
        </div>

        {/* Stats */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <Droplets className={cn("w-4 h-4", colors.text)} />
            <span className="font-mono text-lg font-bold text-foreground">
              {formatNumber(currentStock)} L
            </span>
          </div>
          <div className={cn(
            "px-2 py-0.5 rounded-full text-xs font-semibold",
            fillPercent >= 50 && "bg-emerald-500/20 text-emerald-600",
            fillPercent >= 25 && fillPercent < 50 && "bg-amber-500/20 text-amber-600",
            fillPercent < 25 && "bg-destructive/20 text-destructive"
          )}>
            {fillPercent.toFixed(0)}%
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface TankDetailsModalProps {
  tank: Tank | null;
  isOpen: boolean;
  onClose: () => void;
  connectedNozzles: Array<{ id: string; label: string; machineName: string; machineId: string }>;
}

function TankDetailsModal({ tank, isOpen, onClose, connectedNozzles }: TankDetailsModalProps) {
  if (!tank) return null;
  
  const colors = FUEL_COLORS[tank.fuelType];
  const fillPercent = tank.capacity > 0 ? (tank.currentStock / tank.capacity) * 100 : 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className={cn("w-3 h-3 rounded-full", colors.primary)} />
            {tank.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Tank Details */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground">Fuel Type</p>
              <p className={cn("font-semibold", colors.text)}>{FUEL_LABELS[tank.fuelType]}</p>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground">Fill Level</p>
              <p className="font-semibold">{fillPercent.toFixed(1)}%</p>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground">Current Stock</p>
              <p className="font-mono font-semibold">{formatNumber(tank.currentStock)} L</p>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground">Capacity</p>
              <p className="font-mono font-semibold">{formatNumber(tank.capacity)} L</p>
            </div>
          </div>

          {/* Extended Tank Info */}
          <div className="border-t pt-4">
            <h4 className="text-sm font-semibold mb-3">Tank Readings</h4>
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 bg-muted/30 rounded-lg text-center">
                <p className="text-xs text-muted-foreground">Dip Reading</p>
                <p className="font-mono font-semibold">{tank.dipReading ?? '--'}</p>
              </div>
              <div className="p-3 bg-muted/30 rounded-lg text-center">
                <p className="text-xs text-muted-foreground">Water Level</p>
                <p className="font-mono font-semibold">{tank.waterLevel ?? '--'} mm</p>
              </div>
              <div className="p-3 bg-muted/30 rounded-lg text-center">
                <p className="text-xs text-muted-foreground">Temperature</p>
                <p className="font-mono font-semibold">{tank.temperature ?? '--'}°C</p>
              </div>
            </div>
          </div>

          {/* Connected Nozzles */}
          <div className="border-t pt-4">
            <h4 className="text-sm font-semibold mb-3">Connected Nozzles</h4>
            {connectedNozzles.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {connectedNozzles.map((nozzle) => (
                  <div
                    key={nozzle.id}
                    className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg"
                  >
                    <span className={cn("w-2 h-2 rounded-full", colors.primary)} />
                    <span className="text-sm font-medium">{nozzle.machineName}</span>
                    <span className="text-muted-foreground">→</span>
                    <span className="font-mono text-sm">{nozzle.label}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No nozzles connected to this tank</p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function Stock() {
  const navigate = useNavigate();
  const { tanks, machines } = usePetrolPumpStore();
  const [selectedTank, setSelectedTank] = useState<Tank | null>(null);

  // Group tanks by fuel type
  const tanksByType = useMemo(() => {
    const grouped: Record<FuelType, typeof tanks> = {
      MS: [],
      HSD: [],
      POWER: [],
    };
    
    tanks.forEach((tank) => {
      grouped[tank.fuelType].push(tank);
    });
    
    return grouped;
  }, [tanks]);

  // Calculate totals by fuel type
  const totalsByType = useMemo(() => {
    const totals: Record<FuelType, { current: number; capacity: number }> = {
      MS: { current: 0, capacity: 0 },
      HSD: { current: 0, capacity: 0 },
      POWER: { current: 0, capacity: 0 },
    };
    
    tanks.forEach((tank) => {
      totals[tank.fuelType].current += tank.currentStock;
      totals[tank.fuelType].capacity += tank.capacity;
    });
    
    return totals;
  }, [tanks]);

  // Get connected nozzles for a tank
  const getConnectedNozzles = (tankId: string) => {
    const nozzles: Array<{ id: string; label: string; machineName: string; machineId: string }> = [];
    
    machines.forEach((machine) => {
      machine.nozzles.forEach((nozzle) => {
        if (nozzle.tankId === tankId) {
          nozzles.push({
            id: nozzle.id,
            label: nozzle.label,
            machineName: machine.name,
            machineId: machine.id,
          });
        }
      });
    });
    
    return nozzles;
  };

  const lowStockTanks = tanks.filter((tank) => tank.currentStock <= tank.lowStockThreshold);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Droplets className="w-7 h-7" />
            Stock & Tanks
          </h1>
          <p className="text-muted-foreground text-sm">
            Click on a tank to view details and connected nozzles
          </p>
        </div>
        <Button 
          variant="outline" 
          onClick={() => navigate('/settings')}
          className="gap-2"
        >
          <Settings className="w-4 h-4" />
          Configure
        </Button>
      </div>

      {/* Low Stock Warnings */}
      {lowStockTanks.length > 0 && (
        <Card className="border-destructive bg-destructive/5">
          <CardHeader className="py-3">
            <CardTitle className="text-destructive flex items-center gap-2 text-sm">
              <AlertTriangle className="w-4 h-4" />
              Low Stock Warning
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex flex-wrap gap-2">
              {lowStockTanks.map((tank) => (
                <button 
                  key={tank.id} 
                  onClick={() => setSelectedTank(tank)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-destructive/10 rounded-lg border border-destructive/20 hover:bg-destructive/20 transition-colors"
                >
                  <span className={cn("w-2 h-2 rounded-full", FUEL_COLORS[tank.fuelType].primary)} />
                  <span className="font-medium text-sm">{tank.name}</span>
                  <span className="text-destructive font-mono text-sm">
                    {formatNumber(tank.currentStock)} L
                  </span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        {(['MS', 'HSD', 'POWER'] as FuelType[]).map((fuelType) => {
          const totals = totalsByType[fuelType];
          const fillPercent = totals.capacity > 0 ? (totals.current / totals.capacity) * 100 : 0;
          const colors = FUEL_COLORS[fuelType];
          
          return (
            <Card key={fuelType} className={cn("border", colors.border, colors.bg)}>
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      {FUEL_LABELS[fuelType]}
                    </p>
                    <p className="text-xl font-bold font-mono">
                      {formatNumber(totals.current)}
                    </p>
                  </div>
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center",
                    colors.primary,
                    "text-white"
                  )}>
                    <Droplets className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-2">
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div 
                      className={cn("h-full bg-gradient-to-r", colors.gradient)}
                      style={{ width: `${fillPercent}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {fillPercent.toFixed(0)}% of {formatNumber(totals.capacity)} L
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Individual Tanks by Type */}
      {(['MS', 'HSD', 'POWER'] as FuelType[]).map((fuelType) => {
        const typeTanks = tanksByType[fuelType];
        if (typeTanks.length === 0) return null;
        
        const colors = FUEL_COLORS[fuelType];
        
        return (
          <div key={fuelType}>
            <div className="flex items-center gap-2 mb-3">
              <div className={cn("w-3 h-3 rounded-full", colors.primary)} />
              <h2 className="text-lg font-semibold text-foreground">
                {FUEL_LABELS[fuelType]}
              </h2>
              <span className="text-sm text-muted-foreground">({typeTanks.length})</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {typeTanks.map((tank) => (
                <TankVisualizer
                  key={tank.id}
                  tank={tank}
                  onClick={() => setSelectedTank(tank)}
                />
              ))}
            </div>
          </div>
        );
      })}

      {/* Empty State */}
      {tanks.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Droplets className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              No Tanks Configured
            </h3>
            <p className="text-muted-foreground mb-4">
              Set up your tanks in Settings to start tracking inventory
            </p>
            <Button onClick={() => navigate('/settings')}>
              Configure Tanks
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Tank Details Modal */}
      <TankDetailsModal
        tank={selectedTank}
        isOpen={!!selectedTank}
        onClose={() => setSelectedTank(null)}
        connectedNozzles={selectedTank ? getConnectedNozzles(selectedTank.id) : []}
      />
    </div>
  );
}
