import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatAmount } from '@/lib/format';

interface AccountListItemProps {
  name: string;
  balance: number;
  onClick: () => void;
  subtitle?: string;
}

export function AccountListItem({
  name,
  balance,
  onClick,
  subtitle,
}: AccountListItemProps) {
  return (
    <button
      className="w-full flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors border-b border-border last:border-0 text-left"
      onClick={onClick}
    >
      <div className="flex-1 min-w-0">
        <p className="font-medium text-foreground truncate">{name}</p>
        {subtitle && (
          <p className="text-sm text-muted-foreground truncate">{subtitle}</p>
        )}
      </div>
      <div className="text-right shrink-0">
        <p className={cn(
          "font-mono font-medium",
          balance >= 0 ? 'text-foreground' : 'text-red-600'
        )}>
          {formatAmount(Math.abs(balance))}
        </p>
        <p className="text-xs text-muted-foreground">
          {balance >= 0 ? 'Dr' : 'Cr'}
        </p>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
    </button>
  );
}
