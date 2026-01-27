// Fuel types available
export type FuelType = 'MS' | 'HSD' | 'POWER';

// Nozzle configuration
export interface Nozzle {
  id: string;
  machineId: number;
  nozzleNumber: number;
  fuelType: FuelType;
  openingReading: number;
  closingReading: number;
}

// Fuel rates
export interface FuelRates {
  MS: number;
  HSD: number;
  POWER: number;
}

// Lube item
export interface LubeItem {
  id: string;
  name: string;
  quantity: number;
  rate: number;
}

// Expense item
export interface ExpenseItem {
  id: string;
  description: string;
  amount: number;
}

// Income item (for other income sources)
export interface IncomeItem {
  id: string;
  description: string;
  amount: number;
}

// Credit Sale item (for debtors)
export interface CreditSaleItem {
  id: string;
  debtorId: string;
  debtorName: string;
  amount: number;
  remarks?: string; // Challan No. or vehicle details
}

// Debtor
export interface Debtor {
  id: string;
  name: string;
  contactNumber?: string;
  openingBalance?: number; // For old dues before using this software
  totalOutstanding: number;
  createdAt: string;
  updatedAt: string;
}

// Ledger transaction for Tally-style view
export interface LedgerTransaction {
  date: string;
  particulars: string;
  remarks?: string;
  debit: number;
  credit: number;
  balance: number;
  entryId?: string;
}

// Payment collection
export interface PaymentCollection {
  upiCollection: number;
  cashDeposit: number;
  otherPayments: { description: string; amount: number }[];
}

// Daily Entry
export interface DailyEntry {
  id: string;
  date: string;
  shiftName: string;
  fuelRates: FuelRates;
  nozzles: Nozzle[];
  lubeItems: LubeItem[];
  expenses: ExpenseItem[];
  incomes: IncomeItem[];
  creditSales: CreditSaleItem[];
  upiCollection: number;
  cashDeposit: number;
  openingBalance: number;
  testingDeduction: {
    MS: number;
    HSD: number;
    POWER: number;
  };
  createdAt: string;
  updatedAt: string;
}

// Calculated totals for a daily entry
export interface DailyTotals {
  fuelSales: {
    MS: { liters: number; amount: number };
    HSD: { liters: number; amount: number };
    POWER: { liters: number; amount: number };
  };
  totalFuelLiters: number;
  totalFuelAmount: number;
  totalLubeAmount: number;
  totalIncomes: number;
  totalCreditSales: number;
  grandTotalIncome: number;
  totalExpenses: number;
  cashInHand: number;
}

// Note: Nozzle configurations are now dynamically created by users via the Stock page.
// No default nozzles are pre-populated - new accounts start with empty hardware.

// Default fuel rates
export const DEFAULT_FUEL_RATES: FuelRates = {
  MS: 106.93,
  HSD: 93.20,
  POWER: 114.77,
};
