import { cn } from '@/lib/utils';
import { formatLiters } from '@/lib/format';

interface Props {
  label: string;
  fuelType: 'MS' | 'HSD' | 'POWER';
  currentStock: number;
  capacity: number;
  avgDaily: number; // 7-day avg consumption
}

const COLORS: Record<string, { fill: string; light: string; stroke: string }> = {
  MS:    { fill: '#f59e0b', light: '#fde68a', stroke: '#b45309' },
  HSD:   { fill: '#10b981', light: '#a7f3d0', stroke: '#047857' },
  POWER: { fill: '#3b82f6', light: '#bfdbfe', stroke: '#1d4ed8' },
};

export function LiquidTank({ label, fuelType, currentStock, capacity, avgDaily }: Props) {
  const pct = capacity > 0 ? Math.max(0, Math.min(100, (currentStock / capacity) * 100)) : 0;
  const colors = COLORS[fuelType];

  const reorderThreshold = avgDaily * 3;
  const reorderNeeded = avgDaily > 0 && currentStock < reorderThreshold;
  const suggestedOrder = Math.max(0, avgDaily * 7 - currentStock);

  // Liquid fill height (SVG viewBox 100x140)
  const fillHeight = (pct / 100) * 120;
  const fillY = 130 - fillHeight;

  return (
    <div className="flex flex-col items-center gap-2 p-3 rounded-lg border bg-card">
      <h4 className="text-sm font-semibold text-foreground">{label}</h4>
      <div className="relative">
        <svg width="90" height="140" viewBox="0 0 100 140" className="overflow-visible">
          <defs>
            <clipPath id={`tank-clip-${fuelType}`}>
              <rect x="10" y="10" width="80" height="120" rx="8" />
            </clipPath>
          </defs>
          {/* Tank outline */}
          <rect
            x="10" y="10" width="80" height="120" rx="8"
            fill="none" stroke={colors.stroke} strokeWidth="2"
          />
          {/* Liquid */}
          <g clipPath={`url(#tank-clip-${fuelType})`}>
            <rect x="10" y={fillY} width="80" height={fillHeight} fill={colors.fill} opacity="0.85" />
            {/* Wave animation */}
            <path
              d={`M 10 ${fillY} Q 30 ${fillY - 4} 50 ${fillY} T 90 ${fillY} V 130 H 10 Z`}
              fill={colors.light}
              opacity="0.6"
            >
              <animate
                attributeName="d"
                dur="3s"
                repeatCount="indefinite"
                values={`
                  M 10 ${fillY} Q 30 ${fillY - 4} 50 ${fillY} T 90 ${fillY} V 130 H 10 Z;
                  M 10 ${fillY} Q 30 ${fillY + 4} 50 ${fillY} T 90 ${fillY} V 130 H 10 Z;
                  M 10 ${fillY} Q 30 ${fillY - 4} 50 ${fillY} T 90 ${fillY} V 130 H 10 Z
                `}
              />
            </path>
          </g>
          {/* Percentage label */}
          <text
            x="50" y="78"
            textAnchor="middle"
            className="fill-foreground"
            fontSize="14"
            fontWeight="700"
          >
            {pct.toFixed(0)}%
          </text>
        </svg>
      </div>
      <div className="text-center">
        <div className="text-sm font-semibold">{formatLiters(currentStock)} L</div>
        <div className="text-xs text-muted-foreground">of {formatLiters(capacity)} L</div>
      </div>
      <div
        className={cn(
          'text-xs font-medium px-2 py-1 rounded-full w-full text-center',
          reorderNeeded
            ? 'bg-red-100 text-red-700 border border-red-200'
            : 'bg-green-100 text-green-700 border border-green-200'
        )}
      >
        {reorderNeeded
          ? `Place Order (~${formatLiters(suggestedOrder)} L)`
          : 'Stock OK'}
      </div>
    </div>
  );
}
