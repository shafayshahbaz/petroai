-- Ensure RLS is enabled on profiles table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Ensure RLS is enabled on user_roles table  
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies on profiles to recreate them properly
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Super admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Super admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Super admins can insert profiles" ON public.profiles;

-- Drop existing policies on user_roles to recreate them properly
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Super admins can manage all roles" ON public.user_roles;

-- Create PERMISSIVE policies for profiles table (using OR logic)
CREATE POLICY "Users can view own profile" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Super admins can view all profiles" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (public.is_super_admin());

CREATE POLICY "Users can update own profile" 
ON public.profiles 
FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Super admins can update all profiles" 
ON public.profiles 
FOR UPDATE 
TO authenticated
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

CREATE POLICY "Super admins can insert profiles" 
ON public.profiles 
FOR INSERT 
TO authenticated
WITH CHECK (public.is_super_admin() OR auth.uid() = user_id);

-- Create PERMISSIVE policies for user_roles table
CREATE POLICY "Users can view own roles" 
ON public.user_roles 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Super admins can view all roles" 
ON public.user_roles 
FOR SELECT 
TO authenticated
USING (public.is_super_admin());

CREATE POLICY "Super admins can insert roles" 
ON public.user_roles 
FOR INSERT 
TO authenticated
WITH CHECK (public.is_super_admin());

CREATE POLICY "Super admins can update roles" 
ON public.user_roles 
FOR UPDATE 
TO authenticated
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

CREATE POLICY "Super admins can delete roles" 
ON public.user_roles 
FOR DELETE 
TO authenticated
USING (public.is_super_admin());