import { 
  TrendingUp, 
  Droplets, 
  Wallet,
  Fuel
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useCloudData } from '@/contexts/CloudDataContext';
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
import { useMemo } from 'react';
import { DEFAULT_FUEL_RATES } from '@/types/petrol-pump';

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatNumber(num: number, decimals: number = 2): string {
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
}

// Helper function to calculate totals from cloud entry
function calculateCloudTotals(entry: any) {
  const fuelSales = {
    MS: { liters: 0, amount: 0 },
    HSD: { liters: 0, amount: 0 },
    POWER: { liters: 0, amount: 0 },
  };

  const rates = entry.fuel_rates || DEFAULT_FUEL_RATES;
  const testingDeduction = entry.testing_deduction || { MS: 0, HSD: 0, POWER: 0 };

  (entry.nozzles || []).forEach((nozzle: any) => {
    const liters = Math.max(0, (nozzle.closingReading || 0) - (nozzle.openingReading || 0));
    if (fuelSales[nozzle.fuelType as keyof typeof fuelSales]) {
      fuelSales[nozzle.fuelType as keyof typeof fuelSales].liters += liters;
    }
  });

  // Apply testing deductions and calculate amounts
  (['MS', 'HSD', 'POWER'] as const).forEach((fuelType) => {
    const netLiters = Math.max(0, fuelSales[fuelType].liters - (testingDeduction[fuelType] || 0));
    fuelSales[fuelType].amount = netLiters * (rates[fuelType] || 0);
  });

  const totalFuelLiters = fuelSales.MS.liters + fuelSales.HSD.liters + fuelSales.POWER.liters;
  const totalFuelAmount = fuelSales.MS.amount + fuelSales.HSD.amount + fuelSales.POWER.amount;
  const totalLubeAmount = (entry.lube_items || []).reduce((sum: number, item: any) => sum + (item.quantity || 0) * (item.rate || 0), 0);
  const totalIncomes = (entry.incomes || []).reduce((sum: number, item: any) => sum + (item.amount || 0), 0);
  const totalCreditSales = (entry.credit_sales || []).reduce((sum: number, item: any) => sum + (item.amount || 0), 0);
  const grandTotalIncome = totalFuelAmount + totalLubeAmount + totalIncomes + (entry.opening_balance || 0);
  const totalExpenses = (entry.expenses || []).reduce((sum: number, item: any) => sum + (item.amount || 0), 0) 
    + (entry.upi_collection || 0) 
    + (entry.cash_deposit || 0)
    + totalCreditSales;
  const cashInHand = grandTotalIncome - totalExpenses;

  return {
    fuelSales,
    totalFuelLiters,
    totalFuelAmount,
    totalLubeAmount,
    totalIncomes,
    totalCreditSales,
    grandTotalIncome,
    totalExpenses,
    cashInHand,
  };
}

export default function Dashboard() {
  const { dailyEntries, isLoading } = useCloudData();

  // Get yesterday's entry
  const yesterdayStats = useMemo(() => {
    const yesterday = subDays(new Date(), 1);
    const yesterdayStr = format(yesterday, 'yyyy-MM-dd');
    const yesterdayEntry = dailyEntries.find((e) => e.date === yesterdayStr);
    
    if (!yesterdayEntry) {
      return {
        totalSales: 0,
        hasData: false,
      };
    }

    const totals = calculateCloudTotals(yesterdayEntry);
    return {
      totalSales: totals.totalFuelAmount + totals.totalLubeAmount,
      hasData: true,
    };
  }, [dailyEntries]);

  // Calculate last 7 days average
  const last7DaysAverage = useMemo(() => {
    let totalSales = 0;
    let daysWithData = 0;
    
    for (let i = 1; i <= 7; i++) {
      const date = subDays(new Date(), i);
      const dateStr = format(date, 'yyyy-MM-dd');
      const entry = dailyEntries.find((e) => e.date === dateStr);
      
      if (entry) {
        const totals = calculateCloudTotals(entry);
        totalSales += totals.totalFuelAmount + totals.totalLubeAmount;
        daysWithData++;
      }
    }
    
    return daysWithData > 0 ? totalSales / daysWithData : 0;
  }, [dailyEntries]);

  // Get today's entry for fuel breakdown and cash in hand
  const todayStats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const todayEntry = dailyEntries.find((e) => e.date === today);
    
    if (!todayEntry) {
      return {
        fuelSales: { MS: { liters: 0, amount: 0 }, HSD: { liters: 0, amount: 0 }, POWER: { liters: 0, amount: 0 } },
        cashInHand: 0,
        hasTodayData: false,
      };
    }

    const totals = calculateCloudTotals(todayEntry);
    return {
      fuelSales: totals.fuelSales,
      cashInHand: totals.cashInHand,
      hasTodayData: true,
    };
  }, [dailyEntries]);

  const chartData = useMemo(() => {
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const dateStr = format(date, 'yyyy-MM-dd');
      const entry = dailyEntries.find((e) => e.date === dateStr);
      
      if (entry) {
        const totals = calculateCloudTotals(entry);
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
  }, [dailyEntries]);

  const recentEntries = useMemo(() => {
    return [...dailyEntries]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);
  }, [dailyEntries]);

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back! Here's today's overview.
        </p>
      </div>

      {/* Stats Cards - 5 Boxes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* 1. Yesterday's Sales */}
        <Card className="border-l-4 border-l-primary">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Yesterday's Sales
            </CardTitle>
            <TrendingUp className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {formatCurrency(yesterdayStats.totalSales)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              7-day avg: {formatCurrency(last7DaysAverage)}
            </p>
          </CardContent>
        </Card>

        {/* 2. MS Sold */}
        <Card className="border-l-4 border-l-amber-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              MS Sold
            </CardTitle>
            <Fuel className="w-4 h-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {formatNumber(todayStats.fuelSales.MS.liters, 2)} L
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {formatCurrency(todayStats.fuelSales.MS.amount)}
            </p>
          </CardContent>
        </Card>

        {/* 3. HSD Sold */}
        <Card className="border-l-4 border-l-emerald-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              HSD Sold
            </CardTitle>
            <Droplets className="w-4 h-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {formatNumber(todayStats.fuelSales.HSD.liters, 2)} L
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {formatCurrency(todayStats.fuelSales.HSD.amount)}
            </p>
          </CardContent>
        </Card>

        {/* 4. Power Sold */}
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Power Sold
            </CardTitle>
            <Droplets className="w-4 h-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {formatNumber(todayStats.fuelSales.POWER.liters, 2)} L
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {formatCurrency(todayStats.fuelSales.POWER.amount)}
            </p>
          </CardContent>
        </Card>

        {/* 5. Cash in Hand */}
        <Card className="border-l-4 border-l-success">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Cash in Hand
            </CardTitle>
            <Wallet className="w-4 h-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {formatCurrency(todayStats.cashInHand)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {todayStats.hasTodayData ? 'Updated today' : 'No entry for today'}
            </p>
          </CardContent>
        </Card>
      </div>

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
                  const totals = calculateCloudTotals(entry);
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
                          {entry.shift_name || 'No shift name'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-sm">
                          {formatCurrency(totals.totalFuelAmount + totals.totalLubeAmount)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatNumber(totals.totalFuelLiters, 2)} L
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
