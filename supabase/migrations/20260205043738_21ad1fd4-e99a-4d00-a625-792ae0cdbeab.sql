-- Create ledger_transactions table for tracking all account transactions
CREATE TABLE public.ledger_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  account_type TEXT NOT NULL CHECK (account_type IN ('debtor', 'bank', 'expense', 'cash', 'income')),
  account_id TEXT NOT NULL,
  account_name TEXT NOT NULL,
  transaction_date DATE NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('DEBIT', 'CREDIT')),
  amount NUMERIC NOT NULL DEFAULT 0,
  description TEXT NOT NULL,
  remarks TEXT,
  reference_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for fast lookups
CREATE INDEX idx_ledger_transactions_client_id ON public.ledger_transactions(client_id);
CREATE INDEX idx_ledger_transactions_account ON public.ledger_transactions(account_type, account_id);
CREATE INDEX idx_ledger_transactions_date ON public.ledger_transactions(transaction_date);

-- Enable RLS
ALTER TABLE public.ledger_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own ledger transactions"
  ON public.ledger_transactions FOR SELECT
  USING (client_id = get_current_client_id());

CREATE POLICY "Users can insert own ledger transactions"
  ON public.ledger_transactions FOR INSERT
  WITH CHECK (client_id = get_current_client_id());

CREATE POLICY "Users can update own ledger transactions"
  ON public.ledger_transactions FOR UPDATE
  USING (client_id = get_current_client_id());

CREATE POLICY "Users can delete own ledger transactions"
  ON public.ledger_transactions FOR DELETE
  USING (client_id = get_current_client_id());

CREATE POLICY "Super admins can view all ledger transactions"
  ON public.ledger_transactions FOR SELECT
  USING (is_super_admin());

-- Trigger to update updated_at
CREATE TRIGGER update_ledger_transactions_updated_at
  BEFORE UPDATE ON public.ledger_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();