/**
 * Cloud Database Service
 * Handles all Supabase operations for real-time cloud sync
 */

import { supabase } from '@/integrations/supabase/client';
import { FuelType } from '@/types/petrol-pump';

// ==================== TYPES ====================

export interface DbTank {
  id: string;
  client_id: string;
  name: string;
  fuel_type: FuelType;
  capacity: number;
  current_stock: number;
  created_at: string;
  updated_at: string;
}

export interface DbNozzle {
  id: string;
  client_id: string;
  label: string;
  fuel_type: FuelType;
  tank_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbDebtor {
  id: string;
  client_id: string;
  name: string;
  contact_number: string | null;
  opening_balance: number;
  total_outstanding: number;
  created_at: string;
  updated_at: string;
}

export interface DbPurchase {
  id: string;
  client_id: string;
  invoice_number: string;
  invoice_date: string;
  supplier_name: string;
  total_invoice_value: number;
  chambers: any[];
  density_check: any;
  stock_verifications: any[];
  status: 'draft' | 'completed';
  created_at: string;
  updated_at: string;
}

export interface DbDailyEntry {
  id: string;
  client_id: string;
  date: string;
  shift_name: string | null;
  fuel_rates: { MS: number; HSD: number; POWER: number };
  nozzles: any[];
  lube_items: any[];
  expenses: any[];
  incomes: any[];
  credit_sales: any[];
  upi_collection: number;
  cash_deposit: number;
  opening_balance: number;
  testing_deduction: { MS: number; HSD: number; POWER: number };
  created_at: string;
  updated_at: string;
}

export interface DbClientSettings {
  id: string;
  client_id: string;
  last_prices: { MS: number; HSD: number; POWER: number };
  last_chamber_capacity: number;
  last_backup_date: string | null;
  created_at: string;
  updated_at: string;
}

// ==================== CONNECTION STATUS ====================

export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    const { error } = await supabase.from('clients').select('id').limit(1);
    return !error;
  } catch {
    return false;
  }
}

// ==================== TANKS ====================

export async function fetchTanks(): Promise<DbTank[]> {
  const { data, error } = await supabase
    .from('tanks')
    .select('*')
    .order('created_at', { ascending: true });
  
  if (error) {
    console.error('Error fetching tanks:', error);
    throw error;
  }
  return (data || []) as DbTank[];
}

export async function createTank(tank: Omit<DbTank, 'id' | 'client_id' | 'created_at' | 'updated_at'>): Promise<DbTank> {
  const { data: clientData } = await supabase.rpc('get_current_client_id');
  
  const { data, error } = await supabase
    .from('tanks')
    .insert({
      ...tank,
      client_id: clientData,
    })
    .select()
    .single();
  
  if (error) {
    console.error('Error creating tank:', error);
    throw error;
  }
  return data as DbTank;
}

export async function updateTank(id: string, updates: Partial<DbTank>): Promise<DbTank> {
  const { data, error } = await supabase
    .from('tanks')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  
  if (error) {
    console.error('Error updating tank:', error);
    throw error;
  }
  return data as DbTank;
}

export async function deleteTank(id: string): Promise<void> {
  const { error } = await supabase
    .from('tanks')
    .delete()
    .eq('id', id);
  
  if (error) {
    console.error('Error deleting tank:', error);
    throw error;
  }
}

// ==================== NOZZLES ====================

export async function fetchNozzles(): Promise<DbNozzle[]> {
  const { data, error } = await supabase
    .from('nozzles')
    .select('*')
    .order('created_at', { ascending: true });
  
  if (error) {
    console.error('Error fetching nozzles:', error);
    throw error;
  }
  return (data || []) as DbNozzle[];
}

export async function createNozzle(nozzle: { label: string; fuel_type: FuelType }): Promise<DbNozzle> {
  const { data: clientData } = await supabase.rpc('get_current_client_id');
  
  const { data, error } = await supabase
    .from('nozzles')
    .insert({
      ...nozzle,
      client_id: clientData,
    })
    .select()
    .single();
  
  if (error) {
    console.error('Error creating nozzle:', error);
    throw error;
  }
  return data as DbNozzle;
}

