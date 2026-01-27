import { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { formatAmount } from '@/lib/format';

interface AccountGroupCardProps {
  title: string;
  icon: LucideIcon;
  balance: number;
  accountCount: number;
  onClick: () => void;
  colorClass?: string;
}

export function AccountGroupCard({
  title,
  icon: Icon,
  balance,
  accountCount,
  onClick,
  colorClass = 'bg-primary/10 text-primary',
}: AccountGroupCardProps) {
  return (
    <Card
      className="cursor-pointer hover:border-primary hover:shadow-md transition-all"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={cn('p-2.5 rounded-lg', colorClass)}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground">{title}</h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              {accountCount} {accountCount === 1 ? 'account' : 'accounts'}
            </p>
          </div>
          <div className="text-right">
            <p className={cn(
              "font-bold font-mono",
              balance >= 0 ? 'text-green-600' : 'text-red-600'
            )}>
              {formatAmount(Math.abs(balance))}
            </p>
            <p className="text-xs text-muted-foreground">
              {balance >= 0 ? 'Dr' : 'Cr'}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
