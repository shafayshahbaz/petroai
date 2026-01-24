import { format, parseISO } from 'date-fns';
import { DailyEntry, FuelType } from '@/types/petrol-pump';
import { calculateTotals } from '@/store/petrol-pump-store';

interface PrintableReportProps {
  entry: DailyEntry;
  companyName?: string;
}

function formatNumber(num: number, decimals: number = 2): string {
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
}

function formatAmount(num: number): string {
  return new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 0,
  }).format(num);
}

export function PrintableReport({ entry, companyName = 'KGN FUEL CENTRE 2025-26' }: PrintableReportProps) {
  const totals = calculateTotals(entry);

  // Group nozzles by fuel type
  const groupedNozzles = {
    MS: entry.nozzles.filter((n) => n.fuelType === 'MS'),
    POWER: entry.nozzles.filter((n) => n.fuelType === 'POWER'),
    HSD: entry.nozzles.filter((n) => n.fuelType === 'HSD'),
  };

  // Calculate testing totals per fuel type
  const testingTotals: Record<FuelType, number> = {
    MS: groupedNozzles.MS.reduce((sum, n) => sum + (n.testing || 0), 0),
    POWER: groupedNozzles.POWER.reduce((sum, n) => sum + (n.testing || 0), 0),
    HSD: groupedNozzles.HSD.reduce((sum, n) => sum + (n.testing || 0), 0),
  };

  // Calculate gross sales per fuel type (before testing deduction)
  const grossSales: Record<FuelType, number> = {
    MS: groupedNozzles.MS.reduce((sum, n) => sum + Math.max(0, n.closingReading - n.openingReading), 0),
    POWER: groupedNozzles.POWER.reduce((sum, n) => sum + Math.max(0, n.closingReading - n.openingReading), 0),
    HSD: groupedNozzles.HSD.reduce((sum, n) => sum + Math.max(0, n.closingReading - n.openingReading), 0),
  };

  // Format date range
  const dateDisplay = entry.isMultiDay && entry.endDate 
    ? `${format(parseISO(entry.date), 'dd-MM-yyyy')} to ${format(parseISO(entry.endDate), 'dd-MM-yyyy')}`
    : format(parseISO(entry.date), 'dd-MM-yyyy');

  return (
    <div className="font-mono text-sm bg-white text-black p-6" style={{ fontFamily: "'Courier New', monospace" }}>
      {/* Header */}
      <div className="text-center mb-6">
        <h1 className="text-lg font-bold underline">{companyName}</h1>
        <p className="text-base mt-2">{dateDisplay}</p>
      </div>

      {/* Fuel Sales Tables - Vertical Layout */}
      {(['MS', 'POWER', 'HSD'] as FuelType[]).map((fuelType) => {
        const nozzles = groupedNozzles[fuelType];
        if (nozzles.length === 0) return null;

        const netSales = totals.fuelSales[fuelType].liters;

        return (
          <div key={fuelType} className="mb-6">
            {/* Fuel Type Header */}
            <div className="border-t-2 border-b border-black py-1">
              <p className="text-center font-bold">{fuelType}</p>
            </div>

            {/* Nozzle Labels Header */}
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-black">
                  <th className="text-left py-1 w-32"></th>
                  {nozzles.map((nozzle) => (
                    <th key={nozzle.id} className="text-center py-1 px-2 font-bold">
                      {nozzle.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* Opening Reading */}
                <tr>
                  <td className="py-1 text-left">Opening Reading</td>
                  {nozzles.map((nozzle) => (
                    <td key={nozzle.id} className="text-center py-1 px-2">
                      {formatNumber(nozzle.openingReading, 3)}
                    </td>
                  ))}
                </tr>
                {/* Closing Reading */}
                <tr>
                  <td className="py-1 text-left">Closing Reading</td>
                  {nozzles.map((nozzle) => (
                    <td key={nozzle.id} className="text-center py-1 px-2">
                      {formatNumber(nozzle.closingReading, 3)}
                    </td>
                  ))}
                </tr>
                {/* Sales per nozzle */}
                <tr className="font-bold">
                  <td className="py-1 text-left">SALES</td>
                  {nozzles.map((nozzle) => {
                    const sales = Math.max(0, nozzle.closingReading - nozzle.openingReading);
                    return (
                      <td key={nozzle.id} className="text-center py-1 px-2">
                        {formatNumber(sales, 3)}
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>

            {/* Total Sales Line */}
            <div className="mt-2 text-right">
              <span className="mr-8">TOTAL SALES =</span>
              <span className="font-bold">{formatNumber(grossSales[fuelType], 3)}</span>
              {testingTotals[fuelType] > 0 && (
                <>
                  <span className="mx-2">-{formatNumber(testingTotals[fuelType], 2)}</span>
                  <span>Testing=</span>
                </>
              )}
              <span className="ml-4 font-bold">{formatNumber(netSales, 2)}</span>
            </div>
          </div>
        );
      })}

      {/* Two Column Summary - T Format: Inflows Left, Outflows Right */}
      <div className="flex gap-8 mt-8 text-xs">
        {/* LEFT COLUMN - INFLOWS */}
        <div className="flex-1">
          {/* Opening Balance */}
          <div className="flex justify-between border-b border-black py-1">
            <span className="font-bold">{formatAmount(entry.openingBalance || 0)}</span>
            <span>Opening Balance</span>
          </div>

          {/* MS Sales */}
          <div className="flex justify-between py-1">
            <span className="font-bold">{formatAmount(totals.fuelSales.MS.amount)}</span>
            <span>MS <span className="font-bold">{formatNumber(totals.fuelSales.MS.liters, 2)} x @{entry.fuelRates?.MS || 0}</span></span>
          </div>

          {/* Power Sales */}
          <div className="flex justify-between py-1">
            <span className="font-bold">{formatAmount(totals.fuelSales.POWER.amount)}</span>
            <span>Power <span className="font-bold">{formatNumber(totals.fuelSales.POWER.liters, 2)} x @{entry.fuelRates?.POWER || 0}</span></span>
          </div>

          {/* HSD Sales */}
          <div className="flex justify-between py-1">
            <span className="font-bold">{formatAmount(totals.fuelSales.HSD.amount)}</span>
            <span>HSD <span className="font-bold">{formatNumber(totals.fuelSales.HSD.liters, 2)} x @{entry.fuelRates?.HSD || 0}</span></span>
          </div>

          {/* Lube Items */}
          {entry.lubeItems?.map((item) => (
            <div key={item.id} className="flex justify-between py-1">
              <span className="font-bold">{formatAmount(item.quantity * item.rate)}</span>
              <span>{item.name} <span className="font-bold">{item.quantity}pcs @{item.rate}</span></span>
            </div>
          ))}

          {/* Other Income Items */}
          {entry.incomes?.map((income) => (
            <div key={income.id} className="flex justify-between py-1">
              <span className="font-bold">{formatAmount(income.amount)}</span>
              <span>{income.description}</span>
            </div>
          ))}

          {/* Total Inflow */}
          <div className="flex justify-between border-t-2 border-black pt-2 mt-2 font-bold">
            <span>{formatAmount(totals.totalInflow)}</span>
            <span></span>
          </div>
        </div>

        {/* RIGHT COLUMN - OUTFLOWS */}
        <div className="flex-1">
          {/* Bank Deposit */}
          {(entry.bankDeposit || 0) > 0 && (
            <div className="flex justify-between py-1">
              <span className="font-bold">{formatAmount(entry.bankDeposit || 0)}</span>
              <span>Cash Deposit SBI</span>
            </div>
          )}

          {/* UPI/Phonepe */}
          {(entry.upiCollection || 0) > 0 && (
            <div className="flex justify-between py-1">
              <span className="font-bold">{formatAmount(entry.upiCollection || 0)}</span>
              <span>Phonepe</span>
            </div>
          )}

          {/* Expenses */}
          {entry.expenses?.map((expense) => (
            <div key={expense.id} className="flex justify-between py-1">
              <span className="font-bold">{formatAmount(expense.amount)}</span>
              <span>{expense.description}</span>
            </div>
          ))}

          {/* Credits */}
          {entry.credits?.map((credit) => (
            <div key={credit.id} className="flex justify-between py-1">
              <span className="font-bold">{formatAmount(credit.amount)}</span>
              <span>{credit.customerName}</span>
            </div>
          ))}

          {/* Total Outflow */}
          <div className="flex justify-between border-t-2 border-black pt-2 mt-2 font-bold">
            <span>{formatAmount(totals.totalOutflow)}</span>
            <span></span>
          </div>

          {/* Cash in Hand - Large */}
          <div className="flex justify-between py-2 mt-4 text-base font-bold">
            <span>{formatAmount(totals.closingCash)}</span>
            <span>Cash In Hand</span>
          </div>

          {/* Summary at bottom right */}
          <div className="mt-4 pt-2 border-t border-black">
            <div className="flex justify-between py-1">
              <span>{formatAmount(totals.totalFuelAmount + totals.totalLubeAmount)}</span>
              <span>Sale Cash</span>
            </div>
            <div className="flex justify-between py-1">
              <span>{formatAmount(entry.openingBalance || 0)}</span>
              <span>Pump Balance</span>
            </div>
            <div className="flex justify-between py-1 font-bold text-base">
              <span>{formatAmount(totals.closingCash)}</span>
              <span></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
