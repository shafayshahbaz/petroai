/**
 * Cloud-Aware Data Context
 * Provides data from Supabase Cloud with the same interface as old Zustand stores
 * This replaces localStorage-based storage with real-time cloud sync
 */

import React, { createContext, useContext, ReactNode, useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { 
  useTanks, useCreateTank, useUpdateTank, useDeleteTank,
  useNozzles, useCreateNozzle, useUpdateNozzle, useDeleteNozzle, useConnectNozzleToTank, useDisconnectNozzle,
  useDebtors, useCreateDebtor, useUpdateDebtor, useDeleteDebtor,
  usePurchases, useCreatePurchase, useUpdatePurchase, useDeletePurchase,
  useDailyEntries, useCreateDailyEntry, useUpdateDailyEntry, useDeleteDailyEntry,
  useClientSettings, useUpsertClientSettings,
} from '@/hooks/useCloudData';
import { DbTank, DbNozzle, DbDebtor, DbPurchase, DbDailyEntry } from '@/services/cloud-database';
import { FuelType } from '@/types/petrol-pump';
import { UndergroundTank } from '@/types/purchase';

// ==================== TYPES ====================

interface CloudDataContextType {
  // Tanks
  tanks: UndergroundTank[];
  tanksLoading: boolean;
  addTank: (tank: { name: string; fuelType: FuelType; capacity: number; currentStock: number }) => Promise<void>;
  updateTank: (id: string, data: Partial<UndergroundTank>) => Promise<void>;
  deleteTank: (id: string) => Promise<void>;
  updateTankStock: (id: string, newStock: number) => Promise<void>;
  getTanksByFuelType: (fuelType: FuelType) => UndergroundTank[];
  
  // Nozzles
  nozzles: DbNozzle[];
  nozzlesLoading: boolean;
  registerNozzle: (label: string, fuelType: FuelType) => Promise<DbNozzle>;
  unregisterNozzle: (nozzleId: string) => Promise<void>;
  getRegisteredNozzles: () => DbNozzle[];
  connectNozzleToTank: (nozzleId: string, tankId: string) => Promise<void>;
  disconnectNozzle: (nozzleId: string) => Promise<void>;
  getNozzlesForTank: (tankId: string) => string[];
  getTankForNozzle: (nozzleId: string) => string | null;
  getConnectedNozzles: () => DbNozzle[];
  
  // Debtors
  debtors: DbDebtor[];
  debtorsLoading: boolean;
  addDebtor: (name: string, contactNumber?: string, openingBalance?: number) => Promise<DbDebtor>;
  updateDebtor: (id: string, data: Partial<DbDebtor>) => Promise<void>;
  deleteDebtor: (id: string) => Promise<void>;
  
  // Purchases
  purchases: DbPurchase[];
  purchasesLoading: boolean;
  savePurchase: (purchase: any) => Promise<DbPurchase>;
  updatePurchase: (id: string, data: Partial<DbPurchase>) => Promise<void>;
  deletePurchase: (id: string) => Promise<void>;
  getPurchaseById: (id: string) => DbPurchase | undefined;
  
  // Daily Entries
  entries: DbDailyEntry[];
  entriesLoading: boolean;
  saveDailyEntry: (entry: any) => Promise<DbDailyEntry>;
  updateDailyEntry: (id: string, data: Partial<DbDailyEntry>) => Promise<void>;
  deleteDailyEntry: (id: string) => Promise<void>;
  
  // Settings
  lastPrices: { MS: number; HSD: number; POWER: number };
  lastChamberCapacity: number;
  setLastPrice: (fuelType: FuelType, price: number) => Promise<void>;
  setLastChamberCapacity: (capacity: number) => Promise<void>;
  
  // Tank stock operations
  deductFromTankByNozzle: (nozzleId: string, liters: number) => Promise<{ isNegative: boolean } | null>;
  addToTankByNozzle: (nozzleId: string, liters: number) => Promise<void>;
}

const CloudDataContext = createContext<CloudDataContextType | undefined>(undefined);

// ==================== PROVIDER ====================

export function CloudDataProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  
  // Queries
  const { data: tanksData = [], isLoading: tanksLoading } = useTanks();
  const { data: nozzlesData = [], isLoading: nozzlesLoading } = useNozzles();
  const { data: debtorsData = [], isLoading: debtorsLoading } = useDebtors();
  const { data: purchasesData = [], isLoading: purchasesLoading } = usePurchases();
  const { data: entriesData = [], isLoading: entriesLoading } = useDailyEntries();
  const { data: clientSettings } = useClientSettings();
  
  // Mutations
  const createTankMutation = useCreateTank();
  const updateTankMutation = useUpdateTank();
  const deleteTankMutation = useDeleteTank();
  const createNozzleMutation = useCreateNozzle();
  const updateNozzleMutation = useUpdateNozzle();
  const deleteNozzleMutation = useDeleteNozzle();
  const connectNozzleMutation = useConnectNozzleToTank();
  const disconnectNozzleMutation = useDisconnectNozzle();
  const createDebtorMutation = useCreateDebtor();
  const updateDebtorMutation = useUpdateDebtor();
  const deleteDebtorMutation = useDeleteDebtor();
  const createPurchaseMutation = useCreatePurchase();
  const updatePurchaseMutation = useUpdatePurchase();
  const deletePurchaseMutation = useDeletePurchase();
  const createDailyEntryMutation = useCreateDailyEntry();
  const updateDailyEntryMutation = useUpdateDailyEntry();
  const deleteDailyEntryMutation = useDeleteDailyEntry();
  const upsertSettingsMutation = useUpsertClientSettings();
  
  // Convert DB tanks to UndergroundTank format
  const tanks: UndergroundTank[] = useMemo(() => 
    tanksData.map((t) => ({
      id: t.id,
      name: t.name,
      fuelType: t.fuel_type as FuelType,
      capacity: Number(t.capacity),
      currentStock: Number(t.current_stock),
      createdAt: t.created_at,
      updatedAt: t.updated_at,
    })),
    [tanksData]
  );
  
  // ==================== TANK OPERATIONS ====================
  
  const addTank = useCallback(async (tank: { name: string; fuelType: FuelType; capacity: number; currentStock: number }) => {
    await createTankMutation.mutateAsync({
      name: tank.name,
      fuel_type: tank.fuelType,
      capacity: tank.capacity,
      current_stock: tank.currentStock,
    });
  }, [createTankMutation]);
  
  const updateTank = useCallback(async (id: string, data: Partial<UndergroundTank>) => {
    const updates: any = {};
    if (data.name !== undefined) updates.name = data.name;
    if (data.capacity !== undefined) updates.capacity = data.capacity;
    if (data.currentStock !== undefined) updates.current_stock = data.currentStock;
    await updateTankMutation.mutateAsync({ id, updates });
  }, [updateTankMutation]);
  
  const deleteTank = useCallback(async (id: string) => {
    await deleteTankMutation.mutateAsync(id);
  }, [deleteTankMutation]);
  
  const updateTankStock = useCallback(async (id: string, newStock: number) => {
    await updateTankMutation.mutateAsync({ id, updates: { current_stock: newStock } });
  }, [updateTankMutation]);
  
  const getTanksByFuelType = useCallback((fuelType: FuelType) => {
    return tanks.filter((t) => t.fuelType === fuelType);
  }, [tanks]);
  
  // ==================== NOZZLE OPERATIONS ====================
  
  const registerNozzle = useCallback(async (label: string, fuelType: FuelType) => {
    return await createNozzleMutation.mutateAsync({ label, fuel_type: fuelType });
  }, [createNozzleMutation]);
  
  const unregisterNozzle = useCallback(async (nozzleId: string) => {
    await deleteNozzleMutation.mutateAsync(nozzleId);
  }, [deleteNozzleMutation]);
  
  const getRegisteredNozzles = useCallback(() => {
    return nozzlesData;
  }, [nozzlesData]);
  
  const connectNozzleToTank = useCallback(async (nozzleId: string, tankId: string) => {
    await connectNozzleMutation.mutateAsync({ nozzleId, tankId });
  }, [connectNozzleMutation]);
  
  const disconnectNozzle = useCallback(async (nozzleId: string) => {
    await disconnectNozzleMutation.mutateAsync(nozzleId);
  }, [disconnectNozzleMutation]);
  
  const getNozzlesForTank = useCallback((tankId: string) => {
    return nozzlesData
      .filter((n) => n.tank_id === tankId)
      .map((n) => n.id);
  }, [nozzlesData]);
  
  const getTankForNozzle = useCallback((nozzleId: string) => {
    const nozzle = nozzlesData.find((n) => n.id === nozzleId);
    return nozzle?.tank_id || null;
  }, [nozzlesData]);
  
  const getConnectedNozzles = useCallback(() => {
    return nozzlesData.filter((n) => n.tank_id !== null);
  }, [nozzlesData]);
  
  // ==================== DEBTOR OPERATIONS ====================
  
  const addDebtor = useCallback(async (name: string, contactNumber?: string, openingBalance?: number) => {
    return await createDebtorMutation.mutateAsync({
      name,
      contact_number: contactNumber,
      opening_balance: openingBalance,
    });
  }, [createDebtorMutation]);
  
  const updateDebtor = useCallback(async (id: string, data: Partial<DbDebtor>) => {
    await updateDebtorMutation.mutateAsync({ id, updates: data });
  }, [updateDebtorMutation]);
  
  const deleteDebtor = useCallback(async (id: string) => {
    await deleteDebtorMutation.mutateAsync(id);
  }, [deleteDebtorMutation]);
  
  // ==================== PURCHASE OPERATIONS ====================
  
  const savePurchase = useCallback(async (purchase: any) => {
    return await createPurchaseMutation.mutateAsync({
      invoice_number: purchase.invoiceNumber,
      invoice_date: purchase.invoiceDate,
      supplier_name: purchase.supplierName,
      total_invoice_value: purchase.totalInvoiceValue,
      chambers: purchase.chambers,
      density_check: purchase.densityCheck,
      stock_verifications: purchase.stockVerifications || [],
      status: purchase.status || 'draft',
    });
  }, [createPurchaseMutation]);
  
  const updatePurchase = useCallback(async (id: string, data: Partial<DbPurchase>) => {
    await updatePurchaseMutation.mutateAsync({ id, updates: data });
  }, [updatePurchaseMutation]);
  
  const deletePurchase = useCallback(async (id: string) => {
    await deletePurchaseMutation.mutateAsync(id);
  }, [deletePurchaseMutation]);
  
  const getPurchaseById = useCallback((id: string) => {
    return purchasesData.find((p) => p.id === id);
  }, [purchasesData]);
  
  // ==================== DAILY ENTRY OPERATIONS ====================
  
  const saveDailyEntry = useCallback(async (entry: any) => {
    return await createDailyEntryMutation.mutateAsync({
      date: entry.date,
      shift_name: entry.shiftName,
      fuel_rates: entry.fuelRates,
      nozzles: entry.nozzles,
      lube_items: entry.lubeItems,
      expenses: entry.expenses,
      incomes: entry.incomes,
      credit_sales: entry.creditSales,
      upi_collection: entry.upiCollection,
      cash_deposit: entry.cashDeposit,
      opening_balance: entry.openingBalance,
      testing_deduction: entry.testingDeduction,
    });
  }, [createDailyEntryMutation]);
  
  const updateDailyEntry = useCallback(async (id: string, data: Partial<DbDailyEntry>) => {
    await updateDailyEntryMutation.mutateAsync({ id, updates: data });
  }, [updateDailyEntryMutation]);
  
  const deleteDailyEntry = useCallback(async (id: string) => {
    await deleteDailyEntryMutation.mutateAsync(id);
  }, [deleteDailyEntryMutation]);
  
  // ==================== SETTINGS ====================
  
  const lastPrices = clientSettings?.last_prices || { MS: 0, HSD: 0, POWER: 0 };
  const lastChamberCapacity = clientSettings?.last_chamber_capacity || 3000;
  
  const setLastPrice = useCallback(async (fuelType: FuelType, price: number) => {
    const newPrices = { ...lastPrices, [fuelType]: price };
    await upsertSettingsMutation.mutateAsync({ last_prices: newPrices });
  }, [lastPrices, upsertSettingsMutation]);
  
  const setLastChamberCapacity = useCallback(async (capacity: number) => {
    await upsertSettingsMutation.mutateAsync({ last_chamber_capacity: capacity });
  }, [upsertSettingsMutation]);
  
  // ==================== TANK STOCK BY NOZZLE ====================
  
  const deductFromTankByNozzle = useCallback(async (nozzleId: string, liters: number) => {
    const tankId = getTankForNozzle(nozzleId);
    if (!tankId) return null;
    
    const tank = tanks.find((t) => t.id === tankId);
    if (!tank) return null;
    
    const newStock = tank.currentStock - liters;
    const isNegative = newStock < 0;
    
    await updateTankStock(tankId, newStock);
    return { isNegative };
  }, [getTankForNozzle, tanks, updateTankStock]);
  
  const addToTankByNozzle = useCallback(async (nozzleId: string, liters: number) => {
    const tankId = getTankForNozzle(nozzleId);
    if (!tankId) return;
    
    const tank = tanks.find((t) => t.id === tankId);
    if (!tank) return;
    
    await updateTankStock(tankId, tank.currentStock + liters);
  }, [getTankForNozzle, tanks, updateTankStock]);
  
  // ==================== CONTEXT VALUE ====================
  
  const value: CloudDataContextType = {
    tanks,
    tanksLoading,
    addTank,
    updateTank,
    deleteTank,
    updateTankStock,
    getTanksByFuelType,
    
    nozzles: nozzlesData,
    nozzlesLoading,
    registerNozzle,
    unregisterNozzle,
    getRegisteredNozzles,
    connectNozzleToTank,
    disconnectNozzle,
    getNozzlesForTank,
    getTankForNozzle,
    getConnectedNozzles,
    
    debtors: debtorsData,
    debtorsLoading,
    addDebtor,
    updateDebtor,
    deleteDebtor,
    
    purchases: purchasesData,
    purchasesLoading,
    savePurchase,
    updatePurchase,
    deletePurchase,
    getPurchaseById,
    
    entries: entriesData,
    entriesLoading,
    saveDailyEntry,
    updateDailyEntry,
    deleteDailyEntry,
    
    lastPrices,
    lastChamberCapacity,
    setLastPrice,
    setLastChamberCapacity,
    
    deductFromTankByNozzle,
    addToTankByNozzle,
  };
  
  return (
    <CloudDataContext.Provider value={value}>
      {children}
    </CloudDataContext.Provider>
  );
}

// ==================== HOOK ====================

export function useCloudData() {
  const context = useContext(CloudDataContext);
  if (context === undefined) {
    throw new Error('useCloudData must be used within a CloudDataProvider');
  }
  return context;
}
