import { useEffect, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { DailyEntry, FuelType } from '@/types/petrol-pump';
import { calculateTotals } from '@/store/petrol-pump-store';
import { useSettingsStore } from '@/store/settings-store';
import { getDipReadingsForDate, listTanks, type TankRow, type DipReadingRow } from '@/services/dipService';

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
  const { businessProfile } = useSettingsStore();
  const totals = calculateTotals(entry);

  const groupedNozzles = {
    MS: entry.nozzles.filter((n) => n.fuelType === 'MS'),
    POWER: entry.nozzles.filter((n) => n.fuelType === 'POWER'),
    HSD: entry.nozzles.filter((n) => n.fuelType === 'HSD'),
  };

  // Helper to extract label from nozzle - prioritize saved label, then parse ID, then fallback
  const getNozzleLabel = (nozzle: any, index: number): string => {
    // If the nozzle has a stored label property, use it
    if (nozzle.label && typeof nozzle.label === 'string' && nozzle.label.trim()) {
      return nozzle.label;
    }
    // Try to extract from the ID format (e.g., "uuid-Machine 1")
    const nozzleId = nozzle.id || '';
    const idParts = nozzleId.split('-');
    if (idParts.length >= 2) {
      // Check if last part looks like a label (not a UUID segment)
      const lastPart = idParts[idParts.length - 1];
      if (lastPart.length > 4 && !/^[a-f0-9]+$/i.test(lastPart)) {
        return idParts.slice(-2).join(' ');
      }
    }
    // Fallback to index-based label
    return `Nozzle ${index + 1}`;
  };

  const getFuelRate = (fuelType: FuelType): number => {
    return entry.fuelRates?.[fuelType] || 0;
  };

  const totalCreditSales = entry.creditSales?.reduce((sum, cs) => sum + cs.amount, 0) || 0;

  // Use company name from settings, fallback to generic
  const companyName = businessProfile.companyName || 'FUEL CENTRE';
  const currentYear = new Date().getFullYear();
  const fiscalYear = `${currentYear}-${(currentYear + 1).toString().slice(-2)}`;

  return (
    <div className="daily-report-sheet font-mono bg-white text-black" style={{ 
      width: '210mm', 
      minHeight: '297mm',
      maxHeight: '297mm',
      padding: '8mm',
      fontSize: '9px',
      lineHeight: '1.2',
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div className="text-center mb-2">
        <h1 className="font-bold tracking-wide underline" style={{ fontSize: '14px' }}>{companyName.toUpperCase()}</h1>
        <p style={{ fontSize: '10px' }}>{format(parseISO(entry.date), 'dd-MM-yyyy')} {entry.shiftName && `| Shift: ${entry.shiftName}`}</p>
      </div>

      {/* Fuel Sales Tables - Compact */}
      <div className="mb-2">
        {(['MS', 'POWER', 'HSD'] as FuelType[]).map((fuelType) => {
          const nozzles = groupedNozzles[fuelType];
          const totalLiters = nozzles.reduce((sum, n) => sum + Math.max(0, n.closingReading - n.openingReading), 0);
          const testing = entry.testingDeduction?.[fuelType] || 0;
          const netLiters = totalLiters - testing;

          return (
            <div key={fuelType} className="mb-1">
              <div className="border-t border-b border-black py-0.5 text-center font-bold" style={{ fontSize: '10px' }}>{fuelType}</div>
              <table className="w-full" style={{ fontSize: '8px' }}>
                <thead>
                  <tr>
                    <th className="text-left" style={{ width: '80px' }}></th>
                    {nozzles.map((nozzle: any, idx: number) => (
                      <th key={nozzle.id} className="text-right px-1 font-bold">{getNozzleLabel(nozzle, idx)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Opening Reading</td>
                    {nozzles.map((nozzle, idx) => (
                      <td key={idx} className="text-right px-1">{formatNumber(nozzle.openingReading, 3)}</td>
                    ))}
                  </tr>
                  <tr>
                    <td>Closing Reading</td>
                    {nozzles.map((nozzle, idx) => {
                      const displayClosing = nozzle.closingReading === 0 && nozzle.openingReading > 0 
                        ? nozzle.openingReading 
                        : nozzle.closingReading;
                      return <td key={idx} className="text-right px-1">{formatNumber(displayClosing, 3)}</td>;
                    })}
                  </tr>
                  <tr className="border-t border-black font-bold">
                    <td>SALES</td>
                    {nozzles.map((nozzle, idx) => {
                      const displayClosing = nozzle.closingReading === 0 && nozzle.openingReading > 0 
                        ? nozzle.openingReading 
                        : nozzle.closingReading;
                      return <td key={idx} className="text-right px-1">{formatNumber(Math.max(0, displayClosing - nozzle.openingReading), 3)}</td>;
                    })}
                  </tr>
                </tbody>
              </table>
              <div className="text-right" style={{ fontSize: '8px' }}>
                TOTAL SALES = {formatNumber(totalLiters, 2)} {testing > 0 && `-${testing} Testing=`} <strong>{formatNumber(netLiters, 2)} L</strong>
              </div>
            </div>
          );
        })}
      </div>

      {/* T-FORMAT: Inflows & Outflows */}
      <div className="grid grid-cols-2 gap-2 border-t-2 border-black pt-1" style={{ fontSize: '8px' }}>
        {/* Left - INFLOWS */}
        <div className="border-r border-black pr-2">
          <h3 className="font-bold text-center border-b border-black pb-0.5 mb-1" style={{ fontSize: '10px' }}>INFLOWS & BALANCES</h3>
          <div className="space-y-0.5">
            <div className="flex justify-between"><span>Opening Cash</span><span>{formatCurrency(entry.openingBalance || 0)}</span></div>
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
            {entry.lubeItems?.map((item) => (
              <div key={item.id} className="flex justify-between">
                <span>{item.name} ({item.quantity} × ₹{item.rate})</span>
                <span>{formatCurrency(item.quantity * item.rate)}</span>
              </div>
            ))}
            {entry.incomes?.map((income) => (
              <div key={income.id} className="flex justify-between">
                <span>{income.description}</span><span>{formatCurrency(income.amount)}</span>
              </div>
            ))}
            <div className="flex justify-between font-bold border-t border-black pt-1 mt-1" style={{ fontSize: '9px' }}>
              <span>TOTAL INFLOW</span><span>{formatCurrency(totals.grandTotalIncome)}</span>
            </div>
          </div>
        </div>

        {/* Right - OUTFLOWS */}
        <div className="pl-1">
          <h3 className="font-bold text-center border-b border-black pb-0.5 mb-1" style={{ fontSize: '10px' }}>OUTFLOWS & SETTLEMENTS</h3>
          <div className="space-y-0.5">
            {entry.expenses?.map((expense) => (
              <div key={expense.id} className="flex justify-between">
                <span>{expense.description}</span><span>{formatCurrency(expense.amount)}</span>
              </div>
            ))}
            {entry.creditSales?.map((cs) => (
              <div key={cs.id} className="flex justify-between text-red-600 font-medium">
                <span>{cs.debtorName} {cs.remarks && `(${cs.remarks})`}</span>
                <span>{formatCurrency(cs.amount)}</span>
              </div>
            ))}
            <div className="flex justify-between"><span>Bank Deposit</span><span>{formatCurrency(entry.cashDeposit || 0)}</span></div>
            <div className="flex justify-between"><span>UPI/Online</span><span>{formatCurrency(entry.upiCollection || 0)}</span></div>
            <div className="flex justify-between font-bold border-t border-black pt-1 mt-1">
              <span>Sub Total</span><span>{formatCurrency(totals.totalExpenses)}</span>
            </div>
            <div className="flex justify-between font-bold bg-gray-100 border border-black p-1 mt-1" style={{ fontSize: '9px' }}>
              <span>Closing Cash in Hand</span><span>{formatCurrency(totals.cashInHand)}</span>
            </div>
            <div className="flex justify-between font-bold border-t border-black pt-1 mt-1" style={{ fontSize: '9px' }}>
              <span>TOTAL OUTFLOW</span><span>{formatCurrency(totals.grandTotalIncome)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-2 pt-1 border-t-2 border-black flex justify-between font-bold" style={{ fontSize: '9px' }}>
        <span>Total Sale (Cash + Credit + UPI): ₹{formatCurrency(totals.totalFuelAmount + totals.totalLubeAmount + totals.totalIncomes + totalCreditSales)}</span>
        <span>Pump Balance: ₹{formatCurrency(totals.cashInHand)}</span>
      </div>
    </div>
  );
}