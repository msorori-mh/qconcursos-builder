
-- 1. Fix certificates INSERT: only allow system (trigger) and admins, not regular users
DROP POLICY IF EXISTS "System can insert certificates" ON public.certificates;
CREATE POLICY "Only admins can insert certificates"
ON public.certificates FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 2. Add admin SELECT on user_progress for reports dashboard
CREATE POLICY "Admins can view all progress"
ON public.user_progress FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- 3. Fix payment_requests INSERT: restrict to authenticated only
DROP POLICY IF EXISTS "Users can insert own payment requests" ON public.payment_requests;
CREATE POLICY "Users can insert own payment requests"
ON public.payment_requests FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- 4. Fix subscriptions INSERT: restrict to authenticated only  
DROP POLICY IF EXISTS "Users can insert own subscriptions" ON public.subscriptions;
CREATE POLICY "Users can insert own subscriptions"
ON public.subscriptions FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- 5. Fix payment_requests SELECT: restrict to authenticated only
DROP POLICY IF EXISTS "Users can view own payment requests" ON public.payment_requests;
CREATE POLICY "Users can view own payment requests"
ON public.payment_requests FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- 6. Fix subscriptions SELECT: restrict to authenticated only
DROP POLICY IF EXISTS "Users can view own subscriptions" ON public.subscriptions;
CREATE POLICY "Users can view own subscriptions"
ON public.subscriptions FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- 7. Fix profiles INSERT: restrict to authenticated only
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
ON public.profiles FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- 8. Fix profiles UPDATE: restrict to authenticated only
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE TO authenticated
USING (auth.uid() = user_id);

-- 9. Fix profiles SELECT (own): restrict to authenticated only
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT TO authenticated
USING (auth.uid() = user_id);
