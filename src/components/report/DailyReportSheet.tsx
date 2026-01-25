import { format, parseISO } from 'date-fns';
import { DailyEntry, FuelType } from '@/types/petrol-pump';
import { calculateTotals } from '@/store/petrol-pump-store';

interface DailyReportSheetProps {
  entry: DailyEntry;
}

function formatNumber(num: number, decimals: number = 3): string {
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 2,
  }).format(amount);
}

export function DailyReportSheet({ entry }: DailyReportSheetProps) {
  const totals = calculateTotals(entry);

  // Group nozzles by fuel type
  const groupedNozzles = {
    MS: entry.nozzles.filter((n) => n.fuelType === 'MS'),
    POWER: entry.nozzles.filter((n) => n.fuelType === 'POWER'),
    HSD: entry.nozzles.filter((n) => n.fuelType === 'HSD'),
  };

  const fuelLabels: Record<FuelType, string[]> = {
    MS: ['N1', 'N2', 'A1', 'A2'],
    POWER: ['A1', 'B1', 'A2'],
    HSD: ['A2', 'B2', 'A1'],
  };

  const getFuelRate = (fuelType: FuelType): number => {
    const rates: Record<FuelType, number> = {
      MS: entry.fuelRates?.MS || 0,
      POWER: entry.fuelRates?.POWER || 0,
      HSD: entry.fuelRates?.HSD || 0,
    };
    return rates[fuelType];
  };

  // Calculate total credit sales
  const totalCreditSales = entry.creditSales?.reduce((sum, cs) => sum + cs.amount, 0) || 0;

  return (
    <div className="daily-report-sheet font-mono bg-white text-black p-6" style={{ fontSize: '11px' }}>
      {/* Header */}
      <div className="text-center mb-4">
        <h1 className="text-xl font-bold tracking-wide underline">KGN FUEL CENTRE 2025-26</h1>
        <p className="text-sm mt-1">{format(parseISO(entry.date), 'dd-MM-yyyy')} {entry.shiftName && `| Shift: ${entry.shiftName}`}</p>
      </div>

      {/* Fuel Sales Tables - Exact Format from Reference */}
      <div className="mb-4">
        {(['MS', 'POWER', 'HSD'] as FuelType[]).map((fuelType) => {
          const nozzles = groupedNozzles[fuelType];
          const labels = fuelLabels[fuelType];
          const totalLiters = nozzles.reduce((sum, n) => sum + Math.max(0, n.closingReading - n.openingReading), 0);
          const testing = entry.testingDeduction?.[fuelType] || 0;
          const netLiters = totalLiters - testing;

          return (
            <div key={fuelType} className="mb-3">
              {/* Fuel Type Header */}
              <div className="border-t border-b border-black py-1">
                <div className="text-center font-bold text-sm">{fuelType}</div>
              </div>
              
              {/* Nozzle Labels Row */}
              <table className="w-full" style={{ fontSize: '10px' }}>
                <thead>
                  <tr>
                    <th className="text-left w-28"></th>
                    {labels.slice(0, nozzles.length).map((label) => (
                      <th key={label} className="text-right px-2 font-bold">{label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="py-0.5">Opening Reading</td>
                    {nozzles.map((nozzle, idx) => (
                      <td key={idx} className="text-right px-2">{formatNumber(nozzle.openingReading, 3)}</td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-0.5">Closing Reading</td>
                    {nozzles.map((nozzle, idx) => {
                      // If closing is 0 but opening has value, show opening (no sale scenario)
                      const displayClosing = nozzle.closingReading === 0 && nozzle.openingReading > 0 
                        ? nozzle.openingReading 
                        : nozzle.closingReading;
                      return (
                        <td key={idx} className="text-right px-2">{formatNumber(displayClosing, 3)}</td>
                      );
                    })}
                  </tr>
                  <tr className="border-t border-black font-bold">
                    <td className="py-0.5">SALES</td>
                    {nozzles.map((nozzle, idx) => {
                      const displayClosing = nozzle.closingReading === 0 && nozzle.openingReading > 0 
                        ? nozzle.openingReading 
                        : nozzle.closingReading;
                      const sales = Math.max(0, displayClosing - nozzle.openingReading);
                      return (
                        <td key={idx} className="text-right px-2">{formatNumber(sales, 3)}</td>
                      );
                    })}
                  </tr>
                </tbody>
              </table>
              
              {/* Total Sales Row */}
              <div className="text-right mt-1 pr-2" style={{ fontSize: '10px' }}>
                <span className="mr-4">TOTAL SALES = {formatNumber(totalLiters, 2)}</span>
                {testing > 0 && <span className="mr-4">-{testing} Testing=</span>}
                <span className="font-bold">{formatNumber(netLiters, 2)} L</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* T-FORMAT: Two Column Layout - INFLOWS & BALANCES | OUTFLOWS & SETTLEMENTS */}
      <div className="grid grid-cols-2 gap-4 border-t-2 border-black pt-3" style={{ fontSize: '10px' }}>
        {/* Left Column - INFLOWS & BALANCES */}
        <div className="border-r border-black pr-4">
          <h3 className="font-bold text-center mb-2 border-b border-black pb-1 text-sm">INFLOWS & BALANCES</h3>
          <div className="space-y-1">
            <div className="flex justify-between">
              <span>Opening Cash</span>
              <span>{formatCurrency(entry.openingBalance || 0)}</span>
            </div>
            
            {/* Fuel Sales with Liters × Rate format */}
            <div className="flex justify-between">
              <span>MS: {formatNumber((totals.fuelSales.MS.liters - (entry.testingDeduction?.MS || 0)), 2)} L × ₹{getFuelRate('MS')}</span>
              <span>{formatCurrency(totals.fuelSales.MS.amount)}</span>
            </div>
            <div className="flex justify-between">
              <span>POWER: {formatNumber((totals.fuelSales.POWER.liters - (entry.testingDeduction?.POWER || 0)), 2)} L × ₹{getFuelRate('POWER')}</span>
              <span>{formatCurrency(totals.fuelSales.POWER.amount)}</span>
            </div>
            <div className="flex justify-between">
              <span>HSD: {formatNumber((totals.fuelSales.HSD.liters - (entry.testingDeduction?.HSD || 0)), 2)} L × ₹{getFuelRate('HSD')}</span>
              <span>{formatCurrency(totals.fuelSales.HSD.amount)}</span>
            </div>
            
            {/* Lube Items */}
            {entry.lubeItems?.map((item) => (
              <div key={item.id} className="flex justify-between">
                <span>{item.name} ({item.quantity} × ₹{item.rate})</span>
                <span>{formatCurrency(item.quantity * item.rate)}</span>
              </div>
            ))}
            
            {/* Other Incomes */}
            {entry.incomes?.map((income) => (
              <div key={income.id} className="flex justify-between">
                <span>{income.description}</span>
                <span>{formatCurrency(income.amount)}</span>
              </div>
            ))}
            
            <div className="flex justify-between font-bold border-t border-black pt-2 mt-2 text-sm">
              <span>TOTAL INFLOW</span>
              <span>{formatCurrency(totals.grandTotalIncome)}</span>
            </div>
          </div>
        </div>

        {/* Right Column - OUTFLOWS & SETTLEMENTS */}
        <div className="pl-2">
          <h3 className="font-bold text-center mb-2 border-b border-black pb-1 text-sm">OUTFLOWS & SETTLEMENTS</h3>
          <div className="space-y-1">
            {/* Expenses */}
            {entry.expenses?.map((expense) => (
              <div key={expense.id} className="flex justify-between">
                <span>{expense.description}</span>
                <span>{formatCurrency(expense.amount)}</span>
              </div>
            ))}
            
            {/* Credit Sales - RED COLOR */}
            {entry.creditSales?.map((cs) => (
              <div key={cs.id} className="flex justify-between text-red-600 font-medium">
                <span>{cs.debtorName} {cs.remarks && `(${cs.remarks})`}</span>
                <span>{formatCurrency(cs.amount)}</span>
              </div>
            ))}
            
            <div className="flex justify-between">
              <span>Bank Deposit</span>
              <span>{formatCurrency(entry.cashDeposit || 0)}</span>
            </div>
            <div className="flex justify-between">
              <span>UPI/Online</span>
              <span>{formatCurrency(entry.upiCollection || 0)}</span>
            </div>
            
            <div className="flex justify-between font-bold border-t border-black pt-2 mt-2">
              <span>Sub Total</span>
              <span>{formatCurrency(totals.totalExpenses)}</span>
            </div>
            
            <div className="flex justify-between font-bold bg-gray-100 border border-black p-2 mt-2 text-sm">
              <span>Closing Cash in Hand</span>
              <span>{formatCurrency(totals.cashInHand)}</span>
            </div>
            
            <div className="flex justify-between font-bold border-t border-black pt-2 mt-2 text-sm">
              <span>TOTAL OUTFLOW</span>
              <span>{formatCurrency(totals.grandTotalIncome)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Summary */}
      <div className="mt-4 pt-2 border-t-2 border-black flex justify-between font-bold text-sm">
        <span>Total Sale (Cash + Credit + UPI): ₹{formatCurrency(totals.totalFuelAmount + totals.totalLubeAmount + totals.totalIncomes + totalCreditSales)}</span>
        <span>Pump Balance: ₹{formatCurrency(totals.cashInHand)}</span>
      </div>
    </div>
  );
}
