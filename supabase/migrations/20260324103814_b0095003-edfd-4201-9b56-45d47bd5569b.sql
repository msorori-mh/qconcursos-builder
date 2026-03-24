
-- Create a security definer function to check active subscription
CREATE OR REPLACE FUNCTION public.has_active_subscription(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions
    WHERE user_id = _user_id
      AND status = 'active'
      AND (expires_at IS NULL OR expires_at > now())
  )
$$;

-- Drop the old permissive policy for paid lessons
DROP POLICY IF EXISTS "Paid lessons viewable by subscribers" ON public.lessons;

-- Create new policy: paid lessons only for active subscribers
CREATE POLICY "Paid lessons viewable by active subscribers"
ON public.lessons FOR SELECT
TO authenticated
USING (
  is_free = true
  OR public.has_active_subscription(auth.uid())
  OR public.has_role(auth.uid(), 'admin')
);

-- Drop the old free lessons policy to avoid duplicate
DROP POLICY IF EXISTS "Free lessons viewable by everyone" ON public.lessons;
