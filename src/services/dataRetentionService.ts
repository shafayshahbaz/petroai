import { supabase } from '@/integrations/supabase/client';

export const RETENTION_DAYS = 15;

export interface RetentionPreview {
  cutoffDate: string;
  entriesToDelete: number;
  reportsToDelete: number;
  bankMovementsToDelete: number;
  newOpeningCash: number;
  currentOpeningCash: number;
  nozzleReadingsToRoll: { nozzle_id: string; nozzle_label: string; new_opening: number }[];
}

function cutoffISO(days = RETENTION_DAYS): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

/**
 * Computes what the cleanup would do without applying it.
 * Cash rollover formula:
 *   new_opening_cash = current_opening_cash
 *                    + Σ total_collected of INCLUDED person_entries with entry_date < cutoff
 *                    − Σ bank_deposits.amount with deposit_date < cutoff
 */
export async function previewRetentionRollover(clientId: string): Promise<RetentionPreview> {
  const cutoff = cutoffISO();

  const [clientRes, entriesRes, depositsRes, reportsRes, nozzlesRes] = await Promise.all([
    supabase.from('clients').select('opening_cash_in_hand').eq('id', clientId).maybeSingle(),
    supabase
      .from('person_entries')
      .select('id, nozzle_id, nozzle_label, closing_reading, entry_date, total_collected, report_inclusion_status')
      .eq('client_id', clientId)
      .lt('entry_date', cutoff),
    supabase
      .from('bank_deposits' as any)
      .select('id, amount, deposit_date')
      .eq('client_id', clientId)
      .lt('deposit_date', cutoff),
    supabase
      .from('daily_sales_reports' as any)
      .select('id, report_date')
      .eq('client_id', clientId)
      .lt('report_date', cutoff),
    supabase.from('nozzles').select('id, label, opening_reading').eq('client_id', clientId),
  ]);

  const currentOpeningCash = Number((clientRes.data as any)?.opening_cash_in_hand || 0);
  const entries = (entriesRes.data || []) as any[];
  const deposits = (depositsRes.data || []) as any[];
  const reports = (reportsRes.data || []) as any[];
  const nozzles = (nozzlesRes.data || []) as any[];

  const includedSales = entries
    .filter((e) => e.report_inclusion_status === 'included')
    .reduce((sum, e) => sum + Number(e.total_collected || 0), 0);
  const totalDeposits = deposits.reduce((sum, d) => sum + Number(d.amount || 0), 0);

  const newOpeningCash = Math.round((currentOpeningCash + includedSales - totalDeposits) * 100) / 100;

  // For each nozzle, find latest closing reading from entries being deleted
  const latestByNozzle = new Map<string, { reading: number; date: string; label: string }>();
  for (const e of entries) {
    if (!e.nozzle_id) continue;
    const cur = latestByNozzle.get(e.nozzle_id);
    if (!cur || e.entry_date > cur.date) {
      latestByNozzle.set(e.nozzle_id, {
        reading: Number(e.closing_reading || 0),
        date: e.entry_date,
        label: e.nozzle_label,
      });
    }
  }
  const nozzleReadingsToRoll: RetentionPreview['nozzleReadingsToRoll'] = [];
  for (const [nozzleId, info] of latestByNozzle) {
    const noz = nozzles.find((n) => n.id === nozzleId);
    const currentOpen = Number(noz?.opening_reading || 0);
    if (info.reading > currentOpen) {
      nozzleReadingsToRoll.push({
        nozzle_id: nozzleId,
        nozzle_label: noz?.label || info.label,
        new_opening: info.reading,
      });
    }
  }

  return {
    cutoffDate: cutoff,
    entriesToDelete: entries.length,
    reportsToDelete: reports.length,
    bankMovementsToDelete: deposits.length,
    newOpeningCash,
    currentOpeningCash,
    nozzleReadingsToRoll,
  };
}

/**
 * Performs the rollover + deletion. Stock on tanks is left untouched — it is
 * a running balance and already correct. Cash and nozzle opening readings are
 * snapshotted into clients/nozzles BEFORE the rows are deleted so nothing is lost.
 */
export async function runRetentionRollover(clientId: string): Promise<RetentionPreview> {
  const preview = await previewRetentionRollover(clientId);
  const cutoff = preview.cutoffDate;

  // 1) Update opening cash
  const { error: cashErr } = await supabase
    .from('clients')
    .update({
      opening_cash_in_hand: preview.newOpeningCash,
      opening_cash_set_at: new Date().toISOString(),
    } as any)
    .eq('id', clientId);
  if (cashErr) throw cashErr;

  // 2) Update each nozzle opening reading
  for (const n of preview.nozzleReadingsToRoll) {
    const { error } = await supabase
      .from('nozzles')
      .update({ opening_reading: n.new_opening } as any)
      .eq('id', n.nozzle_id);
    if (error) throw error;
  }

  // 3) Delete old rows (order: reports → entries → bank)
  await supabase.from('daily_sales_reports' as any).delete().eq('client_id', clientId).lt('report_date', cutoff);
  await supabase.from('person_entries').delete().eq('client_id', clientId).lt('entry_date', cutoff);
  await supabase.from('bank_deposits' as any).delete().eq('client_id', clientId).lt('deposit_date', cutoff);

  // 4) Mark last run timestamp on client_settings
  const { data: existing } = await supabase
    .from('client_settings' as any)
    .select('id')
    .eq('client_id', clientId)
    .maybeSingle();
  const payload: any = { last_retention_run: new Date().toISOString() };
  if (existing) {
    await supabase.from('client_settings' as any).update(payload).eq('client_id', clientId);
  } else {
    await supabase.from('client_settings' as any).insert({ client_id: clientId, ...payload });
  }

  return preview;
}

export async function getLastRetentionRun(clientId: string): Promise<string | null> {
  const { data } = await supabase
    .from('client_settings' as any)
    .select('last_retention_run')
    .eq('client_id', clientId)
    .maybeSingle();
  return (data as any)?.last_retention_run || null;
}
