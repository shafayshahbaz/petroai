
CREATE OR REPLACE FUNCTION public.get_current_client_id()
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT id FROM public.clients WHERE user_id = auth.uid() LIMIT 1
$function$;