export async function updateNozzle(id: string, updates: Partial<DbNozzle>): Promise<DbNozzle> {
  const { data, error } = await supabase
    .from('nozzles')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  
  if (error) {
    console.error('Error updating nozzle:', error);
    throw error;
  }
  return data as DbNozzle;
}

export async function deleteNozzle(id: string): Promise<void> {
  const { error } = await supabase
    .from('nozzles')
    .delete()
    .eq('id', id);
  
  if (error) {
    console.error('Error deleting nozzle:', error);
    throw error;
  }
}

export async function connectNozzleToTank(nozzleId: string, tankId: string): Promise<void> {
  const { error } = await supabase
    .from('nozzles')
    .update({ tank_id: tankId })
    .eq('id', nozzleId);
  
  if (error) {
    console.error('Error connecting nozzle to tank:', error);
    throw error;
  }
}

export async function disconnectNozzle(nozzleId: string): Promise<void> {
  const { error } = await supabase
    .from('nozzles')
    .update({ tank_id: null })
    .eq('id', nozzleId);
  
  if (error) {
    console.error('Error disconnecting nozzle:', error);
    throw error;
  }
}

// ==================== DEBTORS ====================

export async function fetchDebtors(): Promise<DbDebtor[]> {
  const { data, error } = await supabase
    .from('debtors')
    .select('*')
    .order('name', { ascending: true });
  
  if (error) {
    console.error('Error fetching debtors:', error);
    throw error;
  }
  return (data || []) as DbDebtor[];
}

export async function createDebtor(debtor: { name: string; contact_number?: string; opening_balance?: number }): Promise<DbDebtor> {
  const { data: clientData } = await supabase.rpc('get_current_client_id');
  
  const { data, error } = await supabase
    .from('debtors')
    .insert({
      name: debtor.name,
      contact_number: debtor.contact_number || null,
      opening_balance: debtor.opening_balance || 0,
      total_outstanding: debtor.opening_balance || 0,
      client_id: clientData,
    })
    .select()
    .single();
  
  if (error) {
    console.error('Error creating debtor:', error);
    throw error;
  }
  return data as DbDebtor;
}

export async function updateDebtor(id: string, updates: Partial<DbDebtor>): Promise<DbDebtor> {
  const { data, error } = await supabase
    .from('debtors')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  
  if (error) {
    console.error('Error updating debtor:', error);
    throw error;
  }
  return data as DbDebtor;
}

export async function deleteDebtor(id: string): Promise<void> {
  const { error } = await supabase
    .from('debtors')
    .delete()
    .eq('id', id);
  
  if (error) {
    console.error('Error deleting debtor:', error);
    throw error;
  }
}

// ==================== PURCHASES ====================

export async function fetchPurchases(): Promise<DbPurchase[]> {
  const { data, error } = await supabase
    .from('purchases')
    .select('*')
    .order('invoice_date', { ascending: false });
  
  if (error) {
    console.error('Error fetching purchases:', error);
    throw error;
  }
  return (data || []) as DbPurchase[];
}

export async function createPurchase(purchase: Omit<DbPurchase, 'id' | 'client_id' | 'created_at' | 'updated_at'>): Promise<DbPurchase> {
  const { data: clientData } = await supabase.rpc('get_current_client_id');
  
  const { data, error } = await supabase
    .from('purchases')
    .insert({
      ...purchase,
      client_id: clientData,
    })
    .select()
    .single();
  
  if (error) {
    console.error('Error creating purchase:', error);
    throw error;
  }
  return data as DbPurchase;
}

export async function updatePurchase(id: string, updates: Partial<DbPurchase>): Promise<DbPurchase> {
  const { data, error } = await supabase
    .from('purchases')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  
  if (error) {
    console.error('Error updating purchase:', error);
    throw error;
  }
  return data as DbPurchase;
}

export async function deletePurchase(id: string): Promise<void> {
  const { error } = await supabase
    .from('purchases')
    .delete()
    .eq('id', id);
  
  if (error) {
    console.error('Error deleting purchase:', error);
    throw error;
  }
}

// ==================== DAILY ENTRIES ====================

export async function fetchDailyEntries(): Promise<DbDailyEntry[]> {
  const { data, error } = await supabase
    .from('daily_entries')
    .select('*')
    .order('date', { ascending: false });
  
  if (error) {
    console.error('Error fetching daily entries:', error);
    throw error;
  }
  return (data || []) as DbDailyEntry[];
}

