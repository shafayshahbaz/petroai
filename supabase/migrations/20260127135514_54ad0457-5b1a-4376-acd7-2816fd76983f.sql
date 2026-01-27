-- Enable realtime for all business data tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.tanks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.nozzles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.debtors;
ALTER PUBLICATION supabase_realtime ADD TABLE public.purchases;
ALTER PUBLICATION supabase_realtime ADD TABLE public.daily_entries;
ALTER PUBLICATION supabase_realtime ADD TABLE public.client_settings;