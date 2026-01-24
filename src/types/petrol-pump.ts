// Fuel types available
export type FuelType = 'MS' | 'HSD' | 'POWER';

// Company settings
export interface CompanySettings {
  name: string;
  address: string;
  gstNumber: string;
  phone: string;
  isInitialized: boolean;
}

// Tank/Stock configuration
export interface TankStock {
  fuelType: FuelType;
  currentStock: number; // in liters
  capacity: number; // tank capacity
}

// Initial nozzle readings for Day 1 setup
export interface InitialNozzleReading {
  id: string;
  fuelType: FuelType;
  label: string;
  reading: number;
}

// Nozzle configuration
export interface Nozzle {
  id: string;
  machineId: number;
  nozzleNumber: number;
  fuelType: FuelType;
  label: string;
  openingReading: number;
  closingReading: number;
  testing: number; // testing deduction per nozzle
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

// Credit sale item
export interface CreditItem {
  id: string;
  customerName: string;
  amount: number;
}

// Purchase/Invoice for TT unloading
export interface PurchaseInvoice {
  id: string;
  invoiceNumber: string;
  date: string;
  supplier: string;
  fuelType: FuelType;
  quantityKL: number; // in Kiloliters
  basicRate: number;
  vatPercentage: number;
  vatAmount: number;
  totalAmount: number;
  // Quality Control
  challanDensity: number;
  challanTemperature: number;
  measuredDensity: number;
  measuredTemperature: number;
  densityDifference: number;
  qualityStatus: 'accepted' | 'warning' | 'pending';
  createdAt: string;
}

// Daily Entry - Updated
export interface DailyEntry {
  id: string;
  date: string;
  endDate?: string; // For multi-day entries
  isMultiDay: boolean;
  shiftName: string;
  fuelRates: FuelRates;
  nozzles: Nozzle[];
  lubeItems: LubeItem[];
  expenses: ExpenseItem[];
  incomes: IncomeItem[];
  credits: CreditItem[];
  upiCollection: number;
  bankDeposit: number;
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
  totalOtherIncome: number;
  totalCredits: number;
  // Inflow
  openingCash: number;
  totalInflow: number;
  // Outflow
  totalExpenses: number;
  totalBankDeposit: number;
  totalUpi: number;
  totalOutflow: number;
  // Net
  closingCash: number;
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

// Default tank capacities (in liters)
export const DEFAULT_TANK_CAPACITIES: Record<FuelType, number> = {
  MS: 20000,
  HSD: 20000,
  POWER: 10000,
};