export async function createDailyEntry(entry: Omit<DbDailyEntry, 'id' | 'client_id' | 'created_at' | 'updated_at'>): Promise<DbDailyEntry> {
  const { data: clientData } = await supabase.rpc('get_current_client_id');
  
  const { data, error } = await supabase
    .from('daily_entries')
    .insert({
      ...entry,
      client_id: clientData,
    })
    .select()
    .single();
  
  if (error) {
    console.error('Error creating daily entry:', error);
    throw error;
  }
  return data as DbDailyEntry;
}

export async function updateDailyEntry(id: string, updates: Partial<DbDailyEntry>): Promise<DbDailyEntry> {
  const { data, error } = await supabase
    .from('daily_entries')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  
  if (error) {
    console.error('Error updating daily entry:', error);
    throw error;
  }
  return data as DbDailyEntry;
}

export async function deleteDailyEntry(id: string): Promise<void> {
  const { error } = await supabase
    .from('daily_entries')
    .delete()
    .eq('id', id);
  
  if (error) {
    console.error('Error deleting daily entry:', error);
    throw error;
  }
}

// ==================== CLIENT SETTINGS ====================

export async function fetchClientSettings(): Promise<DbClientSettings | null> {
  const { data, error } = await supabase
    .from('client_settings')
    .select('*')
    .single();
  
  if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
    console.error('Error fetching client settings:', error);
    throw error;
  }
  return data as DbClientSettings | null;
}

export async function upsertClientSettings(settings: Partial<DbClientSettings>): Promise<DbClientSettings> {
  const { data: clientData } = await supabase.rpc('get_current_client_id');
  
  // Try to get existing settings first
  const { data: existing } = await supabase
    .from('client_settings')
    .select('id')
    .eq('client_id', clientData)
    .single();
  
  if (existing) {
    // Update existing
    const { data, error } = await supabase
      .from('client_settings')
      .update(settings)
      .eq('client_id', clientData)
      .select()
      .single();
    
    if (error) throw error;
    return data as DbClientSettings;
  } else {
    // Insert new
    const { data, error } = await supabase
      .from('client_settings')
      .insert({
        ...settings,
        client_id: clientData,
      })
      .select()
      .single();
    
    if (error) throw error;
    return data as DbClientSettings;
  }
}

// ==================== REALTIME SUBSCRIPTIONS ====================

export function subscribeToTanks(callback: (tanks: DbTank[]) => void) {
  const channel = supabase
    .channel('tanks-changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'tanks' },
      async () => {
        const tanks = await fetchTanks();
        callback(tanks);
      }
    )
    .subscribe();
  
  return () => {
    supabase.removeChannel(channel);
  };
}

export function subscribeToNozzles(callback: (nozzles: DbNozzle[]) => void) {
  const channel = supabase
    .channel('nozzles-changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'nozzles' },
      async () => {
        const nozzles = await fetchNozzles();
        callback(nozzles);
      }
    )
    .subscribe();
  
  return () => {
    supabase.removeChannel(channel);
  };
}

export function subscribeToDebtors(callback: (debtors: DbDebtor[]) => void) {
  const channel = supabase
    .channel('debtors-changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'debtors' },
      async () => {
        const debtors = await fetchDebtors();
        callback(debtors);
      }
    )
    .subscribe();
  
  return () => {
    supabase.removeChannel(channel);
  };
}

export function subscribeToPurchases(callback: (purchases: DbPurchase[]) => void) {
  const channel = supabase
    .channel('purchases-changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'purchases' },
      async () => {
        const purchases = await fetchPurchases();
        callback(purchases);
      }
    )
    .subscribe();
  
  return () => {
    supabase.removeChannel(channel);
  };
}

export function subscribeToDailyEntries(callback: (entries: DbDailyEntry[]) => void) {
  const channel = supabase
    .channel('daily-entries-changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'daily_entries' },
      async () => {
        const entries = await fetchDailyEntries();
        callback(entries);
      }
    )
    .subscribe();
  
  return () => {
    supabase.removeChannel(channel);
  };
}
