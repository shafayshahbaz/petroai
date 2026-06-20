import { format, parseISO } from 'date-fns';
import { formatRupees, formatLiters } from '@/lib/format';
import { PersonEntryRecord } from '@/services/personEntryService';

const PRODUCT_LABEL: Record<string, string> = {
  MS: 'Petrol (MS)',
  HSD: 'Diesel (HSD)',
  POWER: 'Power',
};

export interface DipReportRow {
  tank_name: string;
  fuel_type: string;
  dip_reading: number;
  dip_liters: number | null;
  system_liters: number | null;
  variance: number | null;
}

export interface SalesReportData {
  reportDate: string;
  entries: PersonEntryRecord[];
  totals: {
    liters: number; gross: number; expenses: number; income: number; net: number;
    cash: number; upi: number; collected: number;
    d500: number; d200: number; d100: number; d50: number; d20: number; d10: number; coins: number;
  };
  bankDeposited: number;
  netCashInHand: number;
  businessName?: string;
  dipReadings?: DipReportRow[];
}

/**
 * A4-friendly printable sales report. Used in the View dialog and as the
 * body of the downloaded standalone HTML file.
 */
export function SalesReportPrintable({ data }: { data: SalesReportData }) {
  const { reportDate, entries, totals, bankDeposited, netCashInHand, businessName } = data;

  // Group by product for fuel-sales summary
  const byProduct = entries.reduce<Record<string, { liters: number; gross: number }>>(
    (acc, e) => {
      const p = e.product || 'OTHER';
      if (!acc[p]) acc[p] = { liters: 0, gross: 0 };
      acc[p].liters += Number(e.liters_sold) || 0;
      acc[p].gross += Number(e.gross_amount) || 0;
      return acc;
    },
    {}
  );

  return (
    <div className="bg-white text-black p-6 print:p-4" style={{ fontFamily: 'Arial, sans-serif' }}>
      <div className="text-center border-b-2 border-black pb-3 mb-4">
        <h1 className="text-2xl font-bold">{businessName || 'Daily Sales Report'}</h1>
        <p className="text-sm">
          Report Date: <b>{format(parseISO(reportDate), 'dd MMM yyyy')}</b>
        </p>
      </div>

      {/* Per-product summary */}
      <h2 className="text-base font-bold mt-2 mb-1">Fuel Sales Summary</h2>
      <table className="w-full text-xs border border-black border-collapse mb-4">
        <thead>
          <tr className="bg-gray-200">
            <th className="border border-black px-2 py-1 text-left">Product</th>
            <th className="border border-black px-2 py-1 text-right">Liters</th>
            <th className="border border-black px-2 py-1 text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(byProduct).map(([p, v]) => (
            <tr key={p}>
              <td className="border border-black px-2 py-1">{PRODUCT_LABEL[p] || p}</td>
              <td className="border border-black px-2 py-1 text-right">{formatLiters(v.liters)}</td>
              <td className="border border-black px-2 py-1 text-right">{formatRupees(v.gross)}</td>
            </tr>
          ))}
          <tr className="font-bold bg-gray-100">
            <td className="border border-black px-2 py-1">Total</td>
            <td className="border border-black px-2 py-1 text-right">{formatLiters(totals.liters)}</td>
            <td className="border border-black px-2 py-1 text-right">{formatRupees(totals.gross)}</td>
          </tr>
        </tbody>
      </table>

      {/* Per-entry detail */}
      <h2 className="text-base font-bold mt-2 mb-1">Shift Entries</h2>
      <table className="w-full text-[11px] border border-black border-collapse mb-4">
        <thead>
          <tr className="bg-gray-200">
            <th className="border border-black px-2 py-1 text-left">Nozzle Man</th>
            <th className="border border-black px-2 py-1 text-left">Nozzle</th>
            <th className="border border-black px-2 py-1 text-left">Product</th>
            <th className="border border-black px-2 py-1 text-right">Open</th>
            <th className="border border-black px-2 py-1 text-right">Close</th>
            <th className="border border-black px-2 py-1 text-right">Liters</th>
            <th className="border border-black px-2 py-1 text-right">Rate</th>
            <th className="border border-black px-2 py-1 text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e) => (
            <tr key={e.id}>
              <td className="border border-black px-2 py-1">{e.nozzle_man_name}</td>
              <td className="border border-black px-2 py-1">{e.nozzle_label}</td>
              <td className="border border-black px-2 py-1">{PRODUCT_LABEL[e.product] || e.product}</td>
              <td className="border border-black px-2 py-1 text-right">{e.opening_reading}</td>
              <td className="border border-black px-2 py-1 text-right">{e.closing_reading}</td>
              <td className="border border-black px-2 py-1 text-right">{formatLiters(e.liters_sold)}</td>
              <td className="border border-black px-2 py-1 text-right">{formatRupees(e.rate)}</td>
              <td className="border border-black px-2 py-1 text-right">{formatRupees(e.gross_amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Cash denomination */}
      <h2 className="text-base font-bold mt-2 mb-1">Cash Denomination Summary</h2>
      <table className="w-full text-xs border border-black border-collapse mb-4">
        <thead>
          <tr className="bg-gray-200">
            <th className="border border-black px-2 py-1 text-left">Denomination</th>
            <th className="border border-black px-2 py-1 text-right">Count</th>
            <th className="border border-black px-2 py-1 text-right">Value</th>
          </tr>
        </thead>
        <tbody>
          {([
            ['Rs. 500', totals.d500, 500],
            ['Rs. 200', totals.d200, 200],
            ['Rs. 100', totals.d100, 100],
            ['Rs. 50', totals.d50, 50],
            ['Rs. 20', totals.d20, 20],
            ['Rs. 10', totals.d10, 10],
          ] as const).map(([label, count, note]) => (
            <tr key={label}>
              <td className="border border-black px-2 py-1">{label}</td>
              <td className="border border-black px-2 py-1 text-right">{count}</td>
              <td className="border border-black px-2 py-1 text-right">{formatRupees(count * note)}</td>
            </tr>
          ))}
          <tr>
            <td className="border border-black px-2 py-1">Coins</td>
            <td className="border border-black px-2 py-1 text-right">—</td>
            <td className="border border-black px-2 py-1 text-right">{formatRupees(totals.coins)}</td>
          </tr>
          <tr className="font-bold bg-gray-100">
            <td className="border border-black px-2 py-1" colSpan={2}>Total Cash</td>
            <td className="border border-black px-2 py-1 text-right">{formatRupees(totals.cash)}</td>
          </tr>
        </tbody>
      </table>

      {/* Final settlement */}
      <h2 className="text-base font-bold mt-2 mb-1">Settlement</h2>
      <table className="w-full text-xs border border-black border-collapse">
        <tbody>
          <Row label="Gross Sales" value={formatRupees(totals.gross)} />
          <Row label="Additional Income" value={formatRupees(totals.income)} />
          <Row label="Total Deductions" value={`- ${formatRupees(totals.expenses)}`} />
          <Row label="Net Payable" value={formatRupees(totals.net)} bold />
          <Row label="Total Cash Collected" value={formatRupees(totals.cash)} />
          <Row label="Total UPI Collected" value={formatRupees(totals.upi)} />
          <Row label="Total Collected" value={formatRupees(totals.collected)} bold />
          <Row label="Bank Deposited Today" value={formatRupees(bankDeposited)} />
          <Row label="Net Cash in Hand (carries forward)" value={formatRupees(netCashInHand)} bold accent />
        </tbody>
      </table>

      {data.dipReadings && data.dipReadings.length > 0 && (
        <>
          <h2 className="text-base font-bold mt-4 mb-1">Tank Dip Readings</h2>
          <table className="w-full text-xs border border-black border-collapse mb-4">
            <thead>
              <tr className="bg-gray-200">
                <th className="border border-black px-2 py-1 text-left">Tank</th>
                <th className="border border-black px-2 py-1 text-left">Fuel</th>
                <th className="border border-black px-2 py-1 text-right">Dip (cm)</th>
                <th className="border border-black px-2 py-1 text-right">Dip Liters</th>
                <th className="border border-black px-2 py-1 text-right">System Liters</th>
                <th className="border border-black px-2 py-1 text-right">Variance</th>
              </tr>
            </thead>
            <tbody>
              {data.dipReadings.map((d, i) => (
                <tr key={i}>
                  <td className="border border-black px-2 py-1">{d.tank_name}</td>
                  <td className="border border-black px-2 py-1">{d.fuel_type}</td>
                  <td className="border border-black px-2 py-1 text-right">{d.dip_reading}</td>
                  <td className="border border-black px-2 py-1 text-right">{d.dip_liters != null ? formatLiters(d.dip_liters) : '—'}</td>
                  <td className="border border-black px-2 py-1 text-right">{d.system_liters != null ? formatLiters(d.system_liters) : '—'}</td>
                  <td className="border border-black px-2 py-1 text-right">{d.variance != null ? formatLiters(d.variance) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      <div className="mt-6 text-[10px] text-gray-600 text-center">
        Generated on {format(new Date(), 'dd MMM yyyy, HH:mm')}
      </div>
    </div>
  );
}

function Row({ label, value, bold, accent }: { label: string; value: string; bold?: boolean; accent?: boolean }) {
  return (
    <tr className={accent ? 'bg-yellow-100' : ''}>
      <td className={`border border-black px-2 py-1 ${bold ? 'font-bold' : ''}`}>{label}</td>
      <td className={`border border-black px-2 py-1 text-right ${bold ? 'font-bold' : ''}`}>{value}</td>
    </tr>
  );
}

/**
 * Generate a fully self-contained HTML string the user can download
 * and open / print offline.
 */
export function buildPrintableHtml(data: SalesReportData): string {
  const { reportDate, entries, totals, bankDeposited, netCashInHand, businessName } = data;

  const byProduct = entries.reduce<Record<string, { liters: number; gross: number }>>(
    (acc, e) => {
      const p = e.product || 'OTHER';
      if (!acc[p]) acc[p] = { liters: 0, gross: 0 };
      acc[p].liters += Number(e.liters_sold) || 0;
      acc[p].gross += Number(e.gross_amount) || 0;
      return acc;
    },
    {}
  );

  const fmtR = (n: number) => formatRupees(n);
  const fmtL = (n: number) => formatLiters(n);

  const productRows = Object.entries(byProduct)
    .map(
      ([p, v]) => `<tr>
        <td>${PRODUCT_LABEL[p] || p}</td>
        <td class="r">${fmtL(v.liters)}</td>
        <td class="r">${fmtR(v.gross)}</td>
      </tr>`
    )
    .join('');

  const entryRows = entries
    .map(
      (e) => `<tr>
        <td>${escapeHtml(e.nozzle_man_name)}</td>
        <td>${escapeHtml(e.nozzle_label)}</td>
        <td>${PRODUCT_LABEL[e.product] || e.product}</td>
        <td class="r">${e.opening_reading}</td>
        <td class="r">${e.closing_reading}</td>
        <td class="r">${fmtL(e.liters_sold)}</td>
        <td class="r">${fmtR(e.rate)}</td>
        <td class="r">${fmtR(e.gross_amount)}</td>
      </tr>`
    )
    .join('');

  const denomRows = [
    ['Rs. 500', totals.d500, 500],
    ['Rs. 200', totals.d200, 200],
    ['Rs. 100', totals.d100, 100],
    ['Rs. 50', totals.d50, 50],
    ['Rs. 20', totals.d20, 20],
    ['Rs. 10', totals.d10, 10],
  ]
    .map(
      ([label, count, note]) => `<tr>
        <td>${label}</td>
        <td class="r">${count}</td>
        <td class="r">${fmtR((count as number) * (note as number))}</td>
      </tr>`
    )
    .join('');

  return `<!DOCTYPE html>
<html><head>
<meta charset="utf-8" />
<title>Daily Sales Report – ${format(parseISO(reportDate), 'dd MMM yyyy')}</title>
<style>
  body { font-family: Arial, sans-serif; color: #000; padding: 24px; }
  h1 { text-align: center; margin: 0 0 4px; }
  h2 { font-size: 14px; margin: 16px 0 6px; }
  .head { text-align: center; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 12px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th, td { border: 1px solid #000; padding: 4px 6px; }
  th { background: #e5e5e5; text-align: left; }
  .r { text-align: right; }
  .bold td { font-weight: bold; background: #f4f4f4; }
  .accent td { background: #fff3a8; font-weight: bold; }
  .meta { text-align: center; font-size: 10px; color: #555; margin-top: 18px; }
  @media print { body { padding: 0; } }
</style>
</head><body>
  <div class="head">
    <h1>${escapeHtml(businessName || 'Daily Sales Report')}</h1>
    <div>Report Date: <b>${format(parseISO(reportDate), 'dd MMM yyyy')}</b></div>
  </div>

  <h2>Fuel Sales Summary</h2>
  <table>
    <thead><tr><th>Product</th><th class="r">Liters</th><th class="r">Amount</th></tr></thead>
    <tbody>
      ${productRows}
      <tr class="bold"><td>Total</td><td class="r">${fmtL(totals.liters)}</td><td class="r">${fmtR(totals.gross)}</td></tr>
    </tbody>
  </table>

  <h2>Shift Entries</h2>
  <table>
    <thead><tr>
      <th>Nozzle Man</th><th>Nozzle</th><th>Product</th>
      <th class="r">Open</th><th class="r">Close</th><th class="r">Liters</th>
      <th class="r">Rate</th><th class="r">Amount</th>
    </tr></thead>
    <tbody>${entryRows}</tbody>
  </table>

  <h2>Cash Denomination Summary</h2>
  <table>
    <thead><tr><th>Denomination</th><th class="r">Count</th><th class="r">Value</th></tr></thead>
    <tbody>
      ${denomRows}
      <tr><td>Coins</td><td class="r">—</td><td class="r">${fmtR(totals.coins)}</td></tr>
      <tr class="bold"><td colspan="2">Total Cash</td><td class="r">${fmtR(totals.cash)}</td></tr>
    </tbody>
  </table>

  <h2>Settlement</h2>
  <table>
    <tbody>
      <tr><td>Gross Sales</td><td class="r">${fmtR(totals.gross)}</td></tr>
      <tr><td>Additional Income</td><td class="r">${fmtR(totals.income)}</td></tr>
      <tr><td>Total Deductions</td><td class="r">- ${fmtR(totals.expenses)}</td></tr>
      <tr class="bold"><td>Net Payable</td><td class="r">${fmtR(totals.net)}</td></tr>
      <tr><td>Total Cash Collected</td><td class="r">${fmtR(totals.cash)}</td></tr>
      <tr><td>Total UPI Collected</td><td class="r">${fmtR(totals.upi)}</td></tr>
      <tr class="bold"><td>Total Collected</td><td class="r">${fmtR(totals.collected)}</td></tr>
      <tr><td>Bank Deposited Today</td><td class="r">${fmtR(bankDeposited)}</td></tr>
      <tr class="accent"><td>Net Cash in Hand (carries forward)</td><td class="r">${fmtR(netCashInHand)}</td></tr>
    </tbody>
  </table>

  <div class="meta">Generated on ${format(new Date(), 'dd MMM yyyy, HH:mm')}</div>
  <script>setTimeout(function(){ try { window.print(); } catch(e) {} }, 300);</script>
</body></html>`;
}

function escapeHtml(s: string) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
