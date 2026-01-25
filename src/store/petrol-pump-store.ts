import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { 
  DailyEntry, 
  FuelRates, 
  Nozzle, 
  LubeItem, 
  ExpenseItem,
  IncomeItem,
  CreditSaleItem,
  Debtor,
  DEFAULT_FUEL_RATES,
  DEFAULT_NOZZLE_CONFIG,
  FuelType
} from '@/types/petrol-pump';
import { usePurchaseStore } from '@/store/purchase-store';

// Helper to get purchase store reference
const usePurchaseStoreRef = () => usePurchaseStore.getState();

interface PetrolPumpState {
  entries: DailyEntry[];
  debtors: Debtor[];
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
  addCreditSale: (creditSale: Omit<CreditSaleItem, 'id'>) => void;
  updateCreditSale: (id: string, creditSale: Partial<CreditSaleItem>) => void;
  removeCreditSale: (id: string) => void;
  updatePayments: (upiCollection: number, cashDeposit: number) => void;
  updateTestingDeduction: (fuelType: FuelType, amount: number) => void;
  updateOpeningBalance: (amount: number) => void;
  saveEntry: () => { hasNegativeStock: boolean } | undefined;
  deleteEntry: (id: string) => void;
  loadEntryForEdit: (id: string) => void;
  clearCurrentEntry: () => void;
  getLastClosingReadings: () => Record<string, number>;
  getLastCashInHand: () => number;
  isFirstEntry: () => boolean;
  addDebtor: (name: string, contactNumber?: string, openingBalance?: number) => Debtor;
  updateDebtor: (id: string, data: Partial<Debtor>) => void;
  deleteDebtor: (id: string) => void;
  getDebtors: () => Debtor[];
  validateNozzleReadings: () => { valid: boolean; errors: string[] };
  normalizeNozzleReadings: () => void;
  clearAllData: () => void;
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
      debtors: [],
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
            creditSales: [],
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

      addCreditSale: (creditSale) => {
        set((state) => ({
          currentEntry: state.currentEntry
            ? {
                ...state.currentEntry,
                creditSales: [
                  ...(state.currentEntry.creditSales || []),
                  { ...creditSale, id: generateId() },
                ],
              }
            : null,
        }));
      },

      updateCreditSale: (id, creditSale) => {
        set((state) => ({
          currentEntry: state.currentEntry
            ? {
                ...state.currentEntry,
                creditSales: state.currentEntry.creditSales?.map((c) =>
                  c.id === id ? { ...c, ...creditSale } : c
                ),
              }
            : null,
        }));
      },

