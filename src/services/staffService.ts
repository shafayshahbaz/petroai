import { supabase } from '@/integrations/supabase/client';

export interface NozzleMan {
  id: string;
  client_id: string;
  name: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export async function listNozzleMen(): Promise<NozzleMan[]> {
  const { data, error } = await supabase
    .from('nozzle_men' as any)
    .select('*')
    .eq('active', true)
    .order('name', { ascending: true });
  if (error) throw error;
  return (data || []) as unknown as NozzleMan[];
}

export async function addNozzleMan(name: string, clientId: string): Promise<NozzleMan> {
  const { data, error } = await supabase
    .from('nozzle_men' as any)
    .insert({ name: name.trim(), client_id: clientId })
    .select()
    .single();
  if (error) throw error;
  return data as unknown as NozzleMan;
}

export async function updateNozzleMan(id: string, name: string): Promise<void> {
  const { error } = await supabase
    .from('nozzle_men' as any)
    .update({ name: name.trim() })
    .eq('id', id);
  if (error) throw error;
}

export async function deactivateNozzleMan(id: string): Promise<void> {
  const { error } = await supabase
    .from('nozzle_men' as any)
    .update({ active: false })
    .eq('id', id);
  if (error) throw error;
}
