import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { 
  DailyEntry, 
  FuelRates, 
  Nozzle, 
  LubeItem, 
  ExpenseItem,
  IncomeItem,
  CreditItem,
  PurchaseInvoice,
  CompanySettings,
  TankStock,
  DEFAULT_FUEL_RATES,
  DEFAULT_NOZZLE_CONFIG,
  DEFAULT_TANK_CAPACITIES,
  FuelType,
  DailyTotals
} from '@/types/petrol-pump';

interface PetrolPumpState {
  // Company & Settings
  companySettings: CompanySettings;
  tankStocks: TankStock[];
  initialNozzleReadings: Record<string, number>;
  initialCashBalance: number;
  
  // Entries & Purchases
  entries: DailyEntry[];
  purchases: PurchaseInvoice[];
  currentEntry: Partial<DailyEntry> | null;
  
  // Company Settings Actions
  updateCompanySettings: (settings: Partial<CompanySettings>) => void;
  updateTankStock: (fuelType: FuelType, stock: number) => void;
  updateInitialNozzleReading: (nozzleId: string, reading: number) => void;
  updateInitialCashBalance: (amount: number) => void;
  completeInitialSetup: () => void;
  
  // Entry Actions
  createNewEntry: (date: string, shiftName: string, isMultiDay?: boolean, endDate?: string) => void;
  updateFuelRates: (rates: FuelRates) => void;
  updateNozzle: (nozzleId: string, data: Partial<Nozzle>) => void;
  addLubeItem: (item: Omit<LubeItem, 'id'>) => void;
  updateLubeItem: (id: string, item: Partial<LubeItem>) => void;
  removeLubeItem: (id: string) => void;
  addExpense: (expense: Omit<ExpenseItem, 'id'>) => void;
  updateExpense: (id: string, expense: Partial<ExpenseItem>) => void;
  removeExpense: (id: string) => void;
  addIncome: (income: Omit<IncomeItem, 'id'>) => void;
  updateIncome: (id: string, income: Partial<IncomeItem>) => void;
  removeIncome: (id: string) => void;
  addCredit: (credit: Omit<CreditItem, 'id'>) => void;
  updateCredit: (id: string, credit: Partial<CreditItem>) => void;
  removeCredit: (id: string) => void;
  updatePayments: (upiCollection: number, bankDeposit: number) => void;
  updateTestingDeduction: (fuelType: FuelType, amount: number) => void;
  updateOpeningBalance: (amount: number) => void;
  saveEntry: () => void;
  deleteEntry: (id: string) => void;
  loadEntryForEdit: (id: string) => void;
  clearCurrentEntry: () => void;
  getLastClosingReadings: (beforeDate?: string) => Record<string, number>;
  getLastCashInHand: (beforeDate?: string) => number;
  
  // Purchase Actions
  addPurchase: (purchase: Omit<PurchaseInvoice, 'id' | 'createdAt' | 'vatAmount' | 'totalAmount' | 'densityDifference' | 'qualityStatus'>) => void;
  updatePurchase: (id: string, purchase: Partial<PurchaseInvoice>) => void;
  deletePurchase: (id: string) => void;
  
  // Stock calculations
  calculateCurrentStock: (fuelType: FuelType) => number;
}

const generateId = () => Math.random().toString(36).substring(2, 15);

const createDefaultNozzles = (lastReadings: Record<string, number>): Nozzle[] => {
  return DEFAULT_NOZZLE_CONFIG.map((config, index) => {
    const id = `nozzle-${config.fuelType}-${config.label}`;
    return {
      id,
      machineId: Math.floor(index / 2) + 1,
      nozzleNumber: (index % 2) + 1,
      fuelType: config.fuelType,
      label: config.label,
      openingReading: lastReadings[id] || 0,
      closingReading: lastReadings[id] || 0,
      testing: 0,
    };
  });
};