      removeCreditSale: (id) => {
        set((state) => ({
          currentEntry: state.currentEntry
            ? {
                ...state.currentEntry,
                creditSales: state.currentEntry.creditSales?.filter((c) => c.id !== id),
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
        const { currentEntry, entries, debtors } = get();
        if (!currentEntry?.id) return;

        // Normalize nozzle readings: if closing is empty (0) and opening has value, set closing = opening
        const normalizedNozzles = (currentEntry.nozzles || []).map((n) => ({
          ...n,
          closingReading: n.closingReading === 0 && n.openingReading > 0 
            ? n.openingReading 
            : n.closingReading,
        }));

        const completeEntry: DailyEntry = {
          id: currentEntry.id,
          date: currentEntry.date || new Date().toISOString().split('T')[0],
          shiftName: currentEntry.shiftName || '',
          fuelRates: currentEntry.fuelRates || DEFAULT_FUEL_RATES,
          nozzles: normalizedNozzles,
          lubeItems: currentEntry.lubeItems || [],
          expenses: currentEntry.expenses || [],
          incomes: currentEntry.incomes || [],
          creditSales: currentEntry.creditSales || [],
          upiCollection: currentEntry.upiCollection || 0,
          cashDeposit: currentEntry.cashDeposit || 0,
          openingBalance: currentEntry.openingBalance || 0,
          testingDeduction: currentEntry.testingDeduction || { MS: 0, HSD: 0, POWER: 0 },
          createdAt: currentEntry.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        // Update debtor outstanding amounts
        const updatedDebtors = [...debtors];
        (currentEntry.creditSales || []).forEach((cs) => {
          const debtorIndex = updatedDebtors.findIndex(d => d.id === cs.debtorId);
          if (debtorIndex >= 0) {
            updatedDebtors[debtorIndex] = {
              ...updatedDebtors[debtorIndex],
              totalOutstanding: updatedDebtors[debtorIndex].totalOutstanding + cs.amount,
              updatedAt: new Date().toISOString(),
            };
          }
        });

        // Check if this is an edit (existing entry) - we need to reverse old stock deductions first
        const existingIndex = entries.findIndex((e) => e.id === completeEntry.id);
        const isEdit = existingIndex >= 0;
        
        // Import purchase store for stock deduction
        const purchaseStore = usePurchaseStoreRef();
        
        if (isEdit) {
          // Reverse the old entry's stock deductions
          const oldEntry = entries[existingIndex];
          oldEntry.nozzles.forEach((nozzle) => {
            const testDeduction = oldEntry.testingDeduction?.[nozzle.fuelType] || 0;
            const liters = Math.max(0, nozzle.closingReading - nozzle.openingReading - testDeduction);
            if (liters > 0) {
              // Add back the old amount (reverse deduction)
              purchaseStore.addToTankByNozzle(nozzle.id, liters);
            }
          });
        }

        // Deduct new sales from tanks
        let hasNegativeStock = false;
        normalizedNozzles.forEach((nozzle) => {
          const testDeduction = completeEntry.testingDeduction?.[nozzle.fuelType] || 0;
          const liters = Math.max(0, nozzle.closingReading - nozzle.openingReading - testDeduction);
          if (liters > 0) {
            const result = purchaseStore.deductFromTankByNozzle(nozzle.id, liters);
            if (result && result.isNegative) {
              hasNegativeStock = true;
            }
          }
        });

        if (existingIndex >= 0) {
          set({
            entries: entries.map((e, i) => (i === existingIndex ? completeEntry : e)),
            debtors: updatedDebtors,
            currentEntry: null,
          });
        } else {
          set({
            entries: [...entries, completeEntry],
            debtors: updatedDebtors,
            currentEntry: null,
          });
        }
        
        return { hasNegativeStock };
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

      isFirstEntry: () => {
        const { entries } = get();
        return entries.length === 0;
      },

      addDebtor: (name, contactNumber, openingBalance) => {
        const newDebtor: Debtor = {
          id: generateId(),
          name,
          contactNumber,
          openingBalance: openingBalance || 0,
          totalOutstanding: openingBalance || 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        
        set((state) => ({
          debtors: [...state.debtors, newDebtor],
        }));
        
        return newDebtor;
      },

      updateDebtor: (id, data) => {
        set((state) => ({
          debtors: state.debtors.map((d) =>
            d.id === id ? { ...d, ...data, updatedAt: new Date().toISOString() } : d
          ),
        }));
      },

      deleteDebtor: (id) => {
        set((state) => ({
          debtors: state.debtors.filter((d) => d.id !== id),
        }));
      },

      getDebtors: () => {
        return get().debtors;
      },

      validateNozzleReadings: () => {
        const { currentEntry } = get();
        const errors: string[] = [];
        
        if (!currentEntry?.nozzles) return { valid: true, errors: [] };
        
        currentEntry.nozzles.forEach((nozzle) => {
          // Only validate if closing reading was entered (not empty/0 when opening is 0)
          if (nozzle.closingReading > 0 || nozzle.openingReading > 0) {
            if (nozzle.closingReading < nozzle.openingReading) {
              const config = DEFAULT_NOZZLE_CONFIG.find((c) => 
                `nozzle-${c.fuelType}-${c.label}` === nozzle.id
              );
              errors.push(`${nozzle.fuelType} ${config?.label || nozzle.id}: Closing reading cannot be less than opening reading`);
            }
          }
        });
        
        return { valid: errors.length === 0, errors };
      },

      normalizeNozzleReadings: () => {
        // If closing is empty/0, set it to opening (no sale scenario)
        set((state) => {
          if (!state.currentEntry?.nozzles) return state;
          
          return {
            currentEntry: {
              ...state.currentEntry,
              nozzles: state.currentEntry.nozzles.map((n) => ({
                ...n,
                closingReading: n.closingReading === 0 ? n.openingReading : n.closingReading,
              })),
            },
          };
        });
      },

      clearAllData: () => {
        set({
          entries: [],
          debtors: [],
          currentEntry: null,
        });
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
  totalCreditSales: number;
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
  const totalCreditSales = (entry.creditSales || []).reduce((sum, item) => sum + item.amount, 0);
  const grandTotalIncome = totalFuelAmount + totalLubeAmount + totalIncomes + (entry.openingBalance || 0);
  const totalExpenses = (entry.expenses || []).reduce((sum, item) => sum + item.amount, 0) 
    + (entry.upiCollection || 0) 
    + (entry.cashDeposit || 0)
    + totalCreditSales;
  const cashInHand = grandTotalIncome - totalExpenses;

  return {
    fuelSales,
    totalFuelLiters,
    totalFuelAmount,
    totalLubeAmount,
    totalIncomes,
    totalCreditSales,
    grandTotalIncome,
    totalExpenses,
    cashInHand,
  };
}