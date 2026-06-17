
# Plan: Person Entry, Staff Management & Dashboard Upgrade

Keep the existing Daily Entry, Sales Report, Purchase, Debtors, Stock, and sidebar untouched. Layer new functionality on top, all persisted in Supabase with RLS scoped to the authenticated client.

## 1. Database (one migration)

New tables in `public` with RLS via `get_current_client_id()`:

- **nozzle_men** — `id, client_id, name, active, created_at, updated_at`
- **person_entries** — one row per nozzle-man shift settlement
  - `id, client_id, entry_date, nozzle_man_id, nozzle_id (text N1..N8 or link to nozzles.id), product (MS|HSD|POWER), opening_reading, closing_reading, rate, gross_amount, expenses jsonb (array of {type, description, amount}), total_expenses, net_payable, denominations jsonb ({d500,d200,d100,d50,d20,d10,coins}), total_cash, upi_received, total_collected, difference, deposited boolean default false, created_at, updated_at`
- **fuel_rates_daily** — `id, client_id, rate_date, product, rate, unique(client_id, rate_date, product)` — stores today's rate per product so Person Entry auto-fills it.

All tables: GRANT to authenticated + service_role, RLS policies on `client_id = get_current_client_id()`, update_updated_at trigger.

## 2. Settings — Staff section

Add a new "Staff / Nozzle Men" card on `/settings`:
- List existing nozzle men with edit/delete (soft delete via `active=false` if referenced)
- "Add Nozzle Man" button → modal with Name field
- Persisted to `nozzle_men` table

## 3. Person Entry screen (NEW)

New route `/person-entry`, added to sidebar between Daily Entry and Sales Report (label "Person Entry").

Layout (mobile-first, reactive):
- Date selector (default today)
- Nozzle Man dropdown (loads from `nozzle_men`) with inline "+ Add new" → modal
- Nozzle dropdown (loads existing nozzles from Stock; uses configured nozzle number + fuel type — respects current N1..N8 / petrol-diesel-power mapping)
- Opening / Closing reading inputs → live "Total Liters Sold"
- Rate input pre-filled from `fuel_rates_daily` for the selected date+product; editing it upserts the rate for that day → live "Gross Sales Amount"
- Expenses section: rows of {Type dropdown [Pump Expense / Partner Withdrawal / Debtor Oil Given / Other], Description, Amount} + delete per row, running total
- Net Amount Payable (large, prominent)
- Cash Denomination block: 500/200/100/50/20/10 (qty × value live) + coins amount → Total Cash
- UPI Received → Total Collected
- Difference indicator: green=0, blue>0, red<0
- Submit → save to `person_entries`, show summary card screenshot-friendly

All numbers use Indian formatting (`en-IN`) and `Rs.` prefix per project convention.

## 4. Dashboard upgrades

Keep existing dashboard layout/colors. Add three new sections above or alongside existing cards:

- **Stock Panel**: 3 animated liquid-fill tank visuals (Petrol/Diesel/Power) using SVG with CSS wave animation. Pulls per-fuel totals from existing `tanks` table. Below each: liters + reorder badge — compute 7-day avg consumption from `daily_entries` + `person_entries`; if `current_stock < avg × 3` show red "Place Order" badge with suggested liters (`avg × 7 − current`), else green "Stock OK".
- **Cash in Hand (Undeposited)** card: `previous_cash_in_hand + Σ(person_entries.total_cash where not deposited) − Σ(person_entries expenses where type in [Pump Expense, Partner Withdrawal, Debtor Oil Given])` per the user's formula. Uses today's previous closing as base.
- **Debtor Dues** card: total outstanding (sum from `debtors`), then list each debtor with balance, clicking navigates to `/debtors` (existing ledger).

## 5. Calculations / formatting

- Add `formatIndian(amount)` helper (en-IN grouping, `Rs.` prefix, 2 decimals) in `src/lib/format.ts` — reuse for new screens.
- Liters: 3 decimals (existing `formatReading`).

## Technical Notes

- New files: `supabase/migrations/<ts>_person_entries.sql`, `src/pages/PersonEntry.tsx`, `src/components/person-entry/*` (form, denomination input, expense rows, summary card), `src/components/settings/StaffSection.tsx`, `src/components/dashboard/LiquidTank.tsx`, `src/components/dashboard/CashInHandCard.tsx`, `src/components/dashboard/DebtorDuesCard.tsx`, `src/services/personEntryService.ts`, `src/services/staffService.ts`.
- Edits: `src/App.tsx` (add `/person-entry` route), `src/components/layout/AppSidebar.tsx` (nav item + translation key), `src/contexts/LanguageContext.tsx` (add keys), `src/pages/Settings.tsx` (mount StaffSection), `src/pages/Dashboard.tsx` (mount new cards), `src/lib/format.ts` (Indian-format helper).
- No changes to existing Daily Entry, Sales Report, Purchase, Debtors logic.
- All Supabase reads scoped by RLS; client_id resolved server-side via `get_current_client_id()`.

## What I'm NOT doing (per your answers)

- Not replacing existing Daily Entry / Sales Report / Purchase / Debtors screens.
- Not changing existing nozzles/tank setup in Stock.
- Not adding the new Sales Report CSV, Purchase variance, or Debtor ledger PDF flows from the long spec — your existing equivalents stay.

Confirm and I'll build it in this order: migration → staff settings → Person Entry → dashboard cards.
