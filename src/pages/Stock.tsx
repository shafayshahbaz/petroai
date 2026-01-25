import { useMemo } from 'react';
import { Droplets, AlertTriangle, Settings } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { usePetrolPumpStore } from '@/store/petrol-pump-store';
import { FuelType } from '@/types/petrol-pump';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

// Color mapping for fuel types
const FUEL_COLORS: Record<FuelType, { 
  primary: string; 
  gradient: string; 
  bg: string; 
  border: string;
  glow: string;
}> = {
  MS: { 
    primary: 'bg-orange-500', 
    gradient: 'from-orange-400 via-orange-500 to-orange-600',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/30',
    glow: 'shadow-orange-500/20',
  },
  HSD: { 
    primary: 'bg-blue-500', 
    gradient: 'from-blue-400 via-blue-500 to-blue-600',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
    glow: 'shadow-blue-500/20',
  },
  POWER: { 
    primary: 'bg-rose-500', 
    gradient: 'from-rose-400 via-rose-500 to-rose-600',
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/30',
    glow: 'shadow-rose-500/20',
  },
};

const FUEL_LABELS: Record<FuelType, string> = {
  MS: 'Petrol (MS)',
  HSD: 'Diesel (HSD)',
  POWER: 'Power (Premium)',
};

function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 0,
  }).format(num);
}

interface TankVisualizerProps {
  name: string;
  fuelType: FuelType;
  currentStock: number;
  capacity: number;
  lowStockThreshold: number;
}

