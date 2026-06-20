import { supabase } from '@/integrations/supabase/client';

export interface PersonEntryExpense {
  id: string;
  type: 'Pump Expense' | 'Partner Withdrawal' | 'Debtor Oil Given' | 'Other';
  description: string;
  amount: number;
}

export interface PersonEntryIncome {
  id: string;
  type: 'Lube Sale' | 'POS Commission' | 'Other';
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

export type ReportInclusionStatus = 'pending' | 'draft' | 'included';

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
  incomes: PersonEntryIncome[];
  total_income: number;
  net_payable: number;
  denominations: PersonEntryDenominations;
  total_cash: number;
  upi_received: number;
  total_collected: number;
  difference: number;
  deposited: boolean;
  report_inclusion_status: ReportInclusionStatus;
  report_id: string | null;
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
  incomes: PersonEntryIncome[];
  total_income: number;
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

export async function listAllPersonEntries(): Promise<PersonEntryRecord[]> {
  const { data, error } = await supabase
    .from('person_entries' as any)
    .select('*')
    .order('entry_date', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []) as unknown as PersonEntryRecord[];
}

/**
 * Rule 1: lock opening reading to the most recent closing reading
 * recorded for that nozzle across ALL time / all entries.
 */
export async function getLastClosingForNozzle(nozzleId: string): Promise<{
  closing_reading: number;
  entry_date: string;
  nozzle_man_name: string;
} | null> {
  const { data, error } = await supabase
    .from('person_entries' as any)
    .select('closing_reading, entry_date, nozzle_man_name, created_at')
    .eq('nozzle_id', nozzleId)
    .order('entry_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const row = data as any;
  return {
    closing_reading: Number(row.closing_reading) || 0,
    entry_date: row.entry_date,
    nozzle_man_name: row.nozzle_man_name,
  };
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

// =========================================================================
// Daily Sales Reports
// =========================================================================

export interface DailySalesReport {
  id: string;
  client_id: string;
  report_date: string;
  confirmed: boolean;
  entry_ids: string[];
  totals: Record<string, number>;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export async function getReportForDate(reportDate: string): Promise<DailySalesReport | null> {
  const { data, error } = await supabase
    .from('daily_sales_reports' as any)
    .select('*')
    .eq('report_date', reportDate)
    .maybeSingle();
  if (error) throw error;
  return (data as unknown as DailySalesReport) || null;
}

export async function listReports(): Promise<DailySalesReport[]> {
  const { data, error } = await supabase
    .from('daily_sales_reports' as any)
    .select('*')
    .order('report_date', { ascending: false });
  if (error) throw error;
  return (data || []) as unknown as DailySalesReport[];
}

function sumTotals(entries: PersonEntryRecord[]) {
  const t = {
    liters_sold: 0,
    gross_amount: 0,
    total_expenses: 0,
    net_payable: 0,
    total_cash: 0,
    upi_received: 0,
    total_collected: 0,
    difference: 0,
  };
  for (const e of entries) {
    t.liters_sold += Number(e.liters_sold) || 0;
    t.gross_amount += Number(e.gross_amount) || 0;
    t.total_expenses += Number(e.total_expenses) || 0;
    t.net_payable += Number(e.net_payable) || 0;
    t.total_cash += Number(e.total_cash) || 0;
    t.upi_received += Number(e.upi_received) || 0;
    t.total_collected += Number(e.total_collected) || 0;
    t.difference += Number(e.difference) || 0;
  }
  return t;
}

/**
 * Create or update a daily sales report. Rule 4 logic:
 *  - report_date = latest entry_date in selection
 *  - if confirmed report exists for that date → block
 *  - if draft report exists → merge entries into it
 */
export async function saveDailySalesReport(params: {
  clientId: string;
  entries: PersonEntryRecord[];
  confirm: boolean;
  notes?: string;
}): Promise<{ report: DailySalesReport; merged: boolean }> {
  const { clientId, entries, confirm, notes } = params;
  if (entries.length === 0) throw new Error('No entries selected');

  // Rule 4: report date = latest entry_date
  const reportDate = entries
    .map((e) => e.entry_date)
    .sort()
    .reverse()[0];

  const existing = await getReportForDate(reportDate);
  if (existing && existing.confirmed) {
    throw new Error(
      `A confirmed report already exists for ${reportDate}. You cannot create another report for the same date.`
    );
  }

  const newIds = entries.map((e) => e.id);
  const merged = !!existing;
  const allIds = existing
    ? Array.from(new Set([...(existing.entry_ids || []), ...newIds]))
    : newIds;

  // Fetch totals over ALL ids (including any pre-existing)
  const { data: allEntries, error: feErr } = await supabase
    .from('person_entries' as any)
    .select('*')
    .in('id', allIds);
  if (feErr) throw feErr;
  const totals = sumTotals((allEntries || []) as unknown as PersonEntryRecord[]);

  let report: DailySalesReport;
  if (existing) {
    const { data, error } = await supabase
      .from('daily_sales_reports' as any)
      .update({
        entry_ids: allIds,
        totals,
        confirmed: confirm,
        notes: notes ?? existing.notes,
      })
      .eq('id', existing.id)
      .select()
      .single();
    if (error) throw error;
    report = data as unknown as DailySalesReport;
  } else {
    const { data, error } = await supabase
      .from('daily_sales_reports' as any)
      .insert({
        client_id: clientId,
        report_date: reportDate,
        entry_ids: allIds,
        totals,
        confirmed: confirm,
        notes: notes ?? null,
      })
      .select()
      .single();
    if (error) throw error;
    report = data as unknown as DailySalesReport;
  }

  // Update inclusion status on entries
  const newStatus = confirm ? 'included' : 'draft';
  const { error: upErr } = await supabase
    .from('person_entries' as any)
    .update({ report_inclusion_status: newStatus, report_id: report.id })
    .in('id', allIds);
  if (upErr) throw upErr;

  return { report, merged };
}

export async function getEntriesForReport(reportId: string): Promise<PersonEntryRecord[]> {
  const { data, error } = await supabase
    .from('person_entries' as any)
    .select('*')
    .eq('report_id', reportId)
    .order('entry_date', { ascending: false });
  if (error) throw error;
  return (data || []) as unknown as PersonEntryRecord[];
}

export async function unlockReport(reportId: string): Promise<void> {
  // Reset all entries back to pending
  const { error: upErr } = await supabase
    .from('person_entries' as any)
    .update({ report_inclusion_status: 'pending', report_id: null })
    .eq('report_id', reportId);
  if (upErr) throw upErr;
  // Delete the report row
  const { error: delErr } = await supabase
    .from('daily_sales_reports' as any)
    .delete()
    .eq('id', reportId);
  if (delErr) throw delErr;
}
