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
  Tank,
  Machine,
  MachineNozzle,
  TankStock,
  DEFAULT_FUEL_RATES,
  DEFAULT_NOZZLE_CONFIG,
  DEFAULT_TANK_CAPACITIES,
  FuelType,
  DailyTotals,
  Staff,
  ShiftEntry,
  ShiftNozzleReading
} from '@/types/petrol-pump';

interface PetrolPumpState {
  // Company & Settings
  companySettings: CompanySettings;
  
  // Dynamic Infrastructure
  tanks: Tank[];
  machines: Machine[];
  
  // Staff & Shift Entries
  staff: Staff[];
  shiftEntries: ShiftEntry[];
  
  // Legacy tank stocks (for backwards compatibility)
  tankStocks: TankStock[];
  
  initialNozzleReadings: Record<string, number>;
  initialCashBalance: number;
  
  // Entries & Purchases
  entries: DailyEntry[];
  purchases: PurchaseInvoice[];
  currentEntry: Partial<DailyEntry> | null;
  
  // Company Settings Actions
  updateCompanySettings: (settings: Partial<CompanySettings>) => void;
  completeInitialSetup: () => void;
  
  // Dynamic Tank Management
  addTank: (tank: Omit<Tank, 'id'>) => void;
  updateTank: (id: string, data: Partial<Tank>) => void;
  deleteTank: (id: string) => void;
  updateTankStock: (tankIdOrFuelType: string | FuelType, stock: number) => void;
  
  // Dynamic Machine Management
  addMachine: (name: string) => void;
  updateMachine: (id: string, data: Partial<Machine>) => void;
  deleteMachine: (id: string) => void;
  
  // Dynamic Nozzle Management
  addNozzleToMachine: (machineId: string, nozzle: Omit<MachineNozzle, 'id'>) => void;
  updateMachineNozzle: (machineId: string, nozzleId: string, data: Partial<MachineNozzle>) => void;
  deleteNozzleFromMachine: (machineId: string, nozzleId: string) => void;
  
  // Nozzle-Tank Mapping
  mapNozzleToTank: (machineId: string, nozzleId: string, tankId: string) => void;
  
  updateInitialNozzleReading: (nozzleId: string, reading: number) => void;
  updateInitialCashBalance: (amount: number) => void;
  
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
  getTankStock: (tankId: string) => number;
  
  // Helper to get all nozzles from machines
  getAllNozzles: () => Array<MachineNozzle & { machineId: string; machineName: string }>;
  
  // Staff Actions
  addStaff: (name: string) => void;
  updateStaff: (id: string, data: Partial<Staff>) => void;
  deleteStaff: (id: string) => void;
  