function TankVisualizer({ name, fuelType, currentStock, capacity, lowStockThreshold }: TankVisualizerProps) {
  const fillPercent = capacity > 0 ? Math.min(100, Math.max(0, (currentStock / capacity) * 100)) : 0;
  const isLowStock = currentStock <= lowStockThreshold;
  const colors = FUEL_COLORS[fuelType];

  return (
    <Card className={cn(
      "relative overflow-hidden transition-all duration-300 hover:shadow-xl",
      colors.border,
      colors.bg,
      isLowStock && "border-destructive bg-destructive/5"
    )}>
      <CardContent className="p-6">
        {/* Tank Info Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-lg text-foreground">{name}</h3>
            <p className={cn(
              "text-sm font-medium",
              fuelType === 'MS' && "text-orange-600",
              fuelType === 'HSD' && "text-blue-600",
              fuelType === 'POWER' && "text-rose-600"
            )}>
              {FUEL_LABELS[fuelType]}
            </p>
          </div>
          {isLowStock && (
            <div className="flex items-center gap-1 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              <span className="text-xs font-semibold">LOW</span>
            </div>
          )}
        </div>

        {/* Visual Tank Container */}
        <div className="relative mx-auto w-32 h-48 mb-4">
          {/* Tank Body */}
          <div className="absolute inset-0 rounded-b-3xl rounded-t-lg border-4 border-muted-foreground/30 bg-muted/30 overflow-hidden">
            {/* Liquid Fill */}
            <div 
              className={cn(
                "absolute bottom-0 left-0 right-0 transition-all duration-700 ease-out",
                "bg-gradient-to-t",
                colors.gradient
              )}
              style={{ height: `${fillPercent}%` }}
            >
              {/* Wave Animation */}
              <div className="absolute top-0 left-0 right-0 h-4 overflow-hidden">
                <div 
                  className={cn(
                    "absolute w-[200%] h-4 animate-wave",
                    colors.primary,
                    "opacity-60"
                  )}
                  style={{
                    borderRadius: '40%',
                    top: '-8px',
                    left: '-25%',
                  }}
                />
              </div>
            </div>

            {/* Tank Markings */}
            <div className="absolute inset-x-0 top-0 bottom-0 flex flex-col justify-between py-2 px-1">
              {[100, 75, 50, 25, 0].map((mark) => (
                <div 
                  key={mark} 
                  className="flex items-center gap-1"
                  style={{ opacity: mark === 0 ? 0 : 1 }}
                >
                  <div className="w-2 h-0.5 bg-muted-foreground/40" />
                  <span className="text-[10px] text-muted-foreground/60">{mark}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* Tank Cap */}
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-12 h-4 bg-muted-foreground/50 rounded-t-lg" />
        </div>

        {/* Stats */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <Droplets className={cn(
              "w-5 h-5",
              fuelType === 'MS' && "text-orange-500",
              fuelType === 'HSD' && "text-blue-500",
              fuelType === 'POWER' && "text-rose-500"
            )} />
            <span className="font-mono text-2xl font-bold text-foreground">
              {formatNumber(currentStock)}
            </span>
            <span className="text-muted-foreground">L</span>
          </div>
          <div className="text-sm text-muted-foreground">
            of {formatNumber(capacity)} L capacity
          </div>
          <div className={cn(
            "inline-block px-3 py-1 rounded-full text-sm font-semibold",
            fillPercent >= 50 && "bg-emerald-500/20 text-emerald-600",
            fillPercent >= 25 && fillPercent < 50 && "bg-amber-500/20 text-amber-600",
            fillPercent < 25 && "bg-destructive/20 text-destructive"
          )}>
            {fillPercent.toFixed(1)}% Full
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Stock() {
  const navigate = useNavigate();
  const { tanks } = usePetrolPumpStore();

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

  const lowStockTanks = tanks.filter((tank) => tank.currentStock <= tank.lowStockThreshold);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Droplets className="w-7 h-7" />
            Stock & Tanks
          </h1>
          <p className="text-muted-foreground">
            Monitor your fuel inventory across all tanks
          </p>
        </div>
        <Button 
          variant="outline" 
          onClick={() => navigate('/settings')}
          className="gap-2"
        >
          <Settings className="w-4 h-4" />
          Configure Tanks
        </Button>
      </div>

      {/* Low Stock Warnings */}
      {lowStockTanks.length > 0 && (
        <Card className="border-destructive bg-destructive/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-destructive flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Low Stock Warning
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {lowStockTanks.map((tank) => (
                <div 
                  key={tank.id} 
                  className="flex items-center gap-2 px-3 py-2 bg-destructive/10 rounded-lg border border-destructive/20"
                >
                  <span className={cn(
                    "w-3 h-3 rounded-full",
                    FUEL_COLORS[tank.fuelType].primary
                  )} />
                  <span className="font-medium">{tank.name}</span>
                  <span className="text-destructive font-mono">
                    {formatNumber(tank.currentStock)} L
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {(['MS', 'HSD', 'POWER'] as FuelType[]).map((fuelType) => {
          const totals = totalsByType[fuelType];
          const fillPercent = totals.capacity > 0 ? (totals.current / totals.capacity) * 100 : 0;
          const colors = FUEL_COLORS[fuelType];
          
          return (
            <Card key={fuelType} className={cn("border-2", colors.border, colors.bg)}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Total {FUEL_LABELS[fuelType]}
                    </p>
                    <p className="text-2xl font-bold font-mono">
                      {formatNumber(totals.current)} L
                    </p>
                  </div>
                  <div className={cn(
                    "w-12 h-12 rounded-full flex items-center justify-center",
                    colors.primary,
                    "text-white"
                  )}>
                    <Droplets className="w-6 h-6" />
                  </div>
                </div>
                <div className="mt-3">
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className={cn("h-full bg-gradient-to-r", colors.gradient)}
                      style={{ width: `${fillPercent}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {fillPercent.toFixed(1)}% of {formatNumber(totals.capacity)} L
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
            <div className="flex items-center gap-2 mb-4">
              <div className={cn("w-4 h-4 rounded-full", colors.primary)} />
              <h2 className="text-xl font-semibold text-foreground">
                {FUEL_LABELS[fuelType]} Tanks
              </h2>
              <span className="text-muted-foreground">({typeTanks.length})</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {typeTanks.map((tank) => (
                <TankVisualizer
                  key={tank.id}
                  name={tank.name}
                  fuelType={tank.fuelType}
                  currentStock={tank.currentStock}
                  capacity={tank.capacity}
                  lowStockThreshold={tank.lowStockThreshold}
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
    </div>
  );
}
