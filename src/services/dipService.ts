import { supabase } from '@/integrations/supabase/client';

export interface TankRow {
  id: string;
  name: string;
  fuel_type: string;
  capacity: number;
  current_stock: number;
}

export interface DipChartRow {
  point: number;
  liters: number;
}

export interface DipReadingRow {
  id?: string;
  tank_id: string;
  date: string;
  dip_reading: number;
  dip_liters: number | null;
  system_liters: number | null;
  variance: number | null;
}

export async function listTanks(): Promise<TankRow[]> {
  const { data, error } = await supabase
    .from('tanks')
    .select('id,name,fuel_type,capacity,current_stock')
    .order('fuel_type', { ascending: true })
    .order('name', { ascending: true });
  if (error) throw error;
  return (data || []) as TankRow[];
}

export async function getDipChart(tankId: string): Promise<DipChartRow[]> {
  const { data, error } = await supabase
    .from('dip_charts')
    .select('point,liters')
    .eq('tank_id', tankId)
    .order('point', { ascending: true });
  if (error) throw error;
  return (data || []).map((r: any) => ({ point: Number(r.point), liters: Number(r.liters) }));
}

export async function upsertDipChart(
  clientId: string,
  tankId: string,
  rows: DipChartRow[]
): Promise<void> {
  // Replace existing chart for this tank
  const { error: delErr } = await supabase.from('dip_charts').delete().eq('tank_id', tankId);
  if (delErr) throw delErr;
  if (rows.length === 0) return;
  const payload = rows.map((r) => ({
    client_id: clientId,
    tank_id: tankId,
    point: r.point,
    liters: r.liters,
  }));
  const { error } = await supabase.from('dip_charts').insert(payload);
  if (error) throw error;
}

/**
 * Interpolation formula:
 *   Liters = Chart[floor(dip)] + ((Chart[floor(dip)+1] - Chart[floor(dip)]) / 10) * (decimalDigit * 10)
 * where decimalDigit is the single digit after the decimal (0..9).
 * Example: 10.8 with chart[10]=1000, chart[11]=1085 -> 1000 + ((1085-1000)/10)*8 = 1068
 */
export function computeLitersFromDip(
  chart: DipChartRow[],
  dip: number
): number | null {
  if (!chart || chart.length === 0 || !Number.isFinite(dip) || dip < 0) return null;
  const map = new Map<number, number>();
  chart.forEach((r) => map.set(r.point, r.liters));
  const f = Math.floor(dip);
  const decimalDigit = Math.round((dip - f) * 10);
  const a = map.get(f);
  if (a == null) return null;
  if (decimalDigit === 0) return Math.round(a * 100) / 100;
  const b = map.get(f + 1);
  if (b == null) return Math.round(a * 100) / 100; // can't interpolate above max
  const liters = a + ((b - a) / 10) * decimalDigit;
  return Math.round(liters * 100) / 100;
}

export async function getDipReadingsForDate(date: string): Promise<DipReadingRow[]> {
  const { data, error } = await supabase
    .from('daily_dip_readings')
    .select('id,tank_id,date,dip_reading,dip_liters,system_liters,variance')
    .eq('date', date);
  if (error) throw error;
  return (data || []) as DipReadingRow[];
}

export async function saveDipReadings(
  clientId: string,
  date: string,
  readings: Omit<DipReadingRow, 'id'>[]
): Promise<void> {
  const payload = readings.map((r) => ({
    client_id: clientId,
    tank_id: r.tank_id,
    date,
    dip_reading: r.dip_reading,
    dip_liters: r.dip_liters,
    system_liters: r.system_liters,
    variance: r.variance,
  }));
  const { error } = await supabase
    .from('daily_dip_readings')
    .upsert(payload, { onConflict: 'client_id,date,tank_id' });
  if (error) throw error;
}

export async function listRecentDipReadings(limit: number = 30): Promise<DipReadingRow[]> {
  const { data, error } = await supabase
    .from('daily_dip_readings')
    .select('id,tank_id,date,dip_reading,dip_liters,system_liters,variance')
    .order('date', { ascending: false })
    .limit(limit * 10); // fetch enough to cover N days * tanks
  if (error) throw error;
  return (data || []) as DipReadingRow[];
}
