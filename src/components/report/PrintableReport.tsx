import { format, parseISO } from 'date-fns';
import { DailyEntry, FuelType } from '@/types/petrol-pump';
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
        {entry.isMultiDay && entry.endDate && (
          <p className="text-sm">to {format(parseISO(entry.endDate), 'dd-MM-yyyy')}</p>
        )}
        {entry.shiftName && <p className="text-sm">Shift: {entry.shiftName}</p>}
      </div>

      {/* Fuel Sales Tables */}
      {(['MS', 'POWER', 'HSD'] as FuelType[]).map((fuelType) => {
        const nozzles = groupedNozzles[fuelType];
        const labels = fuelLabels[fuelType];

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
                <tr>
                  <td className="py-1 pr-4">Testing</td>
                  {nozzles.map((nozzle, idx) => (
                    <td key={idx} className="text-right py-1 px-2">{formatNumber(nozzle.testing || 0, 2)}</td>
                  ))}
                </tr>
                <tr className="font-bold border-t border-black">
                  <td className="py-1 pr-4">NET SALES</td>
                  {nozzles.map((nozzle, idx) => {
                    const gross = Math.max(0, nozzle.closingReading - nozzle.openingReading);
                    const net = Math.max(0, gross - (nozzle.testing || 0));
                    return (
                      <td key={idx} className="text-right py-1 px-2">
                        {formatNumber(net, 3)}
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
            <div className="flex justify-end gap-4 mt-2 text-sm">
              <span className="font-bold">
                TOTAL: {formatNumber(totals.fuelSales[fuelType].liters, 2)} L = ₹{formatNumber(totals.fuelSales[fuelType].amount, 2)}
              </span>
            </div>
          </div>
        );
      })}

      {/* Two Column Summary - T Format */}
      <div className="flex gap-8 mt-8 text-xs border-t-2 border-black pt-4">
        {/* Left Column - Inflows */}
        <div className="flex-1">
          <div className="font-bold text-center mb-2 border-b border-black pb-1">INFLOWS</div>
          <div className="space-y-1">
            <div className="flex justify-between">
              <span>Opening Balance</span>
              <span>{formatNumber(entry.openingBalance || 0, 0)}</span>
            </div>
            <div className="flex justify-between">
              <span>MS Sales ({formatNumber(totals.fuelSales.MS.liters, 2)} L × ₹{entry.fuelRates?.MS || 0})</span>
              <span>{formatNumber(totals.fuelSales.MS.amount, 2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Power Sales ({formatNumber(totals.fuelSales.POWER.liters, 2)} L × ₹{entry.fuelRates?.POWER || 0})</span>
              <span>{formatNumber(totals.fuelSales.POWER.amount, 2)}</span>
            </div>
            <div className="flex justify-between">
              <span>HSD Sales ({formatNumber(totals.fuelSales.HSD.liters, 2)} L × ₹{entry.fuelRates?.HSD || 0})</span>
              <span>{formatNumber(totals.fuelSales.HSD.amount, 2)}</span>
            </div>
            {entry.lubeItems?.map((item) => (
              <div key={item.id} className="flex justify-between">
                <span>{item.name} ({item.quantity} × ₹{item.rate})</span>
                <span>{formatNumber(item.quantity * item.rate, 0)}</span>
              </div>
            ))}
            {entry.incomes?.map((income) => (
              <div key={income.id} className="flex justify-between">
                <span>{income.description}</span>
                <span>{formatNumber(income.amount, 0)}</span>
              </div>
            ))}
            <div className="flex justify-between font-bold border-t border-black pt-1 mt-2">
              <span>TOTAL INFLOW</span>
              <span>{formatNumber(totals.totalInflow, 0)}</span>
            </div>
          </div>
        </div>

        {/* Right Column - Outflows */}
        <div className="flex-1">
          <div className="font-bold text-center mb-2 border-b border-black pb-1">OUTFLOWS</div>
          <div className="space-y-1">
            {entry.expenses?.map((expense) => (
              <div key={expense.id} className="flex justify-between">
                <span>{expense.description}</span>
                <span>{formatNumber(expense.amount, 0)}</span>
              </div>
            ))}
            <div className="flex justify-between">
              <span>Bank Deposit</span>
              <span>{formatNumber(entry.bankDeposit || 0, 0)}</span>
            </div>
            <div className="flex justify-between">
              <span>UPI/Digital Collection</span>
              <span>{formatNumber(entry.upiCollection || 0, 0)}</span>
            </div>
            {entry.credits?.map((credit) => (
              <div key={credit.id} className="flex justify-between">
                <span>Credit: {credit.customerName}</span>
                <span>{formatNumber(credit.amount, 0)}</span>
              </div>
            ))}
            <div className="flex justify-between font-bold border-t border-black pt-1 mt-2">
              <span>TOTAL OUTFLOW</span>
              <span>{formatNumber(totals.totalOutflow, 0)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Closing Balance */}
      <div className="mt-6 pt-4 border-t-2 border-black">
        <div className="flex justify-between text-lg font-bold">
          <span>CLOSING CASH IN HAND</span>
          <span>₹ {formatNumber(totals.closingCash, 0)}</span>
        </div>
      </div>

      {/* Footer Summary */}
      <div className="mt-4 pt-2 border-t border-black text-xs">
        <div className="flex justify-between">
          <span>Total Fuel Sales: ₹{formatNumber(totals.totalFuelAmount, 0)}</span>
          <span>Total Lube Sales: ₹{formatNumber(totals.totalLubeAmount, 0)}</span>
          <span>Net Closing: ₹{formatNumber(totals.closingCash, 0)}</span>
        </div>
      </div>
    </div>
  );
}
