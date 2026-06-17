import { supabase } from '@/integrations/supabase/client';

// ===== Opening Cash in Hand (stored on clients) =====

export async function getOpeningCashInHand(clientId: string): Promise<number> {
  const { data, error } = await supabase
    .from('clients')
    .select('opening_cash_in_hand')
    .eq('id', clientId)
    .maybeSingle();
  if (error) throw error;
  return Number((data as any)?.opening_cash_in_hand || 0);
}

export async function setOpeningCashInHand(clientId: string, amount: number) {
  const { error } = await supabase
    .from('clients')
    .update({
      opening_cash_in_hand: amount,
      opening_cash_set_at: new Date().toISOString(),
    } as any)
    .eq('id', clientId);
  if (error) throw error;
}

// ===== Default product rates (stored on client_settings.default_rates jsonb) =====

export type DefaultRates = Record<string, number>;

export async function getDefaultRates(clientId: string): Promise<DefaultRates> {
  const { data, error } = await supabase
    .from('client_settings' as any)
    .select('default_rates')
    .eq('client_id', clientId)
    .maybeSingle();
  if (error) throw error;
  return ((data as any)?.default_rates || {}) as DefaultRates;
}

export async function setDefaultRates(clientId: string, rates: DefaultRates) {
  // upsert into client_settings
  const { data: existing } = await supabase
    .from('client_settings' as any)
    .select('id')
    .eq('client_id', clientId)
    .maybeSingle();
  if (existing) {
    const { error } = await supabase
      .from('client_settings' as any)
      .update({ default_rates: rates })
      .eq('client_id', clientId);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from('client_settings' as any)
      .insert({ client_id: clientId, default_rates: rates });
    if (error) throw error;
  }
}

// ===== Per-nozzle opening reading =====

export async function setNozzleOpeningReading(nozzleId: string, opening: number) {
  const { error } = await supabase
    .from('nozzles')
    .update({ opening_reading: opening } as any)
    .eq('id', nozzleId);
  if (error) throw error;
}
