-- Drop existing profiles SELECT policies and recreate with proper PERMISSIVE policies
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

-- Create proper PERMISSIVE SELECT policies for profiles
-- Users can only view their own profile
CREATE POLICY "Users can view own profile" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (auth.uid() = id);

-- Admins can view all profiles (separate policy)
CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Ensure activity_logs is properly locked down
-- Drop any existing policies and recreate
DROP POLICY IF EXISTS "Admins can view activity logs" ON public.activity_logs;

-- Only admins can view activity logs (contains sensitive IP/user agent data)
CREATE POLICY "Only admins can view activity logs" 
ON public.activity_logs 
FOR SELECT 
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Ensure documents table has proper protection
-- Verify user can only access their own documents
DROP POLICY IF EXISTS "Users can view own documents" ON public.documents;
DROP POLICY IF EXISTS "Admins can view all documents" ON public.documents;

-- Users can only view their own documents
CREATE POLICY "Users can view own documents" 
ON public.documents 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

-- Admins can view all documents
CREATE POLICY "Admins can view all documents" 
ON public.documents 
FOR SELECT 
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));