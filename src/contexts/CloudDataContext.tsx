import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { FuelType } from '@/types/petrol-pump';
import { RealtimeChannel } from '@supabase/supabase-js';

// Types matching database schema
export interface CloudTank {
  id: string;
  client_id: string;
  name: string;
  fuel_type: string;
  capacity: number;
  current_stock: number;
  created_at: string;
  updated_at: string;
}

export interface CloudNozzle {
  id: string;
  client_id: string;
  label: string;
  fuel_type: string;
  tank_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface CloudPurchase {
  id: string;
  client_id: string;
  invoice_number: string;
  invoice_date: string;
  supplier_name: string;
  total_invoice_value: number;
  chambers: any[];
  density_check: any | null;
  stock_verifications: any[] | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface CloudDailyEntry {
  id: string;
  client_id: string;
  date: string;
  shift_name: string | null;
  fuel_rates: Record<string, number>;
  nozzles: any[];
  lube_items: any[];
  expenses: any[];
  incomes: any[];
  credit_sales: any[];
  upi_collection: number;
  cash_deposit: number;
  opening_balance: number;
  testing_deduction: Record<string, number>;
  created_at: string;
  updated_at: string;
}

export interface CloudDebtor {
  id: string;
  client_id: string;
  name: string;
  contact_number: string | null;
  opening_balance: number;
  total_outstanding: number;
  created_at: string;
  updated_at: string;
}

export interface CloudClientSettings {
  id: string;
  client_id: string;
  last_backup_date: string | null;
  last_chamber_capacity: number;
  last_prices: Record<string, number>;
  created_at: string;
  updated_at: string;
}

interface CloudDataContextType {
  // Data
  tanks: CloudTank[];
  nozzles: CloudNozzle[];
  purchases: CloudPurchase[];
  dailyEntries: CloudDailyEntry[];
  debtors: CloudDebtor[];
  clientSettings: CloudClientSettings | null;
  
  // Loading states
  isLoading: boolean;
  isInitialLoad: boolean;
  
  // Connection state
  isOnline: boolean;
  isSyncing: boolean;
  
  // Tank actions
  createTank: (data: Omit<CloudTank, 'id' | 'client_id' | 'created_at' | 'updated_at'>) => Promise<CloudTank | null>;
  updateTank: (id: string, data: Partial<CloudTank>) => Promise<void>;
  deleteTank: (id: string) => Promise<void>;
  
  // Nozzle actions
  createNozzle: (data: Omit<CloudNozzle, 'id' | 'client_id' | 'created_at' | 'updated_at'>) => Promise<CloudNozzle | null>;
  updateNozzle: (id: string, data: Partial<CloudNozzle>) => Promise<void>;
  deleteNozzle: (id: string) => Promise<void>;
  
  // Purchase actions
  createPurchase: (data: Omit<CloudPurchase, 'id' | 'client_id' | 'created_at' | 'updated_at'>) => Promise<CloudPurchase | null>;
  updatePurchase: (id: string, data: Partial<CloudPurchase>) => Promise<void>;
  deletePurchase: (id: string) => Promise<void>;
  
  // Daily entry actions
  createDailyEntry: (data: Omit<CloudDailyEntry, 'id' | 'client_id' | 'created_at' | 'updated_at'>) => Promise<CloudDailyEntry | null>;
  updateDailyEntry: (id: string, data: Partial<CloudDailyEntry>) => Promise<void>;
  deleteDailyEntry: (id: string) => Promise<void>;
  
  // Debtor actions
  createDebtor: (data: Omit<CloudDebtor, 'id' | 'client_id' | 'created_at' | 'updated_at'>) => Promise<CloudDebtor | null>;
  updateDebtor: (id: string, data: Partial<CloudDebtor>) => Promise<void>;
  deleteDebtor: (id: string) => Promise<void>;
  
  // Settings actions
  updateClientSettings: (data: Partial<CloudClientSettings>) => Promise<void>;
  
  // Utility
  refreshData: () => Promise<void>;
  getConnectedNozzles: () => CloudNozzle[];
  getNozzlesForTank: (tankId: string) => CloudNozzle[];
  getTankForNozzle: (nozzleId: string) => CloudTank | null;
  getLastPrice: (fuelType: FuelType) => number;
}

const CloudDataContext = createContext<CloudDataContextType | undefined>(undefined);

export function CloudDataProvider({ children }: { children: React.ReactNode }) {
  const { clientId, user, isLoading: authLoading } = useAuth();
  
  // Data state
  const [tanks, setTanks] = useState<CloudTank[]>([]);
  const [nozzles, setNozzles] = useState<CloudNozzle[]>([]);
  const [purchases, setPurchases] = useState<CloudPurchase[]>([]);
  const [dailyEntries, setDailyEntries] = useState<CloudDailyEntry[]>([]);
  const [debtors, setDebtors] = useState<CloudDebtor[]>([]);
  const [clientSettings, setClientSettings] = useState<CloudClientSettings | null>(null);
  
  // Loading states
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Connection state
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  // Channel refs
  const channelsRef = useRef<RealtimeChannel[]>([]);

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Initial data fetch
  const fetchAllData = useCallback(async () => {
    if (!clientId) return;
    
    setIsSyncing(true);
    try {
      const [
        tanksRes,
        nozzlesRes,
        purchasesRes,
        entriesRes,
        debtorsRes,
        settingsRes
      ] = await Promise.all([
        supabase.from('tanks').select('*').eq('client_id', clientId),
        supabase.from('nozzles').select('*').eq('client_id', clientId),
        supabase.from('purchases').select('*').eq('client_id', clientId).order('created_at', { ascending: false }),
        supabase.from('daily_entries').select('*').eq('client_id', clientId).order('date', { ascending: false }),
        supabase.from('debtors').select('*').eq('client_id', clientId),
        supabase.from('client_settings').select('*').eq('client_id', clientId).maybeSingle()
      ]);

      if (tanksRes.data) setTanks(tanksRes.data);
      if (nozzlesRes.data) setNozzles(nozzlesRes.data);
      if (purchasesRes.data) setPurchases(purchasesRes.data as CloudPurchase[]);
      if (entriesRes.data) setDailyEntries(entriesRes.data as CloudDailyEntry[]);
      if (debtorsRes.data) setDebtors(debtorsRes.data);
      if (settingsRes.data) setClientSettings(settingsRes.data as CloudClientSettings);
      
    } catch (error) {
      console.error('Error fetching cloud data:', error);
    } finally {
      setIsLoading(false);
      setIsInitialLoad(false);
      setIsSyncing(false);
    }
  }, [clientId]);

  // Setup realtime subscriptions
  const setupRealtimeSubscriptions = useCallback(() => {
    if (!clientId) return;
    
    // Cleanup existing channels
    channelsRef.current.forEach(channel => supabase.removeChannel(channel));
    channelsRef.current = [];
    
    // Tanks channel
    const tanksChannel = supabase
      .channel('tanks-changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'tanks',
        filter: `client_id=eq.${clientId}`
      }, (payload) => {
        console.log('Tank change:', payload);
        if (payload.eventType === 'INSERT') {
          setTanks(prev => [...prev, payload.new as CloudTank]);
        } else if (payload.eventType === 'UPDATE') {
          setTanks(prev => prev.map(t => t.id === payload.new.id ? payload.new as CloudTank : t));
        } else if (payload.eventType === 'DELETE') {
          setTanks(prev => prev.filter(t => t.id !== payload.old.id));
        }
      })
      .subscribe();
    
    // Nozzles channel
    const nozzlesChannel = supabase
      .channel('nozzles-changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'nozzles',
        filter: `client_id=eq.${clientId}`
      }, (payload) => {
        console.log('Nozzle change:', payload);
        if (payload.eventType === 'INSERT') {
          setNozzles(prev => [...prev, payload.new as CloudNozzle]);
        } else if (payload.eventType === 'UPDATE') {
          setNozzles(prev => prev.map(n => n.id === payload.new.id ? payload.new as CloudNozzle : n));
        } else if (payload.eventType === 'DELETE') {
          setNozzles(prev => prev.filter(n => n.id !== payload.old.id));
        }
      })
      .subscribe();
    
    // Purchases channel
    const purchasesChannel = supabase
      .channel('purchases-changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'purchases',
        filter: `client_id=eq.${clientId}`
      }, (payload) => {
        console.log('Purchase change:', payload);
        if (payload.eventType === 'INSERT') {
          setPurchases(prev => [payload.new as CloudPurchase, ...prev]);
        } else if (payload.eventType === 'UPDATE') {
          setPurchases(prev => prev.map(p => p.id === payload.new.id ? payload.new as CloudPurchase : p));
        } else if (payload.eventType === 'DELETE') {
          setPurchases(prev => prev.filter(p => p.id !== payload.old.id));
        }
      })
      .subscribe();
    
    // Daily entries channel
    const entriesChannel = supabase
      .channel('entries-changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'daily_entries',
        filter: `client_id=eq.${clientId}`
      }, (payload) => {
        console.log('Daily entry change:', payload);
        if (payload.eventType === 'INSERT') {
          setDailyEntries(prev => [payload.new as CloudDailyEntry, ...prev]);
        } else if (payload.eventType === 'UPDATE') {
          setDailyEntries(prev => prev.map(e => e.id === payload.new.id ? payload.new as CloudDailyEntry : e));
        } else if (payload.eventType === 'DELETE') {
          setDailyEntries(prev => prev.filter(e => e.id !== payload.old.id));
        }
      })
      .subscribe();
    
