/**
 * Transaction Service for Daily Sales
 * Handles atomic operations for create/update/delete with stock management
 */

import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';

export interface NozzleReading {
  id: string;
  fuelType: string;
  openingReading: number;
  closingReading: number;
  label?: string;
  machineId?: number;
  nozzleNumber?: number;
}

export interface DailyEntryData {
  date: string;
  shift_name: string | null;
  fuel_rates: Record<string, number>;
  nozzles: NozzleReading[];
  lube_items: unknown[];
  expenses: unknown[];
  incomes: unknown[];
  credit_sales: unknown[];
  upi_collection: number;
  cash_deposit: number;
  opening_balance: number;
  testing_deduction: Record<string, number>;
}

export interface TransactionResult {
  success: boolean;
  operation: string;
  entry_id: string;
  error?: string;
}

/**
 * Build nozzle-to-tank mapping from connected nozzles
 */
export function buildNozzleTankMap(nozzles: Array<{ id: string; tank_id: string | null }>): Record<string, string> {
  const map: Record<string, string> = {};
  nozzles.forEach(n => {
    if (n.tank_id) {
      map[n.id] = n.tank_id;
    }
  });
  return map;
}

/**
 * Create a new daily entry with atomic stock deduction
 * This uses a server-side RPC function to ensure atomicity
 */
export async function createDailySale(
  clientId: string,
  entryData: DailyEntryData,
  nozzleTankMap: Record<string, string>
): Promise<TransactionResult> {
  try {
    const { data, error } = await supabase.rpc('process_daily_sale', {
      p_operation: 'create',
      p_client_id: clientId,
      p_entry_data: entryData as unknown as Json,
      p_nozzle_tank_map: nozzleTankMap as unknown as Json,
    });

    if (error) {
      console.error('Error in createDailySale:', error);
      throw new Error(error.message);
    }

    return data as unknown as TransactionResult;
  } catch (error: unknown) {
    console.error('Transaction failed:', error);
    throw error;
  }
}

/**
 * Update an existing daily entry with atomic stock adjustment
 * Reverts old stock and applies new stock in a single transaction
 */
export async function updateDailySale(
  clientId: string,
  entryId: string,
  entryData: DailyEntryData,
  oldNozzles: NozzleReading[],
  nozzleTankMap: Record<string, string>
): Promise<TransactionResult> {
  try {
    const { data, error } = await supabase.rpc('process_daily_sale', {
      p_operation: 'update',
      p_client_id: clientId,
      p_entry_id: entryId,
      p_entry_data: entryData as unknown as Json,
      p_old_nozzles: oldNozzles as unknown as Json,
      p_nozzle_tank_map: nozzleTankMap as unknown as Json,
    });

    if (error) {
      console.error('Error in updateDailySale:', error);
      throw new Error(error.message);
    }

    return data as unknown as TransactionResult;
  } catch (error: unknown) {
    console.error('Transaction failed:', error);
    throw error;
  }
}

/**
 * Delete a daily entry with atomic stock restoration
 * Adds back the sold quantities to tanks before deleting
 */
export async function deleteDailySale(
  clientId: string,
  entryId: string,
  nozzleTankMap: Record<string, string>
): Promise<TransactionResult> {
  try {
    const { data, error } = await supabase.rpc('process_daily_sale', {
      p_operation: 'delete',
      p_client_id: clientId,
      p_entry_id: entryId,
      p_nozzle_tank_map: nozzleTankMap as unknown as Json,
    });

    if (error) {
      console.error('Error in deleteDailySale:', error);
      throw new Error(error.message);
    }

    return data as unknown as TransactionResult;
  } catch (error: unknown) {
    console.error('Transaction failed:', error);
    throw error;
  }
}

/**
 * Update debtor outstanding amounts for credit sales
 * Should be called after successful daily entry creation
 */
export async function updateDebtorOutstanding(
  creditSales: Array<{ debtorId: string; amount: number }>
): Promise<void> {
  for (const cs of creditSales) {
    if (cs.debtorId && cs.amount > 0) {
      const { data: debtor } = await supabase
        .from('debtors')
        .select('total_outstanding')
        .eq('id', cs.debtorId)
        .single();

      if (debtor) {
        await supabase
          .from('debtors')
          .update({ 
            total_outstanding: debtor.total_outstanding + cs.amount 
          })
          .eq('id', cs.debtorId);
      }
    }
  }
}

/**
 * Revert debtor outstanding amounts (for delete or update operations)
 */
export async function revertDebtorOutstanding(
  creditSales: Array<{ debtorId: string; amount: number }>
): Promise<void> {
  for (const cs of creditSales) {
    if (cs.debtorId && cs.amount > 0) {
      const { data: debtor } = await supabase
        .from('debtors')
        .select('total_outstanding')
        .eq('id', cs.debtorId)
        .single();

      if (debtor) {
        await supabase
          .from('debtors')
          .update({ 
            total_outstanding: Math.max(0, debtor.total_outstanding - cs.amount)
          })
          .eq('id', cs.debtorId);
      }
    }
  }
}
