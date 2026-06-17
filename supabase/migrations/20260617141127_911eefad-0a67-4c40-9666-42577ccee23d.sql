
-- Opening cash in hand (one-time, carried forward)
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS opening_cash_in_hand numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS opening_cash_set_at timestamptz;

-- Per-nozzle opening reading (one-time, used as opening when no history exists)
ALTER TABLE public.nozzles
  ADD COLUMN IF NOT EXISTS opening_reading numeric NOT NULL DEFAULT 0;

-- Default product rates (one-time per product, carry forward when no daily rate set)
ALTER TABLE public.client_settings
  ADD COLUMN IF NOT EXISTS default_rates jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Distinguish bank deposit vs cash transfer (someone paid into bank, we gave them cash)
-- Both reduce cash in hand.
ALTER TABLE public.bank_deposits
  ADD COLUMN IF NOT EXISTS transaction_type text NOT NULL DEFAULT 'deposit';

ALTER TABLE public.bank_deposits
  DROP CONSTRAINT IF EXISTS bank_deposits_transaction_type_check;
ALTER TABLE public.bank_deposits
  ADD CONSTRAINT bank_deposits_transaction_type_check
  CHECK (transaction_type IN ('deposit','cash_transfer'));