    // Debtors channel
    const debtorsChannel = supabase
      .channel('debtors-changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'debtors',
        filter: `client_id=eq.${clientId}`
      }, (payload) => {
        console.log('Debtor change:', payload);
        if (payload.eventType === 'INSERT') {
          setDebtors(prev => [...prev, payload.new as CloudDebtor]);
        } else if (payload.eventType === 'UPDATE') {
          setDebtors(prev => prev.map(d => d.id === payload.new.id ? payload.new as CloudDebtor : d));
        } else if (payload.eventType === 'DELETE') {
          setDebtors(prev => prev.filter(d => d.id !== payload.old.id));
        }
      })
      .subscribe();
    
    // Client settings channel
    const settingsChannel = supabase
      .channel('settings-changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'client_settings',
        filter: `client_id=eq.${clientId}`
      }, (payload) => {
        console.log('Settings change:', payload);
        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          setClientSettings(payload.new as CloudClientSettings);
        }
      })
      .subscribe();
    
    channelsRef.current = [tanksChannel, nozzlesChannel, purchasesChannel, entriesChannel, debtorsChannel, settingsChannel];
  }, [clientId]);

  // Initialize data and subscriptions when clientId is available
  useEffect(() => {
    if (clientId && !authLoading) {
      fetchAllData();
      setupRealtimeSubscriptions();
    } else if (!user) {
      // Reset state when logged out
      setTanks([]);
      setNozzles([]);
      setPurchases([]);
      setDailyEntries([]);
      setDebtors([]);
      setClientSettings(null);
      setIsLoading(false);
      setIsInitialLoad(false);
    }
    
    return () => {
      channelsRef.current.forEach(channel => supabase.removeChannel(channel));
      channelsRef.current = [];
    };
  }, [clientId, authLoading, user, fetchAllData, setupRealtimeSubscriptions]);

  // CRUD Operations
  const createTank = async (data: Omit<CloudTank, 'id' | 'client_id' | 'created_at' | 'updated_at'>) => {
    if (!clientId || !isOnline) return null;
    const { data: newTank, error } = await supabase
      .from('tanks')
      .insert({ ...data, client_id: clientId })
      .select()
      .single();
    if (error) {
      console.error('Error creating tank:', error);
      return null;
    }
    return newTank;
  };

  const updateTank = async (id: string, data: Partial<CloudTank>) => {
    if (!isOnline) return;
    const { error } = await supabase.from('tanks').update(data).eq('id', id);
    if (error) console.error('Error updating tank:', error);
  };

  const deleteTank = async (id: string) => {
    if (!isOnline) return;
    // First disconnect all nozzles from this tank
    await supabase.from('nozzles').update({ tank_id: null }).eq('tank_id', id);
    const { error } = await supabase.from('tanks').delete().eq('id', id);
    if (error) console.error('Error deleting tank:', error);
  };

  const createNozzle = async (data: Omit<CloudNozzle, 'id' | 'client_id' | 'created_at' | 'updated_at'>) => {
    if (!clientId || !isOnline) return null;
    const { data: newNozzle, error } = await supabase
      .from('nozzles')
      .insert({ ...data, client_id: clientId })
      .select()
      .single();
    if (error) {
      console.error('Error creating nozzle:', error);
      return null;
    }
    return newNozzle;
  };

  const updateNozzle = async (id: string, data: Partial<CloudNozzle>) => {
    if (!isOnline) return;
    const { error } = await supabase.from('nozzles').update(data).eq('id', id);
    if (error) console.error('Error updating nozzle:', error);
  };

  const deleteNozzle = async (id: string) => {
    if (!isOnline) return;
    const { error } = await supabase.from('nozzles').delete().eq('id', id);
    if (error) console.error('Error deleting nozzle:', error);
  };

  const createPurchase = async (data: Omit<CloudPurchase, 'id' | 'client_id' | 'created_at' | 'updated_at'>) => {
    if (!clientId || !isOnline) return null;
    const { data: newPurchase, error } = await supabase
      .from('purchases')
      .insert({ ...data, client_id: clientId })
      .select()
      .single();
    if (error) {
      console.error('Error creating purchase:', error);
      return null;
    }
    return newPurchase as CloudPurchase;
  };

  const updatePurchase = async (id: string, data: Partial<CloudPurchase>) => {
    if (!isOnline) return;
    const { error } = await supabase.from('purchases').update(data).eq('id', id);
    if (error) console.error('Error updating purchase:', error);
  };

  const deletePurchase = async (id: string) => {
    if (!isOnline) return;
    const { error } = await supabase.from('purchases').delete().eq('id', id);
    if (error) console.error('Error deleting purchase:', error);
  };

  const createDailyEntry = async (data: Omit<CloudDailyEntry, 'id' | 'client_id' | 'created_at' | 'updated_at'>) => {
    if (!clientId || !isOnline) return null;
    const { data: newEntry, error } = await supabase
      .from('daily_entries')
      .insert({ ...data, client_id: clientId })
      .select()
      .single();
    if (error) {
      console.error('Error creating daily entry:', error);
      return null;
    }
    return newEntry as CloudDailyEntry;
  };

  const updateDailyEntry = async (id: string, data: Partial<CloudDailyEntry>) => {
    if (!isOnline) return;
    const { error } = await supabase.from('daily_entries').update(data).eq('id', id);
    if (error) console.error('Error updating daily entry:', error);
  };

  const deleteDailyEntry = async (id: string) => {
    if (!isOnline) return;
    const { error } = await supabase.from('daily_entries').delete().eq('id', id);
    if (error) console.error('Error deleting daily entry:', error);
  };

  const createDebtor = async (data: Omit<CloudDebtor, 'id' | 'client_id' | 'created_at' | 'updated_at'>) => {
    if (!clientId || !isOnline) return null;
    const { data: newDebtor, error } = await supabase
      .from('debtors')
      .insert({ ...data, client_id: clientId })
      .select()
      .single();
    if (error) {
      console.error('Error creating debtor:', error);
      return null;
    }
    return newDebtor;
  };

  const updateDebtor = async (id: string, data: Partial<CloudDebtor>) => {
    if (!isOnline) return;
    const { error } = await supabase.from('debtors').update(data).eq('id', id);
    if (error) console.error('Error updating debtor:', error);
  };

  const deleteDebtor = async (id: string) => {
    if (!isOnline) return;
    const { error } = await supabase.from('debtors').delete().eq('id', id);
    if (error) console.error('Error deleting debtor:', error);
  };

  const updateClientSettings = async (data: Partial<CloudClientSettings>) => {
    if (!clientId || !isOnline) return;
    
    // Upsert: insert if not exists, update if exists
    const { error } = await supabase
      .from('client_settings')
      .upsert({ ...data, client_id: clientId }, { onConflict: 'client_id' });
    if (error) console.error('Error updating client settings:', error);
  };

  // Utility functions
  const getConnectedNozzles = () => nozzles.filter(n => n.tank_id !== null);
  
  const getNozzlesForTank = (tankId: string) => nozzles.filter(n => n.tank_id === tankId);
  
  const getTankForNozzle = (nozzleId: string) => {
    const nozzle = nozzles.find(n => n.id === nozzleId);
    if (!nozzle?.tank_id) return null;
    return tanks.find(t => t.id === nozzle.tank_id) || null;
  };
  
  const getLastPrice = (fuelType: FuelType): number => {
    return clientSettings?.last_prices?.[fuelType] || 0;
  };

  return (
    <CloudDataContext.Provider
      value={{
        tanks,
        nozzles,
        purchases,
        dailyEntries,
        debtors,
        clientSettings,
        isLoading: isLoading || authLoading,
        isInitialLoad,
        isOnline,
        isSyncing,
        createTank,
        updateTank,
        deleteTank,
        createNozzle,
        updateNozzle,
        deleteNozzle,
        createPurchase,
        updatePurchase,
        deletePurchase,
        createDailyEntry,
        updateDailyEntry,
        deleteDailyEntry,
        createDebtor,
        updateDebtor,
        deleteDebtor,
        updateClientSettings,
        refreshData: fetchAllData,
        getConnectedNozzles,
        getNozzlesForTank,
        getTankForNozzle,
        getLastPrice,
      }}
    >
      {children}
    </CloudDataContext.Provider>
  );
}

export function useCloudData() {
  const context = useContext(CloudDataContext);
  if (context === undefined) {
    throw new Error('useCloudData must be used within a CloudDataProvider');
  }
  return context;
}
