import { useMemo } from 'react';
import { 
  TrendingUp, 
  Droplets, 
  Receipt, 
  Wallet,
  Fuel,
  Package,
  AlertTriangle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { usePetrolPumpStore, calculateTotals } from '@/store/petrol-pump-store';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { format, subDays, parseISO } from 'date-fns';
import { FuelType, FUEL_TYPE_INFO } from '@/types/petrol-pump';
import { cn } from '@/lib/utils';

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 0,
  }).format(num);
}

export default function Dashboard() {
  const { entries, tanks, companySettings } = usePetrolPumpStore();

  const todayStats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const todayEntry = entries.find((e) => e.date === today);
    
    if (!todayEntry) {
      return {
        totalSales: 0,
        totalLiters: 0,
        totalExpenses: 0,
        closingCash: 0,
        fuelSales: { MS: { liters: 0, amount: 0 }, HSD: { liters: 0, amount: 0 }, POWER: { liters: 0, amount: 0 } },
        totalLubeAmount: 0,
        hasTodayData: false,
      };
    }

    const totals = calculateTotals(todayEntry);
    return {
      totalSales: totals.totalFuelAmount + totals.totalLubeAmount,
      totalLiters: totals.totalFuelLiters,
      totalExpenses: totals.totalExpenses + totals.totalBankDeposit + totals.totalUpi,
      closingCash: totals.closingCash,
      fuelSales: totals.fuelSales,
      totalLubeAmount: totals.totalLubeAmount,
      hasTodayData: true,
    };
  }, [entries]);

  const chartData = useMemo(() => {
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const dateStr = format(date, 'yyyy-MM-dd');
      const entry = entries.find((e) => e.date === dateStr);
      
      if (entry) {
        const totals = calculateTotals(entry);
        last7Days.push({
          date: format(date, 'dd MMM'),
          sales: totals.totalFuelAmount + totals.totalLubeAmount,
          liters: totals.totalFuelLiters,
        });
      } else {
        last7Days.push({
          date: format(date, 'dd MMM'),
          sales: 0,
          liters: 0,
        });
      }
    }
    return last7Days;
  }, [entries]);

  const recentEntries = useMemo(() => {
    return [...entries]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);
  }, [entries]);

  // Find tanks with low stock
  const lowStockTanks = tanks.filter((tank) => tank.currentStock <= tank.lowStockThreshold);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome to {companySettings.name || 'your Petrol Pump'}!
        </p>
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
                    FUEL_TYPE_INFO[tank.fuelType].color
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

      {/* Product-wise Sales Breakdown */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {(['MS', 'HSD', 'POWER'] as FuelType[]).map((fuelType) => (
          <Card key={fuelType}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {FUEL_TYPE_INFO[fuelType].name}
              </CardTitle>
              <span className={cn("w-3 h-3 rounded-full", FUEL_TYPE_INFO[fuelType].color)} />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold text-foreground">
                {formatCurrency(todayStats.fuelSales[fuelType].amount)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {formatNumber(todayStats.fuelSales[fuelType].liters)} L
              </p>
            </CardContent>
          </Card>
        ))}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Lube Sales
            </CardTitle>
            <Package className="w-4 h-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-foreground">
              {formatCurrency(todayStats.totalLubeAmount)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Oil & lubricants
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-primary">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Today's Total Sales
            </CardTitle>
            <TrendingUp className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {formatCurrency(todayStats.totalSales)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {todayStats.hasTodayData ? 'Updated today' : 'No entry for today'}
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-info">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Liters Sold
            </CardTitle>
            <Droplets className="w-4 h-4 text-info" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {formatNumber(todayStats.totalLiters)} L
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Total fuel dispensed
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-destructive">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Outflows
            </CardTitle>
            <Receipt className="w-4 h-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {formatCurrency(todayStats.totalExpenses)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Expenses, UPI & deposits
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-success">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Closing Cash
            </CardTitle>
            <Wallet className="w-4 h-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {formatCurrency(todayStats.closingCash)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Net balance
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tank-Wise Stock Status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Fuel className="w-5 h-5" />
            Tank Stock Levels
          </CardTitle>
          <CardDescription>Current fuel stock in each tank</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tanks.map((tank) => {
              const fillPercent = tank.capacity > 0 
                ? Math.min(100, (tank.currentStock / tank.capacity) * 100) 
                : 0;
              const isLowStock = tank.currentStock <= tank.lowStockThreshold;
              
              return (
                <div 
                  key={tank.id} 
                  className={cn(
                    "p-4 border rounded-lg",
                    isLowStock && "border-destructive bg-destructive/5"
                  )}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "w-3 h-3 rounded-full",
                        FUEL_TYPE_INFO[tank.fuelType].color
                      )} />
                      <span className="font-medium">{tank.name}</span>
                    </div>
                    {isLowStock && (
                      <AlertTriangle className="w-4 h-4 text-destructive" />
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Progress 
                      value={fillPercent} 
                      className={cn(
                        "h-3",
                        isLowStock && "[&>div]:bg-destructive"
                      )} 
                    />
                    <div className="flex justify-between text-sm">
                      <span className="font-mono font-semibold">
                        {formatNumber(tank.currentStock)} L
                      </span>
                      <span className="text-muted-foreground">
                        / {formatNumber(tank.capacity)} L
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {fillPercent.toFixed(1)}% full
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Sales Trend (Last 7 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="date" 
                    className="text-xs fill-muted-foreground"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <YAxis 
                    className="text-xs fill-muted-foreground"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number) => [formatCurrency(value), 'Sales']}
                  />
                  <Area
                    type="monotone"
                    dataKey="sales"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    fill="url(#salesGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Recent Entries */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Entries</CardTitle>
          </CardHeader>
          <CardContent>
            {recentEntries.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-8">
                No entries yet. Create your first daily entry to get started!
              </p>
            ) : (
              <div className="space-y-3">
                {recentEntries.map((entry) => {
                  const totals = calculateTotals(entry);
                  return (
                    <div
                      key={entry.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                    >
                      <div>
                        <p className="font-medium text-sm">
                          {format(parseISO(entry.date), 'dd MMM yyyy')}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {entry.shiftName || 'No shift name'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-sm">
                          {formatCurrency(totals.totalFuelAmount + totals.totalLubeAmount)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatNumber(totals.totalFuelLiters)} L
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
