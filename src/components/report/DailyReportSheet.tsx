import { format, parseISO } from 'date-fns';
import { DailyEntry, DEFAULT_NOZZLE_CONFIG, FuelType } from '@/types/petrol-pump';
import { calculateTotals } from '@/store/petrol-pump-store';

interface DailyReportSheetProps {
  entry: DailyEntry;
}

function formatNumber(num: number, decimals: number = 2): string {
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

  return (
    <div className="daily-report-sheet font-mono text-sm p-6 bg-white text-black min-h-full">
      {/* Header */}
      <div className="text-center mb-6 border-b-2 border-black pb-4">
        <h1 className="text-2xl font-bold tracking-wide">KGN FUEL CENTRE 2025-26</h1>
        <p className="text-lg mt-1">{format(parseISO(entry.date), 'dd-MM-yyyy')}</p>
        {entry.shiftName && <p className="text-base mt-1">Shift: {entry.shiftName}</p>}
      </div>

      {/* Fuel Sales Tables */}
      <div className="space-y-6 mb-8">
        {(['MS', 'POWER', 'HSD'] as FuelType[]).map((fuelType) => {
          const nozzles = groupedNozzles[fuelType];
          const labels = fuelLabels[fuelType];
          const totalLiters = nozzles.reduce((sum, n) => sum + Math.max(0, n.closingReading - n.openingReading), 0);
          const testing = entry.testingDeduction?.[fuelType] || 0;
          const netLiters = totalLiters - testing;

          return (
            <div key={fuelType} className="mb-4">
              <div className="text-center font-bold border-b-2 border-black pb-1 mb-3 text-lg">
                {fuelType}
              </div>
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr>
                    <th className="text-left py-1 pr-4 w-32"></th>
                    {labels.slice(0, nozzles.length).map((label) => (
                      <th key={label} className="text-right py-1 px-2 font-bold">{label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="py-1 pr-4">Opening Reading</td>
                    {nozzles.map((nozzle, idx) => (
                      <td key={idx} className="text-right py-1 px-2">{formatNumber(nozzle.openingReading, 3)}</td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-1 pr-4">Closing Reading</td>
                    {nozzles.map((nozzle, idx) => (
                      <td key={idx} className="text-right py-1 px-2">{formatNumber(nozzle.closingReading, 3)}</td>
                    ))}
                  </tr>
                  <tr className="font-bold border-t border-black">
                    <td className="py-1 pr-4">SALES</td>
                    {nozzles.map((nozzle, idx) => (
                      <td key={idx} className="text-right py-1 px-2">
                        {formatNumber(Math.max(0, nozzle.closingReading - nozzle.openingReading), 3)}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
              <div className="flex justify-end gap-4 mt-2 text-sm font-medium">
                <span>TOTAL SALES = {formatNumber(totalLiters, 2)}</span>
                {testing > 0 && <span>- {formatNumber(testing, 2)} Testing =</span>}
                <span className="font-bold">{formatNumber(netLiters, 2)} L</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* T-FORMAT: Two Column Layout */}
      <div className="t-format-container grid grid-cols-2 gap-6 border-t-2 border-black pt-4">
        {/* Left Column - INFLOWS */}
        <div className="inflow-column border-r border-black pr-4">
          <h3 className="font-bold text-center mb-3 border-b border-black pb-1">INFLOWS & BALANCES</h3>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span>Opening Cash</span>
              <span className="font-mono">{formatCurrency(entry.openingBalance || 0)}</span>
            </div>
            <div className="flex justify-between">
              <span>MS: {formatNumber((totals.fuelSales.MS.liters - (entry.testingDeduction?.MS || 0)), 2)} L × ₹{entry.fuelRates?.MS}</span>
              <span className="font-mono">{formatCurrency(totals.fuelSales.MS.amount)}</span>
            </div>
            <div className="flex justify-between">
              <span>POWER: {formatNumber((totals.fuelSales.POWER.liters - (entry.testingDeduction?.POWER || 0)), 2)} L × ₹{entry.fuelRates?.POWER}</span>
              <span className="font-mono">{formatCurrency(totals.fuelSales.POWER.amount)}</span>
            </div>
            <div className="flex justify-between">
              <span>HSD: {formatNumber((totals.fuelSales.HSD.liters - (entry.testingDeduction?.HSD || 0)), 2)} L × ₹{entry.fuelRates?.HSD}</span>
              <span className="font-mono">{formatCurrency(totals.fuelSales.HSD.amount)}</span>
            </div>
            {entry.lubeItems?.map((item) => (
              <div key={item.id} className="flex justify-between">
                <span>{item.name} ({item.quantity} × ₹{item.rate})</span>
                <span className="font-mono">{formatCurrency(item.quantity * item.rate)}</span>
              </div>
            ))}
            {entry.incomes?.map((income) => (
              <div key={income.id} className="flex justify-between">
                <span>{income.description}</span>
                <span className="font-mono">{formatCurrency(income.amount)}</span>
              </div>
            ))}
            <div className="flex justify-between font-bold border-t-2 border-black pt-2 mt-3 text-base">
              <span>TOTAL INFLOW</span>
              <span className="font-mono">{formatCurrency(totals.grandTotalIncome)}</span>
            </div>
          </div>
        </div>

        {/* Right Column - OUTFLOWS */}
        <div className="outflow-column pl-4">
          <h3 className="font-bold text-center mb-3 border-b border-black pb-1">OUTFLOWS & SETTLEMENTS</h3>
          <div className="space-y-1 text-sm">
            {entry.expenses?.map((expense) => (
              <div key={expense.id} className="flex justify-between">
                <span>{expense.description}</span>
                <span className="font-mono">{formatCurrency(expense.amount)}</span>
              </div>
            ))}
            <div className="flex justify-between">
              <span>Bank Deposit</span>
              <span className="font-mono">{formatCurrency(entry.cashDeposit || 0)}</span>
            </div>
            <div className="flex justify-between">
              <span>UPI/Online</span>
              <span className="font-mono">{formatCurrency(entry.upiCollection || 0)}</span>
            </div>
            {entry.creditSales?.map((cs) => (
              <div key={cs.id} className="flex justify-between text-amber-800">
                <span>Credit: {cs.debtorName}</span>
                <span className="font-mono">{formatCurrency(cs.amount)}</span>
              </div>
            ))}
            <div className="flex justify-between font-bold border-t border-black pt-2 mt-2">
              <span>Sub Total</span>
              <span className="font-mono">{formatCurrency(totals.totalExpenses)}</span>
            </div>
            <div className="flex justify-between font-bold bg-gray-200 p-2 mt-2 text-lg">
              <span>Closing Cash in Hand</span>
              <span className="font-mono">{formatCurrency(totals.cashInHand)}</span>
            </div>
            <div className="flex justify-between font-bold border-t-2 border-black pt-2 mt-3 text-base">
              <span>TOTAL OUTFLOW</span>
              <span className="font-mono">{formatCurrency(totals.grandTotalIncome)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Summary */}
      <div className="mt-6 pt-4 border-t-2 border-black">
        <div className="flex justify-between text-base font-bold">
          <span>Total Sale (Cash + Credit + UPI): ₹{formatCurrency(totals.totalFuelAmount + totals.totalLubeAmount + totals.totalIncomes)}</span>
          <span>Pump Balance: ₹{formatCurrency(totals.cashInHand)}</span>
        </div>
      </div>
    </div>
  );
}