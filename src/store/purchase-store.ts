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

interface PurchaseState {
  tanks: UndergroundTank[];
  purchases: PurchaseEntry[];
  lastChamberCapacity: number; // Remember last used chamber capacity
  
  // Tank actions
  initializeTanks: () => void;
  addTank: (tank: Omit<UndergroundTank, 'id' | 'createdAt' | 'updatedAt'>) => UndergroundTank;
  updateTank: (id: string, data: Partial<UndergroundTank>) => void;
  deleteTank: (id: string) => void;
  updateTankStock: (id: string, newStock: number) => void;
  getTanksByFuelType: (fuelType: FuelType) => UndergroundTank[];
  
  // Purchase actions
  savePurchase: (purchase: Omit<PurchaseEntry, 'id' | 'createdAt' | 'updatedAt'>) => PurchaseEntry;
  updatePurchase: (id: string, data: Partial<PurchaseEntry>) => void;
  deletePurchase: (id: string) => void;
  getPurchases: () => PurchaseEntry[];
  setLastChamberCapacity: (capacity: number) => void;
  
  // Finalize unloading - updates tank stock
  finalizeUnloading: (purchaseId: string, stockVerifications: StockVerification[]) => void;
}

export const usePurchaseStore = create<PurchaseState>()(
  persist(
    (set, get) => ({
      tanks: [],
      purchases: [],
      lastChamberCapacity: 3000, // Default 3000L


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
