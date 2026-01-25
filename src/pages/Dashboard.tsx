import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  FileText, 
  Truck, 
  Database, 
  Wallet,
  BadgeCheck,
  BookUser
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { usePetrolPumpStore } from '@/store/petrol-pump-store';
import { cn } from '@/lib/utils';

interface NavigationCard {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  route: string;
  color: string;
  bgColor: string;
}

const navigationCards: NavigationCard[] = [
  {
    id: 'sales-person',
    title: 'Sales by Person',
    description: 'Track individual staff sales performance',
    icon: Users,
    route: '/sales-by-person',
    color: 'text-blue-600',
    bgColor: 'bg-blue-500/10 hover:bg-blue-500/20',
  },
  {
    id: 'daily-report',
    title: 'Total Sales / Daily Report',
    description: 'View and manage daily sales entries',
    icon: FileText,
    route: '/daily-entry',
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-500/10 hover:bg-emerald-500/20',
  },
  {
    id: 'purchases',
    title: 'Purchases',
    description: 'TT unloading and invoice management',
    icon: Truck,
    route: '/stock-purchases',
    color: 'text-orange-600',
    bgColor: 'bg-orange-500/10 hover:bg-orange-500/20',
  },
  {
    id: 'stock',
    title: 'Stock',
    description: 'View tank levels and fuel inventory',
    icon: Database,
    route: '/stock',
    color: 'text-purple-600',
    bgColor: 'bg-purple-500/10 hover:bg-purple-500/20',
  },
  {
    id: 'expenses',
    title: 'Expenses',
    description: 'Track and manage daily expenses',
    icon: Wallet,
    route: '/expenses',
    color: 'text-red-600',
    bgColor: 'bg-red-500/10 hover:bg-red-500/20',
  },
  {
    id: 'staff-salary',
    title: 'Staff & Salary',
    description: 'Manage staff records and payroll',
    icon: BadgeCheck,
    route: '/staff-salary',
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-500/10 hover:bg-cyan-500/20',
  },
  {
    id: 'debtors',
    title: 'Debtor/Credit Accounts',
    description: 'Track customer credit and outstanding dues',
    icon: BookUser,
    route: '/debtors',
    color: 'text-amber-600',
    bgColor: 'bg-amber-500/10 hover:bg-amber-500/20',
  },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const companyName = usePetrolPumpStore((state) => state.companySettings.name);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="text-center py-4">
        <h1 className="text-3xl font-bold text-foreground">
          {companyName || 'Petrol Pump Management'}
        </h1>
        <p className="text-muted-foreground mt-2">
          Select a module to get started
        </p>
      </div>

      {/* Navigation Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 px-4">
        {navigationCards.map((card) => (
          <Card
            key={card.id}
            className={cn(
              "cursor-pointer transition-all duration-300 transform hover:scale-[1.02] hover:shadow-lg border-2 border-transparent hover:border-primary/20",
              card.bgColor
            )}
            onClick={() => navigate(card.route)}
          >
            <CardContent className="p-6 flex flex-col items-center text-center min-h-[180px] justify-center gap-4">
              <div className={cn(
                "w-16 h-16 rounded-2xl flex items-center justify-center",
                "bg-background shadow-sm"
              )}>
                <card.icon className={cn("w-8 h-8", card.color)} />
              </div>
              <div>
                <h3 className="font-semibold text-lg text-foreground">
                  {card.title}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {card.description}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
