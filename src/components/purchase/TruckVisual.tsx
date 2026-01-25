import { TruckChamber } from '@/types/purchase';
import { cn } from '@/lib/utils';

interface TruckVisualProps {
  chambers: TruckChamber[];
  className?: string;
}

const fuelColors: Record<string, string> = {
  MS: 'bg-green-500',
  HSD: 'bg-amber-600',
  POWER: 'bg-blue-500',
};

const fuelLabels: Record<string, string> = {
  MS: 'MS',
  HSD: 'HSD',
  POWER: 'PWR',
};

export function TruckVisual({ chambers, className }: TruckVisualProps) {
  if (chambers.length === 0) {
    return (
      <div className={cn("flex items-center justify-center p-8 border-2 border-dashed rounded-lg bg-muted/30", className)}>
        <p className="text-muted-foreground">Select number of chambers to see truck layout</p>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col items-center gap-4", className)}>
      {/* Truck body */}
      <div className="relative flex items-end gap-1">
        {/* Truck cab */}
        <div className="w-16 h-20 bg-sidebar rounded-t-lg rounded-bl-lg border-2 border-sidebar-border flex items-center justify-center">
          <div className="w-8 h-8 bg-background rounded border" />
        </div>
        
        {/* Tank compartments */}
        <div className="flex gap-0.5 bg-muted p-1 rounded-lg border-2 border-border">
          {chambers.map((chamber, index) => (
            <div
              key={chamber.id}
              className={cn(
                "flex flex-col items-center justify-center rounded transition-all",
                chamber.fuelType ? fuelColors[chamber.fuelType] : 'bg-muted-foreground/20',
                "text-white font-bold"
              )}
              style={{
                width: `${Math.max(40, Math.min(80, chamber.capacity / 100))}px`,
                height: '60px',
              }}
            >
              <span className="text-xs">C{index + 1}</span>
              {chamber.fuelType && (
                <span className="text-[10px] opacity-80">{fuelLabels[chamber.fuelType]}</span>
              )}
              {chamber.capacity > 0 && (
                <span className="text-[9px] opacity-70">{chamber.capacity}L</span>
              )}
            </div>
          ))}
        </div>
        
        {/* Wheels */}
        <div className="absolute -bottom-3 left-8 flex gap-1">
          <div className="w-6 h-6 bg-foreground rounded-full" />
          <div className="w-6 h-6 bg-foreground rounded-full" />
        </div>
        <div className="absolute -bottom-3 right-4 flex gap-1">
          <div className="w-6 h-6 bg-foreground rounded-full" />
          <div className="w-6 h-6 bg-foreground rounded-full" />
        </div>
      </div>
      
      {/* Legend */}
      <div className="flex gap-4 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-green-500" />
          <span>MS</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-amber-600" />
          <span>HSD</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-blue-500" />
          <span>Power</span>
        </div>
      </div>
    </div>
  );
}
