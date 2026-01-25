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
    <div className="daily-report-sheet font-mono p-4 bg-white text-black" style={{ fontSize: '11px' }}>
      {/* Header */}
      <div className="text-center mb-2 border-b-2 border-black pb-1">
        <h1 className="text-lg font-bold tracking-wide">KGN FUEL CENTRE 2025-26</h1>
        <p style={{ fontSize: '10px' }}>{format(parseISO(entry.date), 'dd-MM-yyyy')} {entry.shiftName && `| Shift: ${entry.shiftName}`}</p>
      </div>

      {/* Fuel Sales Tables - Stacked Layout for Print Clarity */}
      <div className="mb-3" style={{ fontSize: '10px' }}>
        {(['MS', 'POWER', 'HSD'] as FuelType[]).map((fuelType) => {
          const nozzles = groupedNozzles[fuelType];
          const labels = fuelLabels[fuelType];
          const totalLiters = nozzles.reduce((sum, n) => sum + Math.max(0, n.closingReading - n.openingReading), 0);
          const testing = entry.testingDeduction?.[fuelType] || 0;
          const netLiters = totalLiters - testing;

          return (
            <div key={fuelType} className="border border-black mb-1 p-1">
              <div className="flex items-center justify-between border-b border-black pb-0.5 mb-1">
                <span className="font-bold text-sm">{fuelType}</span>
                <span className="font-bold">Net: {formatNumber(netLiters, 2)} L</span>
              </div>
              <div className="grid" style={{ gridTemplateColumns: `40px repeat(${nozzles.length}, 1fr)` }}>
                <div></div>
                {labels.slice(0, nozzles.length).map((label) => (
                  <div key={label} className="text-center font-bold">{label}</div>
                ))}
                <div>Open</div>
                {nozzles.map((nozzle, idx) => (
                  <div key={idx} className="text-center">{formatNumber(nozzle.openingReading, 0)}</div>
                ))}
                <div>Close</div>
                {nozzles.map((nozzle, idx) => (
                  <div key={idx} className="text-center">{formatNumber(nozzle.closingReading, 0)}</div>
                ))}
                <div className="font-bold">Sale</div>
                {nozzles.map((nozzle, idx) => (
                  <div key={idx} className="text-center font-bold">
                    {formatNumber(Math.max(0, nozzle.closingReading - nozzle.openingReading), 0)}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* T-FORMAT: Two Column Layout */}
      <div className="t-format-container grid grid-cols-2 gap-2 border-t-2 border-black pt-2" style={{ fontSize: '10px' }}>
        {/* Left Column - INFLOWS */}
        <div className="inflow-column border-r border-black pr-2">
          <h3 className="font-bold text-center mb-1 border-b border-black pb-0.5" style={{ fontSize: '12px' }}>INFLOWS</h3>
          <div className="space-y-0.5">
            <div className="flex justify-between">
              <span>Opening Cash</span>
              <span>{formatCurrency(entry.openingBalance || 0)}</span>
            </div>
            <div className="flex justify-between">
              <span>MS ({formatNumber((totals.fuelSales.MS.liters - (entry.testingDeduction?.MS || 0)), 1)}L)</span>
              <span>{formatCurrency(totals.fuelSales.MS.amount)}</span>
            </div>
            <div className="flex justify-between">
              <span>POWER ({formatNumber((totals.fuelSales.POWER.liters - (entry.testingDeduction?.POWER || 0)), 1)}L)</span>
              <span>{formatCurrency(totals.fuelSales.POWER.amount)}</span>
            </div>
            <div className="flex justify-between">
              <span>HSD ({formatNumber((totals.fuelSales.HSD.liters - (entry.testingDeduction?.HSD || 0)), 1)}L)</span>
              <span>{formatCurrency(totals.fuelSales.HSD.amount)}</span>
            </div>
            {entry.lubeItems?.map((item) => (
              <div key={item.id} className="flex justify-between">
                <span>{item.name} ({item.quantity}×₹{item.rate})</span>
                <span>{formatCurrency(item.quantity * item.rate)}</span>
              </div>
            ))}
            {entry.incomes?.map((income) => (
              <div key={income.id} className="flex justify-between">
                <span>{income.description}</span>
                <span>{formatCurrency(income.amount)}</span>
              </div>
            ))}
            <div className="flex justify-between font-bold border-t border-black pt-1 mt-1" style={{ fontSize: '11px' }}>
              <span>TOTAL INFLOW</span>
              <span>{formatCurrency(totals.grandTotalIncome)}</span>
            </div>
          </div>
        </div>

        {/* Right Column - OUTFLOWS */}
        <div className="outflow-column pl-2">
          <h3 className="font-bold text-center mb-1 border-b border-black pb-0.5" style={{ fontSize: '12px' }}>OUTFLOWS</h3>
          <div className="space-y-0.5">
            {entry.expenses?.map((expense) => (
              <div key={expense.id} className="flex justify-between">
                <span>{expense.description}</span>
                <span>{formatCurrency(expense.amount)}</span>
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
            {entry.creditSales?.map((cs) => (
              <div key={cs.id} className="flex justify-between">
                <span>Credit: {cs.debtorName} {cs.remarks && `(${cs.remarks})`}</span>
                <span>{formatCurrency(cs.amount)}</span>
              </div>
            ))}
            <div className="flex justify-between font-bold border-t border-black pt-1 mt-1">
              <span>Sub Total</span>
              <span>{formatCurrency(totals.totalExpenses)}</span>
            </div>
            <div className="flex justify-between font-bold bg-gray-200 p-1 mt-1" style={{ fontSize: '11px' }}>
              <span>CLOSING CASH</span>
              <span>{formatCurrency(totals.cashInHand)}</span>
            </div>
            <div className="flex justify-between font-bold border-t border-black pt-1 mt-1" style={{ fontSize: '11px' }}>
              <span>TOTAL OUTFLOW</span>
              <span>{formatCurrency(totals.grandTotalIncome)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Summary */}
      <div className="mt-2 pt-2 border-t-2 border-black text-xs">
        <div className="flex justify-between font-bold">
          <span>Total Sale: ₹{formatCurrency(totals.totalFuelAmount + totals.totalLubeAmount + totals.totalIncomes)}</span>
          <span>Pump Balance: ₹{formatCurrency(totals.cashInHand)}</span>
        </div>
      </div>
    </div>
  );
}