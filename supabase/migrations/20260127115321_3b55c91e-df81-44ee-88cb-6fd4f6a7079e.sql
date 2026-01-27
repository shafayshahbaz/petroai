-- Fix 1: Update handle_new_user() to NEVER trust user_metadata for role assignment
-- This prevents privilege escalation attacks
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Always assign pump_owner role by default
  -- Super admins must be created through secure admin process with service role
  INSERT INTO public.profiles (user_id, full_name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.email,
    'pump_owner'  -- ALWAYS default to pump_owner, never trust user input
  );
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id,
    'pump_owner'  -- ALWAYS default to pump_owner, never trust user input
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fix 2: Drop existing permissive policies and create restrictive ones
-- Profiles table - require authentication
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Super admins can view all profiles" ON public.profiles;

CREATE POLICY "Authenticated users can view own profile" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Super admins can view all profiles" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (is_super_admin());

-- Clients table - require authentication  
DROP POLICY IF EXISTS "Clients can view own data" ON public.clients;
DROP POLICY IF EXISTS "Super admins can view all clients" ON public.clients;

CREATE POLICY "Authenticated clients can view own data" 
ON public.clients 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Super admins can view all clients" 
ON public.clients 
FOR SELECT 
TO authenticated
USING (is_super_admin());

-- User roles table - require authentication
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Super admins can view all roles" ON public.user_roles;

CREATE POLICY "Authenticated users can view own roles" 
ON public.user_roles 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Super admins can view all roles" 
ON public.user_roles 
FOR SELECT 
TO authenticated
USING (is_super_admin());