  // Shift Entry Actions
  addShiftEntry: (entry: Omit<ShiftEntry, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateShiftEntry: (id: string, data: Partial<ShiftEntry>) => void;
  deleteShiftEntry: (id: string) => void;
  getLastShiftClosingReadings: (beforeDate?: string) => Record<string, number>;
}

const generateId = () => Math.random().toString(36).substring(2, 15);

// Create nozzles from dynamic machines configuration
const createNozzlesFromMachines = (machines: Machine[], lastReadings: Record<string, number>): Nozzle[] => {
  const nozzles: Nozzle[] = [];
  
  machines.forEach((machine) => {
    machine.nozzles.forEach((nozzle, index) => {
      const id = nozzle.id;
      nozzles.push({
        id,
        machineId: machine.id,
        nozzleNumber: index + 1,
        fuelType: nozzle.fuelType,
        label: nozzle.label,
        tankId: nozzle.tankId,
        openingReading: lastReadings[id] || 0,
        closingReading: lastReadings[id] || 0,
        testing: 0,
      });
    });
  });
  
  return nozzles;
};

// Create nozzles from default config (for backwards compatibility)
const createDefaultNozzles = (lastReadings: Record<string, number>): Nozzle[] => {
  return DEFAULT_NOZZLE_CONFIG.map((config, index) => {
    const id = `nozzle-${config.fuelType}-${config.label}`;
    return {
      id,
      machineId: `machine-${Math.floor(index / 2) + 1}`,
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

// Default tanks
const defaultTanks: Tank[] = [
  { id: 'tank-ms-1', name: 'MS Tank 1', fuelType: 'MS', capacity: 20000, currentStock: 0, lowStockThreshold: 1000 },
  { id: 'tank-hsd-1', name: 'HSD Tank 1', fuelType: 'HSD', capacity: 20000, currentStock: 0, lowStockThreshold: 1000 },
  { id: 'tank-power-1', name: 'Power Tank 1', fuelType: 'POWER', capacity: 10000, currentStock: 0, lowStockThreshold: 500 },
];

// Default machines with nozzles
const defaultMachines: Machine[] = [
  {
    id: 'machine-1',
    name: 'Machine 1',
    nozzles: [
      { id: 'nozzle-MS-N1', label: 'N1', fuelType: 'MS', tankId: 'tank-ms-1' },
      { id: 'nozzle-MS-N2', label: 'N2', fuelType: 'MS', tankId: 'tank-ms-1' },
    ],
  },
  {
    id: 'machine-2',
    name: 'Machine 2',
    nozzles: [
      { id: 'nozzle-MS-A1', label: 'A1', fuelType: 'MS', tankId: 'tank-ms-1' },
      { id: 'nozzle-MS-A2', label: 'A2', fuelType: 'MS', tankId: 'tank-ms-1' },
    ],
  },
  {
    id: 'machine-3',
    name: 'Machine 3',
    nozzles: [
      { id: 'nozzle-POWER-A1', label: 'A1', fuelType: 'POWER', tankId: 'tank-power-1' },
      { id: 'nozzle-POWER-B1', label: 'B1', fuelType: 'POWER', tankId: 'tank-power-1' },
      { id: 'nozzle-POWER-A2', label: 'A2', fuelType: 'POWER', tankId: 'tank-power-1' },
    ],
  },
  {
    id: 'machine-4',
    name: 'Machine 4',
    nozzles: [
      { id: 'nozzle-HSD-A2', label: 'A2', fuelType: 'HSD', tankId: 'tank-hsd-1' },
      { id: 'nozzle-HSD-B2', label: 'B2', fuelType: 'HSD', tankId: 'tank-hsd-1' },
      { id: 'nozzle-HSD-A1', label: 'A1', fuelType: 'HSD', tankId: 'tank-hsd-1' },
    ],
  },
];

export const usePetrolPumpStore = create<PetrolPumpState>()(
  persist(
    (set, get) => ({
      companySettings: defaultCompanySettings,
      tanks: defaultTanks,
      machines: defaultMachines,
      staff: [],
      shiftEntries: [],
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

      completeInitialSetup: () => {
        set((state) => ({
          companySettings: { ...state.companySettings, isInitialized: true },
        }));
      },

      // Tank Management
      addTank: (tankData) => {
        const newTank: Tank = {
          ...tankData,
          id: generateId(),
        };
        set((state) => ({
          tanks: [...state.tanks, newTank],
        }));
      },

      updateTank: (id, data) => {
        set((state) => ({
          tanks: state.tanks.map((t) => (t.id === id ? { ...t, ...data } : t)),
        }));
      },

      deleteTank: (id) => {
        set((state) => ({
          tanks: state.tanks.filter((t) => t.id !== id),
        }));
      },

      updateTankStock: (tankIdOrFuelType, stock) => {
        set((state) => {
          // Check if it's a tank ID or fuel type
          const isTankId = state.tanks.some((t) => t.id === tankIdOrFuelType);
          
          if (isTankId) {
            return {
              tanks: state.tanks.map((t) =>
                t.id === tankIdOrFuelType ? { ...t, currentStock: stock } : t
              ),
            };
          } else {
            // Legacy: update by fuel type
            return {
              tankStocks: state.tankStocks.map((t) =>
                t.fuelType === tankIdOrFuelType ? { ...t, currentStock: stock } : t
              ),
              tanks: state.tanks.map((t) =>
                t.fuelType === tankIdOrFuelType ? { ...t, currentStock: stock } : t
              ),
            };
          }
        });
      },

      // Machine Management
      addMachine: (name) => {
        const newMachine: Machine = {
          id: generateId(),
          name,
          nozzles: [],
        };
        set((state) => ({
          machines: [...state.machines, newMachine],
        }));
      },

      updateMachine: (id, data) => {
        set((state) => ({
          machines: state.machines.map((m) => (m.id === id ? { ...m, ...data } : m)),
        }));
      },

      deleteMachine: (id) => {
        set((state) => ({
          machines: state.machines.filter((m) => m.id !== id),
        }));
      },

      // Nozzle Management
      addNozzleToMachine: (machineId, nozzleData) => {
        const newNozzle: MachineNozzle = {
          ...nozzleData,
          id: generateId(),
        };
        set((state) => ({
          machines: state.machines.map((m) =>
            m.id === machineId
              ? { ...m, nozzles: [...m.nozzles, newNozzle] }
              : m
          ),
        }));
      },

      updateMachineNozzle: (machineId, nozzleId, data) => {
        set((state) => ({
          machines: state.machines.map((m) =>
            m.id === machineId
              ? {
                  ...m,
                  nozzles: m.nozzles.map((n) =>
                    n.id === nozzleId ? { ...n, ...data } : n
                  ),
                }
              : m
          ),
        }));
      },

      deleteNozzleFromMachine: (machineId, nozzleId) => {
        set((state) => ({
          machines: state.machines.map((m) =>
            m.id === machineId
              ? { ...m, nozzles: m.nozzles.filter((n) => n.id !== nozzleId) }
              : m
          ),
        }));
      },

      mapNozzleToTank: (machineId, nozzleId, tankId) => {
        set((state) => ({
          machines: state.machines.map((m) =>
            m.id === machineId
              ? {
                  ...m,
                  nozzles: m.nozzles.map((n) =>
                    n.id === nozzleId ? { ...n, tankId } : n
                  ),
                }
              : m
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

      createNewEntry: (date, shiftName, isMultiDay = false, endDate) => {
        const beforeDate = isMultiDay && endDate ? date : undefined;
        const lastReadings = get().getLastClosingReadings(beforeDate);
        const lastCashInHand = get().getLastCashInHand(beforeDate);
        
        const { entries, initialNozzleReadings, initialCashBalance, machines } = get();
        const readingsToUse = entries.length === 0 ? initialNozzleReadings : lastReadings;
        const cashToUse = entries.length === 0 ? initialCashBalance : lastCashInHand;
        
        // Create nozzles from machines configuration
        const nozzles = machines.length > 0 
          ? createNozzlesFromMachines(machines, readingsToUse)
          : createDefaultNozzles(readingsToUse);
        
        set({
          currentEntry: {
            id: generateId(),
            date,
            endDate: isMultiDay ? endDate : undefined,
            isMultiDay,
            shiftName,
            fuelRates: { ...DEFAULT_FUEL_RATES },
            nozzles,
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
        const { currentEntry, entries, tanks } = get();
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

        // Calculate fuel sales for stock update (tank-aware)
        const salesByTank: Record<string, number> = {};
        
        completeEntry.nozzles.forEach((nozzle) => {
          const grossLiters = Math.max(0, nozzle.closingReading - nozzle.openingReading);
          const netLiters = Math.max(0, grossLiters - (nozzle.testing || 0));
          
          if (nozzle.tankId) {
            salesByTank[nozzle.tankId] = (salesByTank[nozzle.tankId] || 0) + netLiters;
          }
        });
        
        // Update tank stocks (deduct sales per tank)
        const updatedTanks = tanks.map((tank) => {
          const soldLiters = salesByTank[tank.id] || 0;
          return {
            ...tank,
            currentStock: Math.max(0, tank.currentStock - soldLiters),
          };
        });

        const existingIndex = entries.findIndex((e) => e.id === completeEntry.id);
        
        if (existingIndex >= 0) {
          set({
            entries: entries.map((e, i) => (i === existingIndex ? completeEntry : e)),
            tanks: updatedTanks,
            currentEntry: null,
          });
        } else {
          set({
            entries: [...entries, completeEntry],
            tanks: updatedTanks,
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
          let updatedTanks = state.tanks;
          
          if (purchaseData.tankId) {
            // Update specific tank
            updatedTanks = state.tanks.map((tank) => {
              if (tank.id === purchaseData.tankId) {
                return {
                  ...tank,
                  currentStock: tank.currentStock + (purchaseData.quantityKL * 1000),
                };
              }
              return tank;
            });
          } else {
            // Legacy: update by fuel type (first tank of that type)
            const targetTank = state.tanks.find((t) => t.fuelType === purchaseData.fuelType);
            if (targetTank) {
              updatedTanks = state.tanks.map((tank) => {
                if (tank.id === targetTank.id) {
                  return {
                    ...tank,
                    currentStock: tank.currentStock + (purchaseData.quantityKL * 1000),
                  };
                }
                return tank;
              });
            }
          }

          return {
            purchases: [...state.purchases, newPurchase],
            tanks: updatedTanks,
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
        const { tanks } = get();
        // Sum stock from all tanks of this fuel type
        return tanks
          .filter((t) => t.fuelType === fuelType)
          .reduce((sum, t) => sum + t.currentStock, 0);
      },

      getTankStock: (tankId) => {
        const { tanks } = get();
        const tank = tanks.find((t) => t.id === tankId);
        return tank?.currentStock || 0;
      },

      getAllNozzles: () => {
        const { machines } = get();
        const allNozzles: Array<MachineNozzle & { machineId: string; machineName: string }> = [];
        
        machines.forEach((machine) => {
          machine.nozzles.forEach((nozzle) => {
            allNozzles.push({
              ...nozzle,
              machineId: machine.id,
              machineName: machine.name,
            });
          });
        });
        
        return allNozzles;
      },

      // Staff Management
      addStaff: (name) => {
        const newStaff: Staff = {
          id: generateId(),
          name,
          isActive: true,
          createdAt: new Date().toISOString(),
        };
        set((state) => ({
          staff: [...state.staff, newStaff],
        }));
      },

      updateStaff: (id, data) => {
        set((state) => ({
          staff: state.staff.map((s) => (s.id === id ? { ...s, ...data } : s)),
        }));
      },

      deleteStaff: (id) => {
        set((state) => ({
          staff: state.staff.map((s) => (s.id === id ? { ...s, isActive: false } : s)),
        }));
      },

      // Shift Entry Management
      addShiftEntry: (entryData) => {
        const newEntry: ShiftEntry = {
          ...entryData,
          id: generateId(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        
        // Update tank stocks based on shift sales
        set((state) => {
          const salesByTank: Record<string, number> = {};
          
          newEntry.nozzleReadings.forEach((reading) => {
            if (reading.tankId) {
              salesByTank[reading.tankId] = (salesByTank[reading.tankId] || 0) + reading.liters;
            }
          });
          
          const updatedTanks = state.tanks.map((tank) => {
            const soldLiters = salesByTank[tank.id] || 0;
            return {
              ...tank,
              currentStock: Math.max(0, tank.currentStock - soldLiters),
            };
          });
          
          return {
            shiftEntries: [...state.shiftEntries, newEntry],
            tanks: updatedTanks,
          };
        });
      },

      updateShiftEntry: (id, data) => {
        set((state) => ({
          shiftEntries: state.shiftEntries.map((e) =>
            e.id === id ? { ...e, ...data, updatedAt: new Date().toISOString() } : e
          ),
        }));
      },

      deleteShiftEntry: (id) => {
        set((state) => ({
          shiftEntries: state.shiftEntries.filter((e) => e.id !== id),
        }));
      },

      getLastShiftClosingReadings: (beforeDate) => {
        const { shiftEntries, initialNozzleReadings } = get();
        if (shiftEntries.length === 0) return initialNozzleReadings;

        let filteredEntries = [...shiftEntries];
        if (beforeDate) {
          filteredEntries = shiftEntries.filter(
            (e) => new Date(e.businessDate) < new Date(beforeDate)
          );
        }
        
        if (filteredEntries.length === 0) return initialNozzleReadings;

        // Sort by date and createdAt to get the latest
        const sortedEntries = filteredEntries.sort((a, b) => {
          const dateCompare = new Date(b.businessDate).getTime() - new Date(a.businessDate).getTime();
          if (dateCompare !== 0) return dateCompare;
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
        
        // Collect latest closing readings from all entries
        const readings: Record<string, number> = { ...initialNozzleReadings };
        
        // Go through entries to find the latest reading for each nozzle
        sortedEntries.forEach((entry) => {
          entry.nozzleReadings.forEach((nr) => {
            if (readings[nr.nozzleId] === undefined || readings[nr.nozzleId] === 0) {
              readings[nr.nozzleId] = nr.closingReading;
            }
          });
        });
        
        // For nozzles used in the most recent entry, use those closing readings
        if (sortedEntries.length > 0) {
          sortedEntries[0].nozzleReadings.forEach((nr) => {
            readings[nr.nozzleId] = nr.closingReading;
          });
        }

        return readings;
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