const defaultCompanySettings: CompanySettings = {
  name: 'KGN Fuel Centre',
  address: '',
  gstNumber: '',
  phone: '',
  isInitialized: false,
};

const defaultTankStocks: TankStock[] = [
  { fuelType: 'MS', currentStock: 0, capacity: DEFAULT_TANK_CAPACITIES.MS },
  { fuelType: 'HSD', currentStock: 0, capacity: DEFAULT_TANK_CAPACITIES.HSD },
  { fuelType: 'POWER', currentStock: 0, capacity: DEFAULT_TANK_CAPACITIES.POWER },
];

export const usePetrolPumpStore = create<PetrolPumpState>()(
  persist(
    (set, get) => ({
      companySettings: defaultCompanySettings,
      tankStocks: defaultTankStocks,
      initialNozzleReadings: {},
      initialCashBalance: 0,
      entries: [],
      purchases: [],
      currentEntry: null,

      updateCompanySettings: (settings) => {
        set((state) => ({
          companySettings: { ...state.companySettings, ...settings },
        }));
      },

      updateTankStock: (fuelType, stock) => {
        set((state) => ({
          tankStocks: state.tankStocks.map((t) =>
            t.fuelType === fuelType ? { ...t, currentStock: stock } : t
          ),
        }));
      },

      updateInitialNozzleReading: (nozzleId, reading) => {
        set((state) => ({
          initialNozzleReadings: {
            ...state.initialNozzleReadings,
            [nozzleId]: reading,
          },
        }));
      },

      updateInitialCashBalance: (amount) => {
        set({ initialCashBalance: amount });
      },

      completeInitialSetup: () => {
        set((state) => ({
          companySettings: { ...state.companySettings, isInitialized: true },
        }));
      },

      createNewEntry: (date, shiftName, isMultiDay = false, endDate) => {
        const beforeDate = isMultiDay && endDate ? date : undefined;
        const lastReadings = get().getLastClosingReadings(beforeDate);
        const lastCashInHand = get().getLastCashInHand(beforeDate);
        
        // If no entries exist, use initial readings
        const { entries, initialNozzleReadings, initialCashBalance } = get();
        const readingsToUse = entries.length === 0 ? initialNozzleReadings : lastReadings;
        const cashToUse = entries.length === 0 ? initialCashBalance : lastCashInHand;
        
        set({
          currentEntry: {
            id: generateId(),
            date,
            endDate: isMultiDay ? endDate : undefined,
            isMultiDay,
            shiftName,
            fuelRates: { ...DEFAULT_FUEL_RATES },
            nozzles: createDefaultNozzles(readingsToUse),
            lubeItems: [],
            expenses: [],
            incomes: [],
            credits: [],
            upiCollection: 0,
            bankDeposit: 0,
            openingBalance: cashToUse,
            testingDeduction: { MS: 0, HSD: 0, POWER: 0 },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        });
      },

      updateFuelRates: (rates) => {
        set((state) => ({
          currentEntry: state.currentEntry
            ? { ...state.currentEntry, fuelRates: rates }
            : null,
        }));
      },

      updateNozzle: (nozzleId, data) => {
        set((state) => {
          if (!state.currentEntry?.nozzles) return state;
          
          return {
            currentEntry: {
              ...state.currentEntry,
              nozzles: state.currentEntry.nozzles.map((n) =>
                n.id === nozzleId ? { ...n, ...data } : n
              ),
            },
          };
        });
      },

      addLubeItem: (item) => {
        set((state) => ({
          currentEntry: state.currentEntry
            ? {
                ...state.currentEntry,
                lubeItems: [
                  ...(state.currentEntry.lubeItems || []),
                  { ...item, id: generateId() },
                ],
              }
            : null,
        }));
      },

      updateLubeItem: (id, item) => {
        set((state) => ({
          currentEntry: state.currentEntry
            ? {
                ...state.currentEntry,
                lubeItems: state.currentEntry.lubeItems?.map((l) =>
                  l.id === id ? { ...l, ...item } : l
                ),
              }
            : null,
        }));
      },

      removeLubeItem: (id) => {
        set((state) => ({
          currentEntry: state.currentEntry
            ? {
                ...state.currentEntry,
                lubeItems: state.currentEntry.lubeItems?.filter((l) => l.id !== id),
              }
            : null,
        }));
      },

      addExpense: (expense) => {
        set((state) => ({
          currentEntry: state.currentEntry
            ? {
                ...state.currentEntry,
                expenses: [
                  ...(state.currentEntry.expenses || []),
                  { ...expense, id: generateId() },
                ],
              }
            : null,
        }));
      },

      updateExpense: (id, expense) => {
        set((state) => ({
          currentEntry: state.currentEntry
            ? {
                ...state.currentEntry,
                expenses: state.currentEntry.expenses?.map((e) =>
                  e.id === id ? { ...e, ...expense } : e
                ),
              }
            : null,
        }));
      },

      removeExpense: (id) => {
        set((state) => ({
          currentEntry: state.currentEntry
            ? {
                ...state.currentEntry,
                expenses: state.currentEntry.expenses?.filter((e) => e.id !== id),
              }
            : null,
        }));
      },

      addIncome: (income) => {
        set((state) => ({
          currentEntry: state.currentEntry
            ? {
                ...state.currentEntry,
                incomes: [
                  ...(state.currentEntry.incomes || []),
                  { ...income, id: generateId() },
                ],
              }
            : null,
        }));
      },

      updateIncome: (id, income) => {
        set((state) => ({
          currentEntry: state.currentEntry
            ? {
                ...state.currentEntry,
                incomes: state.currentEntry.incomes?.map((i) =>
                  i.id === id ? { ...i, ...income } : i
                ),
              }
            : null,
        }));
      },

      removeIncome: (id) => {
        set((state) => ({
          currentEntry: state.currentEntry
            ? {
                ...state.currentEntry,
                incomes: state.currentEntry.incomes?.filter((i) => i.id !== id),
              }
            : null,
        }));
      },

      addCredit: (credit) => {
        set((state) => ({
          currentEntry: state.currentEntry
            ? {
                ...state.currentEntry,
                credits: [
                  ...(state.currentEntry.credits || []),
                  { ...credit, id: generateId() },
                ],
              }
            : null,
        }));
      },

      updateCredit: (id, credit) => {
        set((state) => ({
          currentEntry: state.currentEntry
            ? {
                ...state.currentEntry,
                credits: state.currentEntry.credits?.map((c) =>
                  c.id === id ? { ...c, ...credit } : c
                ),
              }
            : null,
        }));
      },

      removeCredit: (id) => {
        set((state) => ({
          currentEntry: state.currentEntry
            ? {
                ...state.currentEntry,
                credits: state.currentEntry.credits?.filter((c) => c.id !== id),
              }
            : null,
        }));
      },

      updatePayments: (upiCollection, bankDeposit) => {
        set((state) => ({
          currentEntry: state.currentEntry
            ? { ...state.currentEntry, upiCollection, bankDeposit }
            : null,
        }));
      },

      updateTestingDeduction: (fuelType, amount) => {
        set((state) => ({
          currentEntry: state.currentEntry
            ? {
                ...state.currentEntry,
                testingDeduction: {
                  ...(state.currentEntry.testingDeduction || { MS: 0, HSD: 0, POWER: 0 }),
                  [fuelType]: amount,
                },
              }
            : null,
        }));
      },

      updateOpeningBalance: (amount) => {
        set((state) => ({
          currentEntry: state.currentEntry
            ? { ...state.currentEntry, openingBalance: amount }
            : null,
        }));
      },

      saveEntry: () => {
        const { currentEntry, entries, tankStocks } = get();
        if (!currentEntry?.id) return;

        const completeEntry: DailyEntry = {
          id: currentEntry.id,
          date: currentEntry.date || new Date().toISOString().split('T')[0],
          endDate: currentEntry.endDate,
          isMultiDay: currentEntry.isMultiDay || false,
          shiftName: currentEntry.shiftName || '',
          fuelRates: currentEntry.fuelRates || DEFAULT_FUEL_RATES,
          nozzles: currentEntry.nozzles || [],
          lubeItems: currentEntry.lubeItems || [],
          expenses: currentEntry.expenses || [],
          incomes: currentEntry.incomes || [],
          credits: currentEntry.credits || [],
          upiCollection: currentEntry.upiCollection || 0,
          bankDeposit: currentEntry.bankDeposit || 0,
          openingBalance: currentEntry.openingBalance || 0,
          testingDeduction: currentEntry.testingDeduction || { MS: 0, HSD: 0, POWER: 0 },
          createdAt: currentEntry.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        // Calculate fuel sales for stock update
        const totals = calculateTotals(completeEntry);
        
        // Update tank stocks (deduct sales)
        const updatedTankStocks = tankStocks.map((tank) => {
          const soldLiters = totals.fuelSales[tank.fuelType].liters;
          return {
            ...tank,
            currentStock: Math.max(0, tank.currentStock - soldLiters),
          };
        });

        const existingIndex = entries.findIndex((e) => e.id === completeEntry.id);
        
        if (existingIndex >= 0) {
          set({
            entries: entries.map((e, i) => (i === existingIndex ? completeEntry : e)),
            tankStocks: updatedTankStocks,
            currentEntry: null,
          });
        } else {
          set({
            entries: [...entries, completeEntry],
            tankStocks: updatedTankStocks,
            currentEntry: null,
          });
        }
      },

      deleteEntry: (id) => {
        set((state) => ({
          entries: state.entries.filter((e) => e.id !== id),
        }));
      },

      loadEntryForEdit: (id) => {
        const entry = get().entries.find((e) => e.id === id);
        if (entry) {
          set({ currentEntry: { ...entry } });
        }
      },

      clearCurrentEntry: () => {
        set({ currentEntry: null });
      },

      getLastClosingReadings: (beforeDate) => {
        const { entries } = get();
        if (entries.length === 0) return {};

        let filteredEntries = [...entries];
        if (beforeDate) {
          filteredEntries = entries.filter(
            (e) => new Date(e.date) < new Date(beforeDate)
          );
        }
        
        if (filteredEntries.length === 0) return {};

        const sortedEntries = filteredEntries.sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );
        
        const lastEntry = sortedEntries[0];
        const readings: Record<string, number> = {};
        
        lastEntry.nozzles.forEach((n) => {
          readings[n.id] = n.closingReading;
        });

        return readings;
      },

      getLastCashInHand: (beforeDate) => {
        const { entries, initialCashBalance } = get();
        if (entries.length === 0) return initialCashBalance;

        let filteredEntries = [...entries];
        if (beforeDate) {
          filteredEntries = entries.filter(
            (e) => new Date(e.date) < new Date(beforeDate)
          );
        }
        
        if (filteredEntries.length === 0) return initialCashBalance;

        const sortedEntries = filteredEntries.sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );

        const lastEntry = sortedEntries[0];
        const totals = calculateTotals(lastEntry);
        return totals.closingCash;
      },

      addPurchase: (purchaseData) => {
        const vatAmount = (purchaseData.quantityKL * 1000 * purchaseData.basicRate * purchaseData.vatPercentage) / 100;
        const totalAmount = (purchaseData.quantityKL * 1000 * purchaseData.basicRate) + vatAmount;
        const densityDifference = Math.abs(purchaseData.challanDensity - purchaseData.measuredDensity);
        const qualityStatus = densityDifference <= 3.0 ? 'accepted' : 'warning';

        const newPurchase: PurchaseInvoice = {
          ...purchaseData,
          id: generateId(),
          vatAmount,
          totalAmount,
          densityDifference,
          qualityStatus,
          createdAt: new Date().toISOString(),
        };

        // Update tank stock
        set((state) => {
          const updatedTankStocks = state.tankStocks.map((tank) => {
            if (tank.fuelType === purchaseData.fuelType) {
              return {
                ...tank,
                currentStock: tank.currentStock + (purchaseData.quantityKL * 1000),
              };
            }
            return tank;
          });

          return {
            purchases: [...state.purchases, newPurchase],
            tankStocks: updatedTankStocks,
          };
        });
      },

      updatePurchase: (id, purchase) => {
        set((state) => ({
          purchases: state.purchases.map((p) =>
            p.id === id ? { ...p, ...purchase } : p
          ),
        }));
      },

      deletePurchase: (id) => {
        set((state) => ({
          purchases: state.purchases.filter((p) => p.id !== id),
        }));
      },

      calculateCurrentStock: (fuelType) => {
        const { tankStocks } = get();
        const tank = tankStocks.find((t) => t.fuelType === fuelType);
        return tank?.currentStock || 0;
      },
    }),
    {
      name: 'petrol-pump-storage',
    }
  )
);

