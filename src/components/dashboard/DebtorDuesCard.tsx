import { Users, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatRupees } from '@/lib/format';
import { useCloudData } from '@/contexts/CloudDataContext';

export function DebtorDuesCard() {
  const { debtors } = useCloudData();
  const navigate = useNavigate();

  const total = debtors.reduce((s, d) => s + (Number(d.total_outstanding) || 0), 0);
  const sorted = [...debtors].sort(
    (a, b) => (Number(b.total_outstanding) || 0) - (Number(a.total_outstanding) || 0)
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-primary" />
          <CardTitle className="text-base">Debtor Dues</CardTitle>
        </div>
        <span className="text-lg font-bold">{formatRupees(total)}</span>
      </CardHeader>
      <CardContent>
        {sorted.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">No debtors yet</p>
        ) : (
          <div className="divide-y max-h-72 overflow-y-auto">
            {sorted.map((d) => (
              <button
                key={d.id}
                onClick={() => navigate('/debtors')}
                className="w-full flex items-center justify-between py-2 px-1 text-left hover:bg-muted/50 rounded transition-colors"
              >
                <span className="text-sm font-medium truncate">{d.name}</span>
                <span className="flex items-center gap-1">
                  <span
                    className={
                      Number(d.total_outstanding) > 0
                        ? 'text-red-600 font-semibold text-sm'
                        : 'text-green-600 font-semibold text-sm'
                    }
                  >
                    {formatRupees(Number(d.total_outstanding) || 0)}
                  </span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </span>
              </button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
