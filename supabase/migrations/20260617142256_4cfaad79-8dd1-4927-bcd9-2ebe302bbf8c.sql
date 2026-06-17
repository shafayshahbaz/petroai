ALTER TABLE public.client_settings
ADD COLUMN IF NOT EXISTS last_retention_run timestamptz;