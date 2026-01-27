/**
 * Cloud Data Hooks
 * React hooks for fetching and managing cloud data
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import * as cloudDb from '@/services/cloud-database';
import { FuelType } from '@/types/petrol-pump';
import { StockVerification } from '@/types/purchase';

// ==================== TANKS ====================

export function useTanks() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const query = useQuery({
    queryKey: ['tanks'],
    queryFn: cloudDb.fetchTanks,
    enabled: !!user,
  });
  
  // Subscribe to realtime updates
  useEffect(() => {
    if (!user) return;
    
    const unsubscribe = cloudDb.subscribeToTanks((tanks) => {
      queryClient.setQueryData(['tanks'], tanks);
    });
    
    return unsubscribe;
  }, [user, queryClient]);
  
  return query;
}

export function useCreateTank() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (tank: { name: string; fuel_type: FuelType; capacity: number; current_stock: number }) => 
      cloudDb.createTank(tank),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tanks'] });
    },
  });
}

export function useUpdateTank() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<cloudDb.DbTank> }) => 
      cloudDb.updateTank(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tanks'] });
    },
  });
}

export function useDeleteTank() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => cloudDb.deleteTank(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tanks'] });
      queryClient.invalidateQueries({ queryKey: ['nozzles'] }); // Nozzles may be disconnected
    },
  });
}

// ==================== NOZZLES ====================

export function useNozzles() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const query = useQuery({
    queryKey: ['nozzles'],
    queryFn: cloudDb.fetchNozzles,
    enabled: !!user,
  });
  
  // Subscribe to realtime updates
  useEffect(() => {
    if (!user) return;
    
    const unsubscribe = cloudDb.subscribeToNozzles((nozzles) => {
      queryClient.setQueryData(['nozzles'], nozzles);
    });
    
    return unsubscribe;
  }, [user, queryClient]);
  
  return query;
}

export function useCreateNozzle() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (nozzle: { label: string; fuel_type: FuelType }) => 
      cloudDb.createNozzle(nozzle),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nozzles'] });
    },
  });
}

export function useUpdateNozzle() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<cloudDb.DbNozzle> }) => 
      cloudDb.updateNozzle(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nozzles'] });
    },
  });
}

export function useDeleteNozzle() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => cloudDb.deleteNozzle(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nozzles'] });
    },
  });
}

export function useConnectNozzleToTank() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ nozzleId, tankId }: { nozzleId: string; tankId: string }) => 
      cloudDb.connectNozzleToTank(nozzleId, tankId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nozzles'] });
    },
  });
}

export function useDisconnectNozzle() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (nozzleId: string) => cloudDb.disconnectNozzle(nozzleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nozzles'] });
    },
  });
}

// ==================== DEBTORS ====================

export function useDebtors() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const query = useQuery({
    queryKey: ['debtors'],
    queryFn: cloudDb.fetchDebtors,
    enabled: !!user,
  });
  
  // Subscribe to realtime updates
  useEffect(() => {
    if (!user) return;
    
    const unsubscribe = cloudDb.subscribeToDebtors((debtors) => {
      queryClient.setQueryData(['debtors'], debtors);
    });
    
    return unsubscribe;
  }, [user, queryClient]);
  
  return query;
}

export function useCreateDebtor() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (debtor: { name: string; contact_number?: string; opening_balance?: number }) => 
      cloudDb.createDebtor(debtor),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['debtors'] });
    },
  });
}

export function useUpdateDebtor() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<cloudDb.DbDebtor> }) => 
      cloudDb.updateDebtor(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['debtors'] });
    },
  });
}

export function useDeleteDebtor() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => cloudDb.deleteDebtor(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['debtors'] });
    },
  });
}

// ==================== PURCHASES ====================

export function usePurchases() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const query = useQuery({
    queryKey: ['purchases'],
    queryFn: cloudDb.fetchPurchases,
    enabled: !!user,
  });
  
  // Subscribe to realtime updates
  useEffect(() => {
    if (!user) return;
    
    const unsubscribe = cloudDb.subscribeToPurchases((purchases) => {
      queryClient.setQueryData(['purchases'], purchases);
    });
    
    return unsubscribe;
  }, [user, queryClient]);
  
  return query;
}

export function useCreatePurchase() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (purchase: Omit<cloudDb.DbPurchase, 'id' | 'client_id' | 'created_at' | 'updated_at'>) => 
      cloudDb.createPurchase(purchase),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
    },
  });
}

export function useUpdatePurchase() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<cloudDb.DbPurchase> }) => 
      cloudDb.updatePurchase(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
    },
  });
}

export function useDeletePurchase() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => cloudDb.deletePurchase(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
      queryClient.invalidateQueries({ queryKey: ['tanks'] }); // Stock may change
    },
  });
}

// ==================== DAILY ENTRIES ====================

export function useDailyEntries() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const query = useQuery({
    queryKey: ['daily_entries'],
    queryFn: cloudDb.fetchDailyEntries,
    enabled: !!user,
  });
  
  // Subscribe to realtime updates
  useEffect(() => {
    if (!user) return;
    
    const unsubscribe = cloudDb.subscribeToDailyEntries((entries) => {
      queryClient.setQueryData(['daily_entries'], entries);
    });
    
    return unsubscribe;
  }, [user, queryClient]);
  
  return query;
}

export function useCreateDailyEntry() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (entry: Omit<cloudDb.DbDailyEntry, 'id' | 'client_id' | 'created_at' | 'updated_at'>) => 
      cloudDb.createDailyEntry(entry),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily_entries'] });
    },
  });
}

export function useUpdateDailyEntry() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<cloudDb.DbDailyEntry> }) => 
      cloudDb.updateDailyEntry(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily_entries'] });
    },
  });
}

export function useDeleteDailyEntry() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => cloudDb.deleteDailyEntry(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily_entries'] });
    },
  });
}

// ==================== CLIENT SETTINGS ====================

export function useClientSettings() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['client_settings'],
    queryFn: cloudDb.fetchClientSettings,
    enabled: !!user,
  });
}

export function useUpsertClientSettings() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (settings: Partial<cloudDb.DbClientSettings>) => 
      cloudDb.upsertClientSettings(settings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client_settings'] });
    },
  });
}

// ==================== CONNECTION STATUS ====================

export function useConnectionStatus() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['connection_status'],
    queryFn: cloudDb.checkDatabaseConnection,
    enabled: !!user,
    refetchInterval: 30000, // Check every 30 seconds
    staleTime: 10000,
  });
}
