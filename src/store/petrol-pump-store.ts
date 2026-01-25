import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { 
  DailyEntry, 
  FuelRates, 
  Nozzle, 
  LubeItem, 
  ExpenseItem,
  IncomeItem,
  DEFAULT_FUEL_RATES,
  DEFAULT_NOZZLE_CONFIG,
  FuelType
} from '@/types/petrol-pump';

interface PetrolPumpState {
  entries: DailyEntry[];
  currentEntry: Partial<DailyEntry> | null;
  
  // Actions
  createNewEntry: (date: string, shiftName: string) => void;
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
  updatePayments: (upiCollection: number, cashDeposit: number) => void;
  updateTestingDeduction: (fuelType: FuelType, amount: number) => void;
  updateOpeningBalance: (amount: number) => void;
  saveEntry: () => void;
  deleteEntry: (id: string) => void;
  loadEntryForEdit: (id: string) => void;
  clearCurrentEntry: () => void;
  getLastClosingReadings: () => Record<string, number>;
  getLastCashInHand: () => number;
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
      openingReading: lastReadings[id] || 0,
      closingReading: lastReadings[id] || 0,
    };
  });
};

export const usePetrolPumpStore = create<PetrolPumpState>()(
  persist(
    (set, get) => ({
      entries: [],
      currentEntry: null,

      createNewEntry: (date, shiftName) => {
        const lastReadings = get().getLastClosingReadings();
        const lastCashInHand = get().getLastCashInHand();
        
        set({
          currentEntry: {
            id: generateId(),
            date,
            shiftName,
            fuelRates: { ...DEFAULT_FUEL_RATES },
            nozzles: createDefaultNozzles(lastReadings),
            lubeItems: [],
            expenses: [],
            incomes: [],
            upiCollection: 0,
            cashDeposit: 0,
            openingBalance: lastCashInHand,
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

      updatePayments: (upiCollection, cashDeposit) => {
        set((state) => ({
          currentEntry: state.currentEntry
            ? { ...state.currentEntry, upiCollection, cashDeposit }
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
        const { currentEntry, entries } = get();
        if (!currentEntry?.id) return;

        const completeEntry: DailyEntry = {
          id: currentEntry.id,
          date: currentEntry.date || new Date().toISOString().split('T')[0],
          shiftName: currentEntry.shiftName || '',
          fuelRates: currentEntry.fuelRates || DEFAULT_FUEL_RATES,
          nozzles: currentEntry.nozzles || [],
          lubeItems: currentEntry.lubeItems || [],
          expenses: currentEntry.expenses || [],
          incomes: currentEntry.incomes || [],
          upiCollection: currentEntry.upiCollection || 0,
          cashDeposit: currentEntry.cashDeposit || 0,
          openingBalance: currentEntry.openingBalance || 0,
          testingDeduction: currentEntry.testingDeduction || { MS: 0, HSD: 0, POWER: 0 },
          createdAt: currentEntry.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        const existingIndex = entries.findIndex((e) => e.id === completeEntry.id);
        
        if (existingIndex >= 0) {
          set({
            entries: entries.map((e, i) => (i === existingIndex ? completeEntry : e)),
            currentEntry: null,
          });
        } else {
          set({
            entries: [...entries, completeEntry],
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

      getLastClosingReadings: () => {
        const { entries } = get();
        if (entries.length === 0) return {};

        const sortedEntries = [...entries].sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );
        
        const lastEntry = sortedEntries[0];
        const readings: Record<string, number> = {};
        
        lastEntry.nozzles.forEach((n) => {
          readings[n.id] = n.closingReading;
        });

        return readings;
      },

      getLastCashInHand: () => {
        const { entries } = get();
        if (entries.length === 0) return 0;

        const sortedEntries = [...entries].sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );

        // Calculate cash in hand from the last entry
        const lastEntry = sortedEntries[0];
        const totals = calculateTotals(lastEntry);
        return totals.cashInHand;
      },
    }),
    {
      name: 'petrol-pump-storage',
    }
  )
);

// Helper function to calculate totals
export function calculateTotals(entry: DailyEntry | Partial<DailyEntry>): {
  fuelSales: { MS: { liters: number; amount: number }; HSD: { liters: number; amount: number }; POWER: { liters: number; amount: number } };
  totalFuelLiters: number;
  totalFuelAmount: number;
  totalLubeAmount: number;
  totalIncomes: number;
  grandTotalIncome: number;
  totalExpenses: number;
  cashInHand: number;
} {
  const fuelSales = {
    MS: { liters: 0, amount: 0 },
    HSD: { liters: 0, amount: 0 },
    POWER: { liters: 0, amount: 0 },
  };

  const rates = entry.fuelRates || DEFAULT_FUEL_RATES;
  const testingDeduction = entry.testingDeduction || { MS: 0, HSD: 0, POWER: 0 };

  (entry.nozzles || []).forEach((nozzle) => {
    const liters = Math.max(0, nozzle.closingReading - nozzle.openingReading);
    fuelSales[nozzle.fuelType].liters += liters;
  });

  // Apply testing deductions and calculate amounts
  (['MS', 'HSD', 'POWER'] as const).forEach((fuelType) => {
    const netLiters = Math.max(0, fuelSales[fuelType].liters - (testingDeduction[fuelType] || 0));
    fuelSales[fuelType].amount = netLiters * rates[fuelType];
  });

  const totalFuelLiters = fuelSales.MS.liters + fuelSales.HSD.liters + fuelSales.POWER.liters;
  const totalFuelAmount = fuelSales.MS.amount + fuelSales.HSD.amount + fuelSales.POWER.amount;
  const totalLubeAmount = (entry.lubeItems || []).reduce((sum, item) => sum + item.quantity * item.rate, 0);
  const totalIncomes = (entry.incomes || []).reduce((sum, item) => sum + item.amount, 0);
  const grandTotalIncome = totalFuelAmount + totalLubeAmount + totalIncomes + (entry.openingBalance || 0);
  const totalExpenses = (entry.expenses || []).reduce((sum, item) => sum + item.amount, 0) + (entry.upiCollection || 0) + (entry.cashDeposit || 0);
  const cashInHand = grandTotalIncome - totalExpenses;

  return {
    fuelSales,
    totalFuelLiters,
    totalFuelAmount,
    totalLubeAmount,
    totalIncomes,
    grandTotalIncome,
    totalExpenses,
    cashInHand,
  };
}
