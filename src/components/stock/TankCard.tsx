import { UndergroundTank } from '@/types/purchase';
import { usePurchaseStore } from '@/store/purchase-store';
import { formatLiters } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Link2, Droplets, Pencil, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TankCardProps {
  tank: UndergroundTank;
  onManageConnections: () => void;
  onEditTank: () => void;
  onDeleteTank: () => void;
}

// Get fuel color based on type
const getFuelColor = (fuelType: string) => {
  switch (fuelType) {
    case 'MS':
      return '#DB9121'; // Orange
    case 'HSD':
      return '#2A71B8'; // Blue
    case 'POWER':
      return '#E8665D'; // Pink/Red
    default:
      return '#6B7280'; // Gray
  }
};

export function TankCard({ tank, onManageConnections, onEditTank, onDeleteTank }: TankCardProps) {
  const { getNozzlesForTank } = usePurchaseStore();
  const connectedNozzles = getNozzlesForTank ? getNozzlesForTank(tank.id) : [];
  
  const fillPercentage = Math.min(100, Math.max(0, (tank.currentStock / tank.capacity) * 100));
  const fuelColor = getFuelColor(tank.fuelType);
  
  // Determine fill status
  const isLow = fillPercentage < 20;
  const isCritical = fillPercentage < 10;

  return (
    <div className="bg-card border-2 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      {/* Tank Header */}
      <div className="p-4 border-b bg-muted/30">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-lg">{tank.name}</h3>
            <span 
              className="text-xs font-medium px-2 py-0.5 rounded-full"
              style={{ 
                backgroundColor: `${fuelColor}20`,
                color: fuelColor
              }}
            >
              {tank.fuelType}
            </span>
          </div>
          <div className={cn(
            "text-2xl font-bold tabular-nums",
            isCritical && "text-destructive animate-pulse",
            isLow && !isCritical && "text-amber-500"
          )}>
            {fillPercentage.toFixed(0)}%
          </div>
        </div>
      </div>

      {/* Horizontal Tank Visual */}
      <div className="p-4">
        <div 
          className="relative h-28 rounded-xl overflow-hidden border-4"
          style={{ 
            backgroundColor: '#3D2B1F', // Brown container
            borderColor: '#5D4E37'
          }}
        >
          {/* Tank Inner Container (metallic look) */}
          <div 
            className="absolute inset-1 rounded-lg overflow-hidden"
            style={{ backgroundColor: '#2D2218' }}
          >
            {/* Liquid Fill */}
            <div 
              className="absolute bottom-0 left-0 right-0 transition-all duration-700 ease-out"
              style={{ 
                height: `${fillPercentage}%`,
                background: `linear-gradient(to top, ${fuelColor}, ${fuelColor}CC)`,
              }}
            >
              {/* Wave Animation */}
              <svg 
                className="absolute top-0 left-0 w-full" 
                style={{ transform: 'translateY(-50%)' }}
                viewBox="0 0 200 20" 
                preserveAspectRatio="none"
              >
                <path 
                  d="M0 10 Q 25 0, 50 10 T 100 10 T 150 10 T 200 10 V 20 H 0 Z"
                  fill={fuelColor}
                  className="animate-wave"
                />
              </svg>
              
              {/* Bubble effects */}
              {fillPercentage > 5 && (
                <div className="absolute inset-0 overflow-hidden">
                  <div 
                    className="absolute w-2 h-2 rounded-full bg-white/20 animate-bubble-1"
                    style={{ left: '20%', bottom: '10%' }}
                  />
                  <div 
                    className="absolute w-1.5 h-1.5 rounded-full bg-white/15 animate-bubble-2"
                    style={{ left: '60%', bottom: '20%' }}
                  />
                  <div 
                    className="absolute w-1 h-1 rounded-full bg-white/10 animate-bubble-3"
                    style={{ left: '80%', bottom: '5%' }}
                  />
                </div>
              )}
            </div>

            {/* Overlay text on tank */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center text-white drop-shadow-lg">
                <div className="text-xl font-bold tabular-nums">
                  {formatLiters(tank.currentStock)} L
                </div>
                <div className="text-xs opacity-75">
                  of {formatLiters(tank.capacity)} L
                </div>
              </div>
            </div>
          </div>

          {/* Tank end caps */}
          <div 
            className="absolute left-0 top-0 bottom-0 w-3 rounded-l-xl"
            style={{ backgroundColor: '#5D4E37' }}
          />
          <div 
            className="absolute right-0 top-0 bottom-0 w-3 rounded-r-xl"
            style={{ backgroundColor: '#5D4E37' }}
          />
        </div>
      </div>

      {/* Status Bar */}
      <div className="px-4 pb-2">
        <div className="w-full bg-muted rounded-full h-1.5">
          <div 
            className="h-1.5 rounded-full transition-all duration-500"
            style={{ 
              width: `${fillPercentage}%`,
              backgroundColor: isCritical ? '#dc2626' : isLow ? '#f59e0b' : fuelColor
            }}
          />
        </div>
        {isCritical && (
          <p className="text-xs text-destructive font-medium mt-1 flex items-center gap-1">
            <Droplets className="w-3 h-3" />
            Dead Stock Warning
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="p-4 pt-2 border-t space-y-2">
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            className="flex-1" 
            onClick={onManageConnections}
          >
            <Link2 className="w-4 h-4 mr-2" />
            Connections
          </Button>
          <Button 
            variant="outline" 
            size="icon"
            onClick={onEditTank}
            title="Edit Tank"
          >
            <Pencil className="w-4 h-4" />
          </Button>
          <Button 
            variant="outline" 
            size="icon"
            onClick={onDeleteTank}
            title="Delete Tank"
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <style>{`
        @keyframes wave {
          0%, 100% { d: path("M0 10 Q 25 0, 50 10 T 100 10 T 150 10 T 200 10 V 20 H 0 Z"); }
          50% { d: path("M0 10 Q 25 20, 50 10 T 100 10 T 150 10 T 200 10 V 20 H 0 Z"); }
        }
        .animate-wave {
          animation: wave 3s ease-in-out infinite;
        }
        @keyframes bubble-rise-1 {
          0% { transform: translateY(0) scale(1); opacity: 0.3; }
          100% { transform: translateY(-100px) scale(0.5); opacity: 0; }
        }
        @keyframes bubble-rise-2 {
          0% { transform: translateY(0) scale(1); opacity: 0.2; }
          100% { transform: translateY(-80px) scale(0.3); opacity: 0; }
        }
        @keyframes bubble-rise-3 {
          0% { transform: translateY(0) scale(1); opacity: 0.25; }
          100% { transform: translateY(-60px) scale(0.4); opacity: 0; }
        }
        .animate-bubble-1 { animation: bubble-rise-1 4s ease-in-out infinite; }
        .animate-bubble-2 { animation: bubble-rise-2 3s ease-in-out infinite 1s; }
        .animate-bubble-3 { animation: bubble-rise-3 3.5s ease-in-out infinite 0.5s; }
      `}</style>
    </div>
  );
}
