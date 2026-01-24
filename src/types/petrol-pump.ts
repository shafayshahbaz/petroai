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
  grandTotalIncome: number;
  totalExpenses: number;
  cashInHand: number;
}

// Nozzle configuration by fuel type (based on the reference image)
export const DEFAULT_NOZZLE_CONFIG: { fuelType: FuelType; label: string }[] = [
  // MS - 4 nozzles
  { fuelType: 'MS', label: 'N1' },
  { fuelType: 'MS', label: 'N2' },
  { fuelType: 'MS', label: 'A1' },
  { fuelType: 'MS', label: 'A2' },
  // POWER - 3 nozzles
  { fuelType: 'POWER', label: 'A1' },
  { fuelType: 'POWER', label: 'B1' },
  { fuelType: 'POWER', label: 'A2' },
  // HSD - 3 nozzles
  { fuelType: 'HSD', label: 'A2' },
  { fuelType: 'HSD', label: 'B2' },
  { fuelType: 'HSD', label: 'A1' },
];

// Default fuel rates
export const DEFAULT_FUEL_RATES: FuelRates = {
  MS: 106.93,
  HSD: 93.20,
  POWER: 114.77,
};
