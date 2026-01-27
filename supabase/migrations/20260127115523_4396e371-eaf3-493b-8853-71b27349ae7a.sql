-- Drop existing SELECT policies on profiles
DROP POLICY IF EXISTS "Authenticated users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Super admins can view all profiles" ON public.profiles;

-- Create strict RLS policies that REQUIRE authentication
-- Policy 1: Regular authenticated users can only see their own profile
CREATE POLICY "Users can view own profile" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

-- Policy 2: Super admins can view all profiles
CREATE POLICY "Super admins can view all profiles" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (is_super_admin());

-- Ensure RLS is enabled (it should already be, but confirm)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Also ensure anon role has NO access by not granting any policies to anon
-- The TO authenticated clause ensures only logged-in users can access