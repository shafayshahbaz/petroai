import { format, parseISO } from 'date-fns';
import { formatRupees, formatLiters } from '@/lib/format';
import { PersonEntryRecord } from '@/services/personEntryService';

const PRODUCT_ORDER = ['MS', 'POWER', 'HSD'];
const PRODUCT_LABEL: Record<string, string> = {
  MS: 'MS',
  POWER: 'POWER',
  HSD: 'HSD',
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
  /** Combined bank-outflow total (kept for backwards compat). */
  bankDeposited: number;
  /** Individual bank deposits — render each as a separate ledger row. */
  bankDeposits?: { amount: number; label: string }[];
  /** Cash-transfer entries (someone took cash, paid into bank). Render each separately with remarks. */
  cashTransfers?: { amount: number; label: string }[];
  netCashInHand: number;
  businessName?: string;
  openingBalance?: number;
  dipReadings?: DipReportRow[];
  /** Optional: testing deduction per product (liters). Defaults to 0. */
  testingByProduct?: Record<string, number>;
  /** All registered nozzles (with last closing reading). Lets the report
   *  include nozzles with zero sales (opening = closing = last closing). */
  allNozzles?: { label: string; fuel_type: string; last_closing: number }[];
}

// ---------- helpers ----------

interface NozzleAgg {
  label: string;
  opening: number;
  closing: number;
  sales: number;
}
interface ProductAgg {
  product: string;
  nozzles: NozzleAgg[];
  totalSales: number;
  testing: number;
  netSales: number;
  rate: number; // weighted avg rate
  amount: number; // netSales * rate
}

function aggregate(data: SalesReportData): ProductAgg[] {
  const map: Record<
    string,
    {
      nozzles: Record<string, NozzleAgg>;
      weightedRateNum: number;
      litersTotal: number;
    }
  > = {};

  for (const e of data.entries) {
    const p = e.product || 'OTHER';
    if (!map[p]) map[p] = { nozzles: {}, weightedRateNum: 0, litersTotal: 0 };
    const key = e.nozzle_label || 'N';
    if (!map[p].nozzles[key]) {
      map[p].nozzles[key] = { label: key, opening: 0, closing: 0, sales: 0 };
    }
    const n = map[p].nozzles[key];
    // For multi-shift on same nozzle: keep earliest opening and latest closing
    // Approximate: smallest opening, largest closing
    n.opening = n.opening === 0 ? Number(e.opening_reading) : Math.min(n.opening, Number(e.opening_reading));
    n.closing = Math.max(n.closing, Number(e.closing_reading));
    n.sales = Math.round((n.closing - n.opening) * 100) / 100;
    map[p].weightedRateNum += Number(e.rate) * Number(e.liters_sold);
    map[p].litersTotal += Number(e.liters_sold);
  }

  const products = Object.keys(map).sort((a, b) => {
    const ia = PRODUCT_ORDER.indexOf(a);
    const ib = PRODUCT_ORDER.indexOf(b);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });

  return products.map((p) => {
    const nozzles = Object.values(map[p].nozzles);
    const totalSales = Math.round(nozzles.reduce((s, n) => s + n.sales, 0) * 1000) / 1000;
    const testing = Number(data.testingByProduct?.[p] || 0);
    const netSales = Math.round((totalSales - testing) * 1000) / 1000;
    const rate =
      map[p].litersTotal > 0
        ? Math.round((map[p].weightedRateNum / map[p].litersTotal) * 100) / 100
        : 0;
    const amount = Math.round(netSales * rate * 100) / 100;
    return { product: p, nozzles, totalSales, testing, netSales, rate, amount };
  });
}

