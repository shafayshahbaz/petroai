// Fuel types available
export type FuelType = 'MS' | 'HSD' | 'POWER';

// Company settings
export interface CompanySettings {
  name: string;
  address: string;
  gstNumber: string;
  phone: string;
  logo?: string;
  isInitialized: boolean;
}

// Dynamic Tank configuration
export interface Tank {
  id: string;
  name: string;
  fuelType: FuelType;
  capacity: number; // in liters
  currentStock: number; // in liters
  lowStockThreshold: number; // Alert when below this
}

// Dynamic Machine configuration
export interface Machine {
  id: string;
  name: string;
  nozzles: MachineNozzle[];
}

// Dynamic Nozzle configuration
export interface MachineNozzle {
  id: string;
  label: string;
  fuelType: FuelType;
  tankId: string; // Which tank this nozzle draws from
}

// Initial nozzle readings for Day 1 setup
export interface InitialNozzleReading {
  id: string;
  fuelType: FuelType;
  label: string;
  reading: number;
}

// Nozzle reading entry (for daily entries)
export interface Nozzle {
  id: string;
  machineId: string;
  nozzleNumber: number;
  fuelType: FuelType;
  label: string;
  tankId?: string; // Which tank this nozzle draws from
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
  tankId?: string; // Which tank to add stock to
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

// Staff member
export interface Staff {
  id: string;
  name: string;
  phone?: string;
  isActive: boolean;
  createdAt: string;
}

// Shift Entry - Sales by Person
export interface ShiftEntry {
  id: string;
  businessDate: string; // The business date (e.g., 24th = 23rd 7PM to 24th 7PM)
  staffId: string;
  staffName: string;
  // Nozzle readings for this shift
  nozzleReadings: ShiftNozzleReading[];
  // Sales calculation
  totalLiters: number;
  totalAmount: number;
  // Deductions
  upiCollection: number; // Staff's QR collection
  expenses: number; // Small expenses paid by staff
  salaryAdvance: number; // Cash taken for personal use
  creditSales: number; // Credit given to customers
  // Net result
  netCashToHandover: number;
  // Metadata
  createdAt: string;
  updatedAt: string;
}

// Nozzle reading within a shift
export interface ShiftNozzleReading {
  nozzleId: string;
  nozzleLabel: string;
  machineId: string;
  machineName: string;
  fuelType: FuelType;
  tankId: string;
  openingReading: number;
  closingReading: number;
  rate: number;
  liters: number;
  amount: number;
}

// Tank/Stock configuration (legacy - for backwards compatibility)
export interface TankStock {
  fuelType: FuelType;
  currentStock: number;
  capacity: number;
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

// Nozzle configuration by fuel type (based on the reference image) - DEFAULT for backwards compatibility
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

// Fuel type display info
export const FUEL_TYPE_INFO: Record<FuelType, { name: string; color: string }> = {
  MS: { name: 'MS (Petrol)', color: 'bg-amber-500' },
  HSD: { name: 'HSD (Diesel)', color: 'bg-green-600' },
  POWER: { name: 'POWER (Premium)', color: 'bg-blue-600' },
};
