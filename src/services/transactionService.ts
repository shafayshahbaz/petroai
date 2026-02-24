/**
 * Transaction Service for Daily Sales
 * Handles atomic operations for create/update/delete with stock management
 */

import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import { format } from 'date-fns';

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

/**
 * Create ledger transaction entries for credit sales
 * This ensures credit sales are recorded in the debtor's ledger
 */
export async function createCreditSaleLedgerEntries(
  clientId: string,
  entryDate: string,
  creditSales: Array<{ debtorId: string; debtorName: string; amount: number; remarks?: string }>
): Promise<void> {
  for (const cs of creditSales) {
    if (cs.debtorId && cs.amount > 0) {
      await supabase
        .from('ledger_transactions')
        .insert({
          client_id: clientId,
          account_type: 'debtor',
          account_id: cs.debtorId,
          account_name: cs.debtorName,
          transaction_date: entryDate,
          transaction_type: 'DEBIT',
          amount: cs.amount,
          description: `Credit Sale - ${format(new Date(entryDate), 'dd MMM yyyy')}`,
          remarks: cs.remarks || null,
          reference_id: `credit-${cs.debtorId}-${entryDate}`,
        });
    }
  }
}

/**
 * Delete ledger transaction entries for a specific daily entry (for updates/deletes)
 */
export async function deleteCreditSaleLedgerEntries(
  clientId: string,
  entryDate: string
): Promise<void> {
  await supabase
    .from('ledger_transactions')
    .delete()
    .eq('client_id', clientId)
    .eq('account_type', 'debtor')
    .eq('transaction_date', entryDate)
    .like('description', 'Credit Sale -%');
}

/**
 * Cascade opening balances for all entries after a given date.
 * Recalculates each entry's opening_balance based on the previous entry's cash-in-hand.
 */
export async function cascadeOpeningBalances(
  clientId: string,
  allEntries: Array<{
    id: string;
    date: string;
    opening_balance: number;
    fuel_rates: any;
    nozzles: any;
    lube_items: any;
    expenses: any;
    incomes: any;
    credit_sales: any;
    upi_collection: number;
    cash_deposit: number;
    testing_deduction: any;
  }>
): Promise<number> {
  if (allEntries.length === 0) return 0;

  // Sort by date ascending
  const sorted = [...allEntries].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  let updatedCount = 0;

  for (let i = 1; i < sorted.length; i++) {
    const prevEntry = sorted[i - 1];
    const currentEntry = sorted[i];

    // Calculate previous entry's cash-in-hand
    const prevCashInHand = calculateCashInHand(prevEntry);

    // Round to 2 decimals
    const expectedOpening = Math.round(prevCashInHand * 100) / 100;
    const currentOpening = Math.round((currentEntry.opening_balance || 0) * 100) / 100;

    if (Math.abs(expectedOpening - currentOpening) > 0.01) {
      // Update this entry's opening_balance in database
      await supabase
        .from('daily_entries')
        .update({ opening_balance: expectedOpening })
        .eq('id', currentEntry.id);

      // Update our local copy so subsequent calculations use the new value
      sorted[i] = { ...sorted[i], opening_balance: expectedOpening };
      updatedCount++;
    }
  }

  return updatedCount;
}

/**
 * Calculate cash-in-hand for a cloud entry (same logic as calculateTotals)
 */
function calculateCashInHand(entry: {
  opening_balance: number;
  fuel_rates: any;
  nozzles: any;
  lube_items: any;
  expenses: any;
  incomes: any;
  credit_sales: any;
  upi_collection: number;
  cash_deposit: number;
  testing_deduction: any;
}): number {
  const rates = (entry.fuel_rates || { MS: 0, HSD: 0, POWER: 0 }) as Record<string, number>;
  const testingDeduction = (entry.testing_deduction || { MS: 0, HSD: 0, POWER: 0 }) as Record<string, number>;
  const nozzles = (entry.nozzles || []) as Array<{ fuelType: string; openingReading: number; closingReading: number }>;

  const fuelSales: Record<string, number> = { MS: 0, HSD: 0, POWER: 0 };
  nozzles.forEach(n => {
    const liters = Math.max(0, n.closingReading - n.openingReading);
    fuelSales[n.fuelType] = (fuelSales[n.fuelType] || 0) + liters;
  });

  let totalFuelAmount = 0;
  ['MS', 'HSD', 'POWER'].forEach(ft => {
    const netLiters = Math.max(0, (fuelSales[ft] || 0) - (testingDeduction[ft] || 0));
    totalFuelAmount += netLiters * (rates[ft] || 0);
  });

  const totalLubeAmount = ((entry.lube_items || []) as Array<{ quantity: number; rate: number }>)
    .reduce((sum, item) => sum + item.quantity * item.rate, 0);
  const totalIncomes = ((entry.incomes || []) as Array<{ amount: number }>)
    .reduce((sum, item) => sum + item.amount, 0);
  const totalCreditSales = ((entry.credit_sales || []) as Array<{ amount: number }>)
    .reduce((sum, item) => sum + item.amount, 0);

  const grandTotalIncome = totalFuelAmount + totalLubeAmount + totalIncomes + (entry.opening_balance || 0);
  const totalExpenses = ((entry.expenses || []) as Array<{ amount: number }>)
    .reduce((sum, item) => sum + item.amount, 0)
    + (entry.upi_collection || 0)
    + (entry.cash_deposit || 0)
    + totalCreditSales;

  return Math.round((grandTotalIncome - totalExpenses) * 100) / 100;
}

/**
 * Record a payment receipt in the ledger (CREDIT transaction to reduce debt)
 */
export async function recordPaymentReceipt(
  clientId: string,
  debtorId: string,
  debtorName: string,
  date: string,
  amount: number,
  paymentMode: string,
  remarks?: string
): Promise<void> {
  await supabase
    .from('ledger_transactions')
    .insert({
      client_id: clientId,
      account_type: 'debtor',
      account_id: debtorId,
      account_name: debtorName,
      transaction_date: date,
      transaction_type: 'CREDIT',
      amount: amount,
      description: `Payment Received - ${paymentMode}`,
      remarks: remarks || null,
      reference_id: `payment-${debtorId}-${date}-${Date.now()}`,
    });
}
