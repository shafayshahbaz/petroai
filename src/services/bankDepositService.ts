import { supabase } from '@/integrations/supabase/client';

export type BankTxnType = 'deposit' | 'cash_transfer';

export interface BankDepositRecord {
  id: string;
  client_id: string;
  deposit_date: string;
  amount: number;
  bank_name: string | null;
  reference_number: string | null;
  notes: string | null;
  transaction_type: BankTxnType;
  created_at: string;
  updated_at: string;
}

export interface BankDepositInput {
  deposit_date: string;
  amount: number;
  bank_name?: string | null;
  reference_number?: string | null;
  notes?: string | null;
  transaction_type?: BankTxnType;
}

export async function createBankDeposit(input: BankDepositInput, clientId: string) {
  const { data, error } = await supabase
    .from('bank_deposits' as any)
    .insert({ transaction_type: 'deposit', ...input, client_id: clientId })
    .select()
    .single();
  if (error) throw error;
  return data as unknown as BankDepositRecord;
}

export async function listBankDeposits(): Promise<BankDepositRecord[]> {
  const { data, error } = await supabase
    .from('bank_deposits' as any)
    .select('*')
    .order('deposit_date', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []) as unknown as BankDepositRecord[];
}

export async function deleteBankDeposit(id: string) {
  const { error } = await supabase.from('bank_deposits' as any).delete().eq('id', id);
  if (error) throw error;
}

export async function listBankDepositsForDate(date: string): Promise<BankDepositRecord[]> {
  const { data, error } = await supabase
    .from('bank_deposits' as any)
    .select('*')
    .eq('deposit_date', date);
  if (error) throw error;
  return (data || []) as unknown as BankDepositRecord[];
}
