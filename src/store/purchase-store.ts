import { create } from 'zustand';
// Removed persist middleware - all data now syncs with cloud
import { 
  UndergroundTank, 
  PurchaseEntry, 
  TruckChamber,
  DensityCheck,
  StockVerification
} from '@/types/purchase';
import { FuelType } from '@/types/petrol-pump';

const generateId = () => Math.random().toString(36).substring(2, 15);

// Tank-Nozzle connection
export interface TankNozzleConnection {
  nozzleId: string;
  tankId: string;
}

// Registered nozzle (user-created)
export interface RegisteredNozzle {
  id: string;
  label: string;
  fuelType: FuelType;
  createdAt: string;
}

interface PurchaseState {
  tanks: UndergroundTank[];
  purchases: PurchaseEntry[];
  lastChamberCapacity: number;
  tankNozzleConnections: TankNozzleConnection[];
  lastPrices: { MS: number; HSD: number; POWER: number };
  registeredNozzles: RegisteredNozzle[];
  
  // Tank actions
  initializeTanks: () => void;
  addTank: (tank: Omit<UndergroundTank, 'id' | 'createdAt' | 'updatedAt'>) => UndergroundTank;
  updateTank: (id: string, data: Partial<UndergroundTank>) => void;
  deleteTank: (id: string) => void;
  updateTankStock: (id: string, newStock: number) => void;
  getTanksByFuelType: (fuelType: FuelType) => UndergroundTank[];
  
  // Nozzle registration actions
  registerNozzle: (label: string, fuelType: FuelType) => RegisteredNozzle;
  unregisterNozzle: (nozzleId: string) => void;
  getRegisteredNozzles: () => RegisteredNozzle[];
  
  // Tank-Nozzle connection actions
  connectNozzleToTank: (nozzleId: string, tankId: string) => void;
  disconnectNozzle: (nozzleId: string) => void;
  disconnectAllNozzlesFromTank: (tankId: string) => void;
  getNozzlesForTank: (tankId: string) => string[];
  getTankForNozzle: (nozzleId: string) => string | null;
  deductFromTankByNozzle: (nozzleId: string, liters: number) => { isNegative: boolean } | null;
  addToTankByNozzle: (nozzleId: string, liters: number) => void;
  
  // Purchase actions
  savePurchase: (purchase: Omit<PurchaseEntry, 'id' | 'createdAt' | 'updatedAt'>) => PurchaseEntry;
  updatePurchase: (id: string, data: Partial<PurchaseEntry>) => void;
  deletePurchase: (id: string) => void;
  reversePurchaseStock: (purchaseId: string) => void;
  getPurchases: () => PurchaseEntry[];
  getPurchaseById: (id: string) => PurchaseEntry | undefined;
  setLastChamberCapacity: (capacity: number) => void;
  getLastPrice: (fuelType: FuelType) => number;
  setLastPrice: (fuelType: FuelType, price: number) => void;
  
  // Validation
  validateTankCapacity: (tankId: string, addQty: number) => { valid: boolean; overflow: number };
  
  // Finalize unloading - updates tank stock
  finalizeUnloading: (purchaseId: string, stockVerifications: StockVerification[]) => void;
  
  // Clear all data
  clearAllData: () => void;
}

export const usePurchaseStore = create<PurchaseState>()((set, get) => ({
      tanks: [],
      purchases: [],
      lastChamberCapacity: 3000,
      tankNozzleConnections: [],
      lastPrices: { MS: 0, HSD: 0, POWER: 0 },
      registeredNozzles: [],

      // initializeTanks is now a no-op - new accounts start blank
      initializeTanks: () => {
        // Do nothing - new accounts should have 0 tanks and go through Setup Wizard
      },

      // Register a new nozzle (user-created)
      registerNozzle: (label: string, fuelType: FuelType) => {
        const now = new Date().toISOString();
        const nozzleId = `nozzle-${fuelType}-${label.trim().replace(/\s+/g, '-')}`;
        const newNozzle: RegisteredNozzle = {
          id: nozzleId,
          label: label.trim(),
          fuelType,
          createdAt: now,
        };
        set((state) => ({
          registeredNozzles: [...state.registeredNozzles, newNozzle],
        }));
        return newNozzle;
      },

      unregisterNozzle: (nozzleId: string) => {
        // Also disconnect from any tank
        get().disconnectNozzle(nozzleId);
        set((state) => ({
          registeredNozzles: state.registeredNozzles.filter((n) => n.id !== nozzleId),
        }));
      },

      getRegisteredNozzles: () => {
        return get().registeredNozzles;
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
        // Disconnect all nozzles from this tank first
        get().disconnectAllNozzlesFromTank(id);
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

      disconnectAllNozzlesFromTank: (tankId) => {
        set((state) => ({
          tankNozzleConnections: state.tankNozzleConnections.filter(
            (c) => c.tankId !== tankId
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
        if (!tankId) return null;
        
        const tank = get().tanks.find(t => t.id === tankId);
        const newStock = (tank?.currentStock || 0) - liters;
        const isNegative = newStock < 0;
        
        set((state) => ({
          tanks: state.tanks.map((t) =>
            t.id === tankId
              ? { 
                  ...t, 
                  currentStock: newStock, // Allow negative for warning purposes
                  updatedAt: new Date().toISOString() 
                }
              : t
          ),
        }));
        
        return { isNegative };
      },

      addToTankByNozzle: (nozzleId, liters) => {
        const tankId = get().getTankForNozzle(nozzleId);
        if (!tankId) return;
        
        set((state) => ({
          tanks: state.tanks.map((t) =>
            t.id === tankId
              ? { 
                  ...t, 
                  currentStock: t.currentStock + liters, 
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
        // First reverse the stock before deleting
        get().reversePurchaseStock(id);
        set((state) => ({
          purchases: state.purchases.filter((p) => p.id !== id),
        }));
      },

      reversePurchaseStock: (purchaseId) => {
        const { tanks, purchases } = get();
        const purchase = purchases.find(p => p.id === purchaseId);
        if (!purchase || purchase.status !== 'completed') return;
        
        // Reverse each tank's stock based on stockVerifications
        const updatedTanks = tanks.map((tank) => {
          const verification = purchase.stockVerifications?.find((v) => v.tankId === tank.id);
          if (verification) {
            // Subtract the received quantity to reverse the purchase
            return {
              ...tank,
              currentStock: Math.max(0, tank.currentStock - verification.receivedQty),
              updatedAt: new Date().toISOString(),
            };
          }
          return tank;
        });
        
        set({ tanks: updatedTanks });
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

      getLastPrice: (fuelType) => {
        return get().lastPrices[fuelType];
      },

      setLastPrice: (fuelType, price) => {
        set((state) => ({
          lastPrices: { ...state.lastPrices, [fuelType]: price },
        }));
      },

      validateTankCapacity: (tankId, addQty) => {
        const tank = get().tanks.find(t => t.id === tankId);
        if (!tank) return { valid: false, overflow: addQty };
        
        const newTotal = tank.currentStock + addQty;
        const overflow = newTotal - tank.capacity;
        
        return {
          valid: overflow <= 0,
          overflow: Math.max(0, overflow),
        };
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

      clearAllData: () => {
        set({
          tanks: [],
          purchases: [],
          lastChamberCapacity: 3000,
          tankNozzleConnections: [],
          lastPrices: { MS: 0, HSD: 0, POWER: 0 },
      registeredNozzles: [],
    });
  },
}));
