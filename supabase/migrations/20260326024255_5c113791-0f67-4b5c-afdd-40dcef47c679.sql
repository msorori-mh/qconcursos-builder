-- Allow service_role to manage user_roles (needed for edge function)
CREATE POLICY "Service role can manage user_roles"
ON public.user_roles
FOR ALL
TO public
USING (auth.role() = 'service_role'::text)
WITH CHECK (auth.role() = 'service_role'::text);