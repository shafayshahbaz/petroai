import { format, parseISO } from 'date-fns';
import { DailyEntry, DEFAULT_NOZZLE_CONFIG, FuelType } from '@/types/petrol-pump';
import { calculateTotals } from '@/store/petrol-pump-store';

interface PrintableReportProps {
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

export function PrintableReport({ entry }: PrintableReportProps) {
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
    <div className="font-mono text-sm p-4 bg-white text-black">
      {/* Header */}
      <div className="text-center mb-6">
        <h1 className="text-xl font-bold">KGN FUEL CENTRE 2025-26</h1>
        <p className="text-base">{format(parseISO(entry.date), 'dd-MM-yyyy')}</p>
        {entry.shiftName && <p className="text-sm">Shift: {entry.shiftName}</p>}
      </div>

      {/* Fuel Sales Tables */}
      {(['MS', 'POWER', 'HSD'] as FuelType[]).map((fuelType) => {
        const nozzles = groupedNozzles[fuelType];
        const labels = fuelLabels[fuelType];
        const totalLiters = nozzles.reduce((sum, n) => sum + Math.max(0, n.closingReading - n.openingReading), 0);
        const testing = entry.testingDeduction?.[fuelType] || 0;
        const netLiters = totalLiters - testing;

        return (
          <div key={fuelType} className="mb-6">
            <div className="text-center font-bold border-b-2 border-black pb-1 mb-2">
              {fuelType}
            </div>
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="text-left py-1 pr-4"></th>
                  {labels.slice(0, nozzles.length).map((label) => (
                    <th key={label} className="text-right py-1 px-2">{label}</th>
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
            <div className="flex justify-end gap-4 mt-2 text-sm">
              <span>TOTAL SALES = {formatNumber(totalLiters, 2)}</span>
              {testing > 0 && <span>-{formatNumber(testing, 2)} Testing=</span>}
              <span className="font-bold">{formatNumber(netLiters, 2)}</span>
            </div>
          </div>
        );
      })}

      {/* Two Column Summary */}
      <div className="flex gap-8 mt-8 text-xs">
        {/* Left Column - Income */}
        <div className="flex-1">
          <div className="space-y-1">
            <div className="flex justify-between">
              <span>{formatNumber(entry.openingBalance || 0, 0)}</span>
              <span>Opening Balance</span>
            </div>
            <div className="flex justify-between">
              <span>{formatNumber(totals.fuelSales.MS.amount, 2)}</span>
              <span>MS {formatNumber(totals.fuelSales.MS.liters - (entry.testingDeduction?.MS || 0), 2)} x @{entry.fuelRates?.MS || 0}</span>
            </div>
            <div className="flex justify-between">
              <span>{formatNumber(totals.fuelSales.POWER.amount, 2)}</span>
              <span>Power {formatNumber(totals.fuelSales.POWER.liters - (entry.testingDeduction?.POWER || 0), 2)} x @{entry.fuelRates?.POWER || 0}</span>
            </div>
            <div className="flex justify-between">
              <span>{formatNumber(totals.fuelSales.HSD.amount, 2)}</span>
              <span>HSD {formatNumber(totals.fuelSales.HSD.liters - (entry.testingDeduction?.HSD || 0), 2)} x @{entry.fuelRates?.HSD || 0}</span>
            </div>
            {entry.lubeItems?.map((item) => (
              <div key={item.id} className="flex justify-between">
                <span>{formatNumber(item.quantity * item.rate, 0)}</span>
                <span>{item.name} {item.quantity}pcs @{item.rate}</span>
              </div>
            ))}
            {entry.incomes?.map((income) => (
              <div key={income.id} className="flex justify-between">
                <span>{formatNumber(income.amount, 0)}</span>
                <span>{income.description}</span>
              </div>
            ))}
            <div className="flex justify-between font-bold border-t border-black pt-1 mt-2">
              <span>{formatNumber(totals.grandTotalIncome, 0)}</span>
              <span></span>
            </div>
          </div>
        </div>

        {/* Right Column - Expenses */}
        <div className="flex-1">
          <div className="space-y-1">
            <div className="flex justify-between">
              <span>{formatNumber(entry.cashDeposit || 0, 0)}</span>
              <span>Cash Deposit SBI</span>
            </div>
            <div className="flex justify-between">
              <span>{formatNumber(entry.upiCollection || 0, 0)}</span>
              <span>PhonePe/UPI</span>
            </div>
            {entry.expenses?.map((expense) => (
              <div key={expense.id} className="flex justify-between">
                <span>{formatNumber(expense.amount, 0)}</span>
                <span>{expense.description}</span>
              </div>
            ))}
            <div className="flex justify-between font-bold border-t border-black pt-1 mt-2">
              <span>{formatNumber(totals.totalExpenses, 0)}</span>
              <span></span>
            </div>
            <div className="flex justify-between font-bold text-lg mt-4">
              <span>{formatNumber(totals.cashInHand, 0)}</span>
              <span>Cash In Hand</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Summary */}
      <div className="mt-8 pt-4 border-t-2 border-black">
        <div className="flex justify-between">
          <span>Sale Cash: {formatNumber(totals.totalFuelAmount + totals.totalLubeAmount, 0)}</span>
          <span>Pump Balance: {formatNumber(totals.cashInHand, 0)}</span>
        </div>
      </div>
    </div>
  );
}
