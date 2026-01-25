import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { 
  UndergroundTank, 
  PurchaseEntry, 
  TruckChamber,
  DensityCheck,
  StockVerification,
  DEFAULT_TANKS 
} from '@/types/purchase';
import { FuelType } from '@/types/petrol-pump';

const generateId = () => Math.random().toString(36).substring(2, 15);

// Tank-Nozzle connection
export interface TankNozzleConnection {
  nozzleId: string;
  tankId: string;
}

interface PurchaseState {
  tanks: UndergroundTank[];
  purchases: PurchaseEntry[];
  lastChamberCapacity: number;
  tankNozzleConnections: TankNozzleConnection[];
  
  // Tank actions
  initializeTanks: () => void;
  addTank: (tank: Omit<UndergroundTank, 'id' | 'createdAt' | 'updatedAt'>) => UndergroundTank;
  updateTank: (id: string, data: Partial<UndergroundTank>) => void;
  deleteTank: (id: string) => void;
  updateTankStock: (id: string, newStock: number) => void;
  getTanksByFuelType: (fuelType: FuelType) => UndergroundTank[];
  
  // Tank-Nozzle connection actions
  connectNozzleToTank: (nozzleId: string, tankId: string) => void;
  disconnectNozzle: (nozzleId: string) => void;
  getNozzlesForTank: (tankId: string) => string[];
  getTankForNozzle: (nozzleId: string) => string | null;
  deductFromTankByNozzle: (nozzleId: string, liters: number) => void;
  
  // Purchase actions
  savePurchase: (purchase: Omit<PurchaseEntry, 'id' | 'createdAt' | 'updatedAt'>) => PurchaseEntry;
  updatePurchase: (id: string, data: Partial<PurchaseEntry>) => void;
  deletePurchase: (id: string) => void;
  getPurchases: () => PurchaseEntry[];
  getPurchaseById: (id: string) => PurchaseEntry | undefined;
  setLastChamberCapacity: (capacity: number) => void;
  
  // Finalize unloading - updates tank stock
  finalizeUnloading: (purchaseId: string, stockVerifications: StockVerification[]) => void;
}

export const usePurchaseStore = create<PurchaseState>()(
  persist(
    (set, get) => ({
      tanks: [],
      purchases: [],
      lastChamberCapacity: 3000,
      tankNozzleConnections: [],

      initializeTanks: () => {
        const { tanks } = get();
        if (tanks.length === 0) {
          const now = new Date().toISOString();
          const initialTanks: UndergroundTank[] = DEFAULT_TANKS.map((tank) => ({
            ...tank,
            id: generateId(),
            createdAt: now,
            updatedAt: now,
          }));
          set({ tanks: initialTanks });
        }
      },

      addTank: (tankData) => {
        const now = new Date().toISOString();
        const newTank: UndergroundTank = {
          ...tankData,
          id: generateId(),
          createdAt: now,
          updatedAt: now,
        };
        set((state) => ({
          tanks: [...state.tanks, newTank],
        }));
        return newTank;
      },

      updateTank: (id, data) => {
        set((state) => ({
          tanks: state.tanks.map((t) =>
            t.id === id ? { ...t, ...data, updatedAt: new Date().toISOString() } : t
          ),
        }));
      },

      deleteTank: (id) => {
        set((state) => ({
          tanks: state.tanks.filter((t) => t.id !== id),
        }));
      },

      updateTankStock: (id, newStock) => {
        set((state) => ({
          tanks: state.tanks.map((t) =>
            t.id === id 
              ? { ...t, currentStock: newStock, updatedAt: new Date().toISOString() } 
              : t
          ),
        }));
      },

      getTanksByFuelType: (fuelType) => {
        return get().tanks.filter((t) => t.fuelType === fuelType);
      },

      // Tank-Nozzle connection actions
      connectNozzleToTank: (nozzleId, tankId) => {
        set((state) => {
          // Remove existing connection for this nozzle
          const filteredConnections = state.tankNozzleConnections.filter(
            (c) => c.nozzleId !== nozzleId
          );
          return {
            tankNozzleConnections: [...filteredConnections, { nozzleId, tankId }],
          };
        });
      },

      disconnectNozzle: (nozzleId) => {
        set((state) => ({
          tankNozzleConnections: state.tankNozzleConnections.filter(
            (c) => c.nozzleId !== nozzleId
          ),
        }));
      },

      getNozzlesForTank: (tankId) => {
        return get().tankNozzleConnections
          .filter((c) => c.tankId === tankId)
          .map((c) => c.nozzleId);
      },

      getTankForNozzle: (nozzleId) => {
        const connection = get().tankNozzleConnections.find(
          (c) => c.nozzleId === nozzleId
        );
        return connection?.tankId || null;
      },

      deductFromTankByNozzle: (nozzleId, liters) => {
        const tankId = get().getTankForNozzle(nozzleId);
        if (!tankId) return;
        
        set((state) => ({
          tanks: state.tanks.map((t) =>
            t.id === tankId
              ? { 
                  ...t, 
                  currentStock: Math.max(0, t.currentStock - liters), 
                  updatedAt: new Date().toISOString() 
                }
              : t
          ),
        }));
      },

      savePurchase: (purchaseData) => {
        const now = new Date().toISOString();
        const newPurchase: PurchaseEntry = {
          ...purchaseData,
          id: generateId(),
          createdAt: now,
          updatedAt: now,
        };
        set((state) => ({
          purchases: [...state.purchases, newPurchase],
        }));
        return newPurchase;
      },

      updatePurchase: (id, data) => {
        set((state) => ({
          purchases: state.purchases.map((p) =>
            p.id === id ? { ...p, ...data, updatedAt: new Date().toISOString() } : p
          ),
        }));
      },

      deletePurchase: (id) => {
        set((state) => ({
          purchases: state.purchases.filter((p) => p.id !== id),
        }));
      },

      getPurchases: () => {
        return get().purchases;
      },

      getPurchaseById: (id) => {
        return get().purchases.find((p) => p.id === id);
      },

      setLastChamberCapacity: (capacity: number) => {
        set({ lastChamberCapacity: capacity });
      },


      finalizeUnloading: (purchaseId, stockVerifications) => {
        const { tanks, purchases } = get();
        
        // Update tank stocks based on post-unload values
        const updatedTanks = tanks.map((tank) => {
          const verification = stockVerifications.find((v) => v.tankId === tank.id);
          if (verification) {
            return {
              ...tank,
              currentStock: verification.postUnloadStock,
              updatedAt: new Date().toISOString(),
            };
          }
          return tank;
        });

        // Mark purchase as completed
        const updatedPurchases = purchases.map((p) =>
          p.id === purchaseId
            ? { ...p, status: 'completed' as const, stockVerifications, updatedAt: new Date().toISOString() }
            : p
        );

        set({
          tanks: updatedTanks,
          purchases: updatedPurchases,
        });
      },
    }),
    {
      name: 'purchase-storage',
    }
  )
);
