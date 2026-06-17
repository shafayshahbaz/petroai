import { supabase } from '@/integrations/supabase/client';

export interface PersonEntryExpense {
  id: string;
  type: 'Pump Expense' | 'Partner Withdrawal' | 'Debtor Oil Given' | 'Other';
  description: string;
  amount: number;
}

export interface PersonEntryDenominations {
  d500: number;
  d200: number;
  d100: number;
  d50: number;
  d20: number;
  d10: number;
  coins: number; // direct amount
}

export interface PersonEntryRecord {
  id: string;
  client_id: string;
  entry_date: string;
  nozzle_man_id: string | null;
  nozzle_man_name: string;
  nozzle_id: string | null;
  nozzle_label: string;
  product: string;
  opening_reading: number;
  closing_reading: number;
  liters_sold: number;
  rate: number;
  gross_amount: number;
  expenses: PersonEntryExpense[];
  total_expenses: number;
  net_payable: number;
  denominations: PersonEntryDenominations;
  total_cash: number;
  upi_received: number;
  total_collected: number;
  difference: number;
  deposited: boolean;
  created_at: string;
  updated_at: string;
}

export interface PersonEntryInput {
  entry_date: string;
  nozzle_man_id: string | null;
  nozzle_man_name: string;
  nozzle_id: string | null;
  nozzle_label: string;
  product: string;
  opening_reading: number;
  closing_reading: number;
  liters_sold: number;
  rate: number;
  gross_amount: number;
  expenses: PersonEntryExpense[];
  total_expenses: number;
  net_payable: number;
  denominations: PersonEntryDenominations;
  total_cash: number;
  upi_received: number;
  total_collected: number;
  difference: number;
}

export async function createPersonEntry(input: PersonEntryInput, clientId: string) {
  const { data, error } = await supabase
    .from('person_entries' as any)
    .insert({ ...input, client_id: clientId })
    .select()
    .single();
  if (error) throw error;
  return data as unknown as PersonEntryRecord;
}

export async function listPersonEntries(fromDate?: string, toDate?: string): Promise<PersonEntryRecord[]> {
  let q = supabase.from('person_entries' as any).select('*').order('entry_date', { ascending: false });
  if (fromDate) q = q.gte('entry_date', fromDate);
  if (toDate) q = q.lte('entry_date', toDate);
  const { data, error } = await q;
  if (error) throw error;
  return (data || []) as unknown as PersonEntryRecord[];
}

export async function upsertDailyRate(clientId: string, rateDate: string, product: string, rate: number) {
  const { error } = await supabase
    .from('fuel_rates_daily' as any)
    .upsert(
      { client_id: clientId, rate_date: rateDate, product, rate },
      { onConflict: 'client_id,rate_date,product' }
    );
  if (error) throw error;
}

export async function getDailyRate(rateDate: string, product: string): Promise<number | null> {
  const { data, error } = await supabase
    .from('fuel_rates_daily' as any)
    .select('rate')
    .eq('rate_date', rateDate)
    .eq('product', product)
    .maybeSingle();
  if (error) throw error;
  return data ? (data as any).rate : null;
}