function fmtNum(n: number, decimals = 2) {
  return n.toLocaleString('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}
function fmtInt(n: number) {
  return n.toLocaleString('en-IN');
}

// ============================================================
// React preview (mirrors the printable HTML)
// ============================================================
export function SalesReportPrintable({ data }: { data: SalesReportData }) {
  const products = aggregate(data);
  const opening = Number(data.openingBalance || 0);
  const productIncomeTotal = products.reduce((s, p) => s + p.amount, 0);

  // Other incomes (Lube etc.)
  const otherIncomes: { label: string; amount: number }[] = [];
  for (const e of data.entries) {
    for (const inc of e.incomes || []) {
      otherIncomes.push({
        label: inc.description || inc.type,
        amount: Number(inc.amount) || 0,
      });
    }
  }
  const otherIncomeTotal = otherIncomes.reduce((s, x) => s + x.amount, 0);

  // Expenses
  const expenses: { label: string; amount: number }[] = [];
  for (const e of data.entries) {
    for (const ex of e.expenses || []) {
      expenses.push({
        label: ex.description || ex.type,
        amount: Number(ex.amount) || 0,
      });
    }
  }
  const expenseTotal = expenses.reduce((s, x) => s + x.amount, 0);

  const leftTotal = opening + productIncomeTotal + otherIncomeTotal;
  const rightOps = data.bankDeposited + data.totals.upi + expenseTotal;
  const cashInHand = leftTotal - rightOps;
  const saleCash = data.totals.cash;
  const difference = cashInHand - saleCash;

  return (
    <div
      className="bg-white text-black p-6 print:p-4"
      style={{ fontFamily: 'Arial, sans-serif', fontSize: 12 }}
    >
      {/* Header */}
      <div className="text-center mb-4">
        <h1 className="text-xl font-bold uppercase tracking-wide">
          {data.businessName || 'Daily Sales Report'}
        </h1>
        <div className="text-sm font-semibold mt-1">
          {format(parseISO(data.reportDate), 'dd MMM yyyy')}
        </div>
      </div>

      {/* Product blocks */}
      {products.map((p) => (
        <ProductBlock key={p.product} agg={p} />
      ))}

      {/* Two-column ledger */}
      <div className="mt-6 border-t-2 border-black pt-3">
        <div className="grid grid-cols-2 gap-6">
          {/* LEFT: Incomes */}
          <div>
            <LedgerRow amount={opening} label="Opening Balance" />
            {products.map((p) => (
              <LedgerRow
                key={p.product}
                amount={p.amount}
                label={
                  <>
                    {p.product} <b>{fmtNum(p.netSales, p.product === 'POWER' || p.product === 'HSD' ? 3 : 2)}</b> x <b>@{fmtNum(p.rate)}</b>
                  </>
                }
              />
            ))}
            {otherIncomes.map((i, idx) => (
              <LedgerRow key={`oi-${idx}`} amount={i.amount} label={i.label} />
            ))}
            <LedgerRow amount={leftTotal} label="" bold />

            {/* Denomination */}
            <div className="mt-6">
              <div className="font-bold mb-1 text-sm">Cash Denomination</div>
              <table className="w-full text-xs border border-black border-collapse">
                <tbody>
                  {[
                    ['Rs. 500', data.totals.d500, 500],
                    ['Rs. 200', data.totals.d200, 200],
                    ['Rs. 100', data.totals.d100, 100],
                    ['Rs. 50', data.totals.d50, 50],
                    ['Rs. 20', data.totals.d20, 20],
                    ['Rs. 10', data.totals.d10, 10],
                  ].map(([label, count, note]) => (
                    <tr key={label as string}>
                      <td className="border border-black px-2 py-0.5">{label}</td>
                      <td className="border border-black px-2 py-0.5 text-right">{count as number}</td>
                      <td className="border border-black px-2 py-0.5 text-right">
                        {fmtInt((count as number) * (note as number))}
                      </td>
                    </tr>
                  ))}
                  <tr>
                    <td className="border border-black px-2 py-0.5">Coins</td>
                    <td className="border border-black px-2 py-0.5 text-right">—</td>
                    <td className="border border-black px-2 py-0.5 text-right">{fmtInt(data.totals.coins)}</td>
                  </tr>
                  <tr className="font-bold bg-gray-100">
                    <td className="border border-black px-2 py-0.5" colSpan={2}>Total Cash</td>
                    <td className="border border-black px-2 py-0.5 text-right">{fmtInt(saleCash)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* RIGHT: Expenses */}
          <div>
            <LedgerRow amount={data.bankDeposited} label="Cash Deposit (Bank)" />
            <LedgerRow amount={data.totals.upi} label="UPI / Phonepe (Combined)" />
            {expenses.map((x, idx) => (
              <LedgerRow key={`ex-${idx}`} amount={x.amount} label={x.label} />
            ))}
            <LedgerRow amount={rightOps} label="" bold />

            <LedgerRow amount={cashInHand} label="Cash In Hand" />
            <LedgerRow amount={leftTotal} label="" bold />

            <div className="mt-4 border-t border-black pt-2">
              <LedgerRow amount={saleCash} label="Sale Cash" />
              <LedgerRow amount={difference} label="Difference" />
              <LedgerRow amount={cashInHand} label="" bold />
            </div>
          </div>
        </div>
      </div>

      {/* Optional Dip section */}
      {data.dipReadings && data.dipReadings.length > 0 && (
        <div className="mt-6">
          <div className="font-bold text-sm mb-1">Tank Dip Readings</div>
          <table className="w-full text-xs border border-black border-collapse">
            <thead>
              <tr className="bg-gray-200">
                <th className="border border-black px-2 py-1 text-left">Tank</th>
                <th className="border border-black px-2 py-1 text-left">Fuel</th>
                <th className="border border-black px-2 py-1 text-right">Dip (cm)</th>
                <th className="border border-black px-2 py-1 text-right">Dip Liters</th>
                <th className="border border-black px-2 py-1 text-right">System</th>
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
        </div>
      )}

      <div className="mt-6 text-[10px] text-gray-600 text-center">
        Generated on {format(new Date(), 'dd MMM yyyy, HH:mm')}
      </div>
    </div>
  );
}

function ProductBlock({ agg }: { agg: ProductAgg }) {
  const dec = agg.product === 'POWER' || agg.product === 'HSD' ? 3 : 2;
  return (
    <div className="border-t border-black pt-2 mb-4">
      <div className="text-center font-bold text-base mb-2">{PRODUCT_LABEL[agg.product] || agg.product}</div>
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr>
            <th className="text-left w-40"></th>
            {agg.nozzles.map((n) => (
              <th key={n.label} className="text-right px-2 py-0.5 font-semibold">{n.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="py-0.5">Opening Reading</td>
            {agg.nozzles.map((n) => (
              <td key={n.label} className="text-right px-2 py-0.5">{fmtNum(n.opening, dec)}</td>
            ))}
          </tr>
          <tr>
            <td className="py-0.5">Closing Reading</td>
            {agg.nozzles.map((n) => (
              <td key={n.label} className="text-right px-2 py-0.5 border-b border-black">{fmtNum(n.closing, dec)}</td>
            ))}
          </tr>
          <tr>
            <td className="py-0.5 text-right font-bold pr-2">SALES</td>
            {agg.nozzles.map((n) => (
              <td key={n.label} className="text-right px-2 py-0.5 font-semibold">{fmtNum(n.sales, dec)}</td>
            ))}
          </tr>
        </tbody>
      </table>
      <div className="mt-2 flex items-center gap-3 text-xs">
        <span className="font-semibold">TOTAL SALES =</span>
        <span>{fmtNum(agg.totalSales, dec)}</span>
        <span className="text-gray-700">-{fmtNum(agg.testing, dec)} Testing =</span>
        <span className="font-bold">{fmtNum(agg.netSales, dec)}</span>
      </div>
    </div>
  );
}

function LedgerRow({
  amount,
  label,
  bold,
}: {
  amount: number;
  label: React.ReactNode;
  bold?: boolean;
}) {
  return (
    <div className={`flex items-baseline gap-3 py-0.5 ${bold ? 'border-t border-black mt-1 pt-1 font-bold' : ''}`}>
      <div className="w-28 text-right tabular-nums border-b border-gray-400 pb-0.5">
        {fmtInt(Math.round(amount))}
      </div>
      <div className="flex-1 text-xs">{label}</div>
    </div>
  );
}

// ============================================================
// Standalone printable HTML (offline download / window print)
// ============================================================
export function buildPrintableHtml(data: SalesReportData): string {
  const products = aggregate(data);
  const opening = Number(data.openingBalance || 0);
  const productIncomeTotal = products.reduce((s, p) => s + p.amount, 0);

  const otherIncomes: { label: string; amount: number }[] = [];
  for (const e of data.entries) for (const inc of e.incomes || [])
    otherIncomes.push({ label: inc.description || inc.type, amount: Number(inc.amount) || 0 });
  const otherIncomeTotal = otherIncomes.reduce((s, x) => s + x.amount, 0);

  const expenses: { label: string; amount: number }[] = [];
  for (const e of data.entries) for (const ex of e.expenses || [])
    expenses.push({ label: ex.description || ex.type, amount: Number(ex.amount) || 0 });
  const expenseTotal = expenses.reduce((s, x) => s + x.amount, 0);

  const leftTotal = opening + productIncomeTotal + otherIncomeTotal;
  const rightOps = data.bankDeposited + data.totals.upi + expenseTotal;
  const cashInHand = leftTotal - rightOps;
  const saleCash = data.totals.cash;
  const difference = cashInHand - saleCash;

  const productBlocks = products
    .map((p) => {
      const dec = p.product === 'POWER' || p.product === 'HSD' ? 3 : 2;
      const headerCols = p.nozzles
        .map((n) => `<th class="r">${escapeHtml(n.label)}</th>`)
        .join('');
      const openRow = p.nozzles
        .map((n) => `<td class="r">${fmtNum(n.opening, dec)}</td>`)
        .join('');
      const closeRow = p.nozzles
        .map((n) => `<td class="r bb">${fmtNum(n.closing, dec)}</td>`)
        .join('');
      const salesRow = p.nozzles
        .map((n) => `<td class="r b">${fmtNum(n.sales, dec)}</td>`)
        .join('');
      return `
  <div class="prod">
    <div class="prod-name">${escapeHtml(PRODUCT_LABEL[p.product] || p.product)}</div>
    <table class="grid">
      <thead><tr><th></th>${headerCols}</tr></thead>
      <tbody>
        <tr><td>Opening Reading</td>${openRow}</tr>
        <tr><td>Closing Reading</td>${closeRow}</tr>
        <tr><td class="b ralabel">SALES</td>${salesRow}</tr>
      </tbody>
    </table>
    <div class="ts">
      <b>TOTAL SALES =</b> ${fmtNum(p.totalSales, dec)}
      &nbsp;&nbsp;-${fmtNum(p.testing, dec)} Testing =
      <b>${fmtNum(p.netSales, dec)}</b>
    </div>
  </div>`;
    })
    .join('');

  const ledgerRow = (amount: number, label: string, bold = false) => `
    <div class="lrow${bold ? ' lbold' : ''}">
      <div class="lamt">${fmtInt(Math.round(amount))}</div>
      <div class="llbl">${label}</div>
    </div>`;

  const leftRows =
    ledgerRow(opening, 'Opening Balance') +
    products
      .map((p) => {
        const dec = p.product === 'POWER' || p.product === 'HSD' ? 3 : 2;
        return ledgerRow(
          p.amount,
          `${escapeHtml(p.product)} <b>${fmtNum(p.netSales, dec)}</b> x <b>@${fmtNum(p.rate)}</b>`
        );
      })
      .join('') +
    otherIncomes.map((i) => ledgerRow(i.amount, escapeHtml(i.label))).join('') +
    ledgerRow(leftTotal, '', true);

  const rightRows =
    ledgerRow(data.bankDeposited, 'Cash Deposit (Bank)') +
    ledgerRow(data.totals.upi, 'UPI / Phonepe (Combined)') +
    expenses.map((x) => ledgerRow(x.amount, escapeHtml(x.label))).join('') +
    ledgerRow(rightOps, '', true) +
    ledgerRow(cashInHand, 'Cash In Hand') +
    ledgerRow(leftTotal, '', true) +
    `<div class="lsep"></div>` +
    ledgerRow(saleCash, 'Sale Cash') +
    ledgerRow(difference, 'Difference') +
    ledgerRow(cashInHand, '', true);

  const denomRows = [
    ['Rs. 500', data.totals.d500, 500],
    ['Rs. 200', data.totals.d200, 200],
    ['Rs. 100', data.totals.d100, 100],
    ['Rs. 50', data.totals.d50, 50],
    ['Rs. 20', data.totals.d20, 20],
    ['Rs. 10', data.totals.d10, 10],
  ]
    .map(
      ([label, count, note]) => `<tr>
        <td>${label}</td>
        <td class="r">${count as number}</td>
        <td class="r">${fmtInt((count as number) * (note as number))}</td>
      </tr>`
    )
    .join('');

  const dipBlock =
    data.dipReadings && data.dipReadings.length > 0
      ? `<div class="dip">
        <div class="prod-name" style="text-align:left;border:none;">Tank Dip Readings</div>
        <table class="bordered">
          <thead><tr><th>Tank</th><th>Fuel</th><th class="r">Dip (cm)</th><th class="r">Dip Liters</th><th class="r">System</th><th class="r">Variance</th></tr></thead>
          <tbody>
            ${data.dipReadings
              .map(
                (d) => `<tr>
              <td>${escapeHtml(d.tank_name)}</td>
              <td>${escapeHtml(d.fuel_type)}</td>
              <td class="r">${d.dip_reading}</td>
              <td class="r">${d.dip_liters != null ? formatLiters(d.dip_liters) : '—'}</td>
              <td class="r">${d.system_liters != null ? formatLiters(d.system_liters) : '—'}</td>
              <td class="r">${d.variance != null ? formatLiters(d.variance) : '—'}</td>
            </tr>`
              )
              .join('')}
          </tbody>
        </table>
      </div>`
      : '';

  return `<!DOCTYPE html>
<html><head>
<meta charset="utf-8" />
<title>${escapeHtml(data.businessName || 'Daily Sales Report')} – ${format(parseISO(data.reportDate), 'dd MMM yyyy')}</title>
<style>
  @page { size: A4; margin: 14mm; }
  body { font-family: Arial, sans-serif; color: #000; font-size: 12px; margin: 0; padding: 18px; }
  h1 { text-align: center; margin: 0; font-size: 18px; letter-spacing: .5px; text-transform: uppercase; }
  .date { text-align: center; font-weight: 600; margin: 4px 0 14px; }
  .prod { border-top: 1px solid #000; padding-top: 6px; margin-bottom: 14px; }
  .prod-name { text-align: center; font-weight: bold; font-size: 14px; margin-bottom: 6px; }
  table.grid { width: 100%; border-collapse: collapse; font-size: 12px; }
  table.grid th, table.grid td { padding: 2px 6px; }
  table.grid th { text-align: right; font-weight: 600; }
  table.grid th:first-child, table.grid td:first-child { text-align: left; width: 160px; }
  .r { text-align: right; }
  .b { font-weight: bold; }
  .bb { border-bottom: 1px solid #000; }
  .ralabel { text-align: right; padding-right: 8px; }
  .ts { margin-top: 6px; font-size: 12px; }
  .ledger { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; border-top: 2px solid #000; padding-top: 10px; margin-top: 12px; }
  .lrow { display: flex; align-items: baseline; gap: 12px; padding: 1px 0; }
  .lamt { width: 110px; text-align: right; border-bottom: 1px solid #888; padding-bottom: 1px; font-variant-numeric: tabular-nums; }
  .llbl { flex: 1; font-size: 12px; }
  .lbold { border-top: 1px solid #000; margin-top: 3px; padding-top: 3px; font-weight: bold; }
  .lbold .lamt { border-bottom: none; }
  .lsep { height: 8px; border-top: 1px solid #000; margin-top: 6px; }
  .denom { margin-top: 18px; }
  .denom .ttl { font-weight: bold; font-size: 12px; margin-bottom: 4px; }
  table.bordered { width: 100%; border-collapse: collapse; font-size: 11px; }
  table.bordered th, table.bordered td { border: 1px solid #000; padding: 3px 6px; }
  table.bordered th { background: #eee; text-align: left; }
  .dip { margin-top: 18px; }
  .meta { text-align: center; font-size: 10px; color: #555; margin-top: 18px; }
  @media print { body { padding: 0; } }
</style>
</head><body>
  <h1>${escapeHtml(data.businessName || 'Daily Sales Report')}</h1>
  <div class="date">${format(parseISO(data.reportDate), 'dd MMM yyyy')}</div>

  ${productBlocks}

  <div class="ledger">
    <div>
      ${leftRows}
      <div class="denom">
        <div class="ttl">Cash Denomination</div>
        <table class="bordered">
          <tbody>
            ${denomRows}
            <tr><td>Coins</td><td class="r">—</td><td class="r">${fmtInt(data.totals.coins)}</td></tr>
            <tr style="font-weight:bold;background:#f0f0f0;"><td colspan="2">Total Cash</td><td class="r">${fmtInt(saleCash)}</td></tr>
          </tbody>
        </table>
      </div>
    </div>
    <div>${rightRows}</div>
  </div>

  ${dipBlock}

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