// Helper function to calculate totals - Updated for T-Format
export function calculateTotals(entry: DailyEntry | Partial<DailyEntry>): DailyTotals {
  const fuelSales = {
    MS: { liters: 0, amount: 0 },
    HSD: { liters: 0, amount: 0 },
    POWER: { liters: 0, amount: 0 },
  };

  const rates = entry.fuelRates || DEFAULT_FUEL_RATES;
  const testingDeduction = entry.testingDeduction || { MS: 0, HSD: 0, POWER: 0 };

  (entry.nozzles || []).forEach((nozzle) => {
    const grossLiters = Math.max(0, nozzle.closingReading - nozzle.openingReading);
    const testing = nozzle.testing || 0;
    const netLiters = Math.max(0, grossLiters - testing);
    fuelSales[nozzle.fuelType].liters += netLiters;
  });

  // Apply global testing deductions and calculate amounts
  (['MS', 'HSD', 'POWER'] as const).forEach((fuelType) => {
    const netLiters = Math.max(0, fuelSales[fuelType].liters - (testingDeduction[fuelType] || 0));
    fuelSales[fuelType].liters = netLiters;
    fuelSales[fuelType].amount = netLiters * rates[fuelType];
  });

  const totalFuelLiters = fuelSales.MS.liters + fuelSales.HSD.liters + fuelSales.POWER.liters;
  const totalFuelAmount = fuelSales.MS.amount + fuelSales.HSD.amount + fuelSales.POWER.amount;
  const totalLubeAmount = (entry.lubeItems || []).reduce((sum, item) => sum + item.quantity * item.rate, 0);
  const totalOtherIncome = (entry.incomes || []).reduce((sum, item) => sum + item.amount, 0);
  const totalCredits = (entry.credits || []).reduce((sum, item) => sum + item.amount, 0);
  
  // Inflows
  const openingCash = entry.openingBalance || 0;
  const totalInflow = openingCash + totalFuelAmount + totalLubeAmount + totalOtherIncome;
  
  // Outflows
  const totalExpenses = (entry.expenses || []).reduce((sum, item) => sum + item.amount, 0);
  const totalBankDeposit = entry.bankDeposit || 0;
  const totalUpi = entry.upiCollection || 0;
  const totalOutflow = totalExpenses + totalBankDeposit + totalUpi + totalCredits;
  
  // Net
  const closingCash = totalInflow - totalOutflow;

  return {
    fuelSales,
    totalFuelLiters,
    totalFuelAmount,
    totalLubeAmount,
    totalOtherIncome,
    totalCredits,
    openingCash,
    totalInflow,
    totalExpenses,
    totalBankDeposit,
    totalUpi,
    totalOutflow,
    closingCash,
  };
}
