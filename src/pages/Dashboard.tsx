import { useNavigate } from 'react-router-dom';
import { 
  FileText, 
  Wallet,
  BadgeCheck,
  BookUser,
  ClipboardList
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePetrolPumpStore } from '@/store/petrol-pump-store';

interface ModuleTile {
  id: string;
  title: string;
  icon: React.ElementType;
  route: string;
  color: string;
  bgColor: string;
}

const moduleTiles: ModuleTile[] = [
  {
    id: 'daily-entry',
    title: 'Daily Entry',
    icon: FileText,
    route: '/daily-entry',
    color: 'text-blue-600',
    bgColor: 'bg-blue-500/10 hover:bg-blue-500/20 border-blue-500/20',
  },
  {
    id: 'sales-report',
    title: 'Sales Report',
    icon: ClipboardList,
    route: '/sales-report',
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-500/10 hover:bg-indigo-500/20 border-indigo-500/20',
  },
  {
    id: 'expenses',
    title: 'Expenses',
    icon: Wallet,
    route: '/expenses',
    color: 'text-red-600',
    bgColor: 'bg-red-500/10 hover:bg-red-500/20 border-red-500/20',
  },
  {
    id: 'staff-salary',
    title: 'Staff & Salary',
    icon: BadgeCheck,
    route: '/staff-salary',
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-500/10 hover:bg-cyan-500/20 border-cyan-500/20',
  },
  {
    id: 'debtors',
    title: 'Debtors',
    icon: BookUser,
    route: '/debtors',
    color: 'text-amber-600',
    bgColor: 'bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/20',
  },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const companyName = usePetrolPumpStore((state) => state.companySettings.name);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="text-center py-4">
        <h1 className="text-2xl font-bold text-foreground">
          {companyName || 'Petrol Pump Management'}
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Select a module to get started
        </p>
      </div>

      {/* Compact Grid of Module Tiles */}
      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 px-4">
        {moduleTiles.map((tile) => (
          <button
            key={tile.id}
            onClick={() => navigate(tile.route)}
            className={cn(
              "flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all duration-200",
              "hover:scale-[1.03] hover:shadow-md cursor-pointer",
              tile.bgColor
            )}
          >
            <div className={cn(
              "w-10 h-10 rounded-lg flex items-center justify-center",
              "bg-background/80 shadow-sm"
            )}>
              <tile.icon className={cn("w-5 h-5", tile.color)} />
            </div>
            <span className="text-xs font-medium text-foreground text-center leading-tight">
              {tile.title}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
