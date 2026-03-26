
-- Remove materialized view from public API exposure
ALTER MATERIALIZED VIEW public.dashboard_stats SET SCHEMA extensions;
-- Re-grant and update function
DROP FUNCTION IF EXISTS public.refresh_dashboard_stats();
CREATE OR REPLACE FUNCTION public.refresh_dashboard_stats()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY extensions.dashboard_stats;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_dashboard_stats()
RETURNS TABLE(
  total_grades bigint,
  total_subjects bigint,
  total_lessons bigint,
  total_questions bigint,
  total_students bigint,
  pending_payments bigint,
  approved_payments bigint,
  rejected_payments bigint,
  total_revenue numeric,
  active_subscriptions bigint,
  pending_subscriptions bigint,
  expired_subscriptions bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT * FROM extensions.dashboard_stats LIMIT 1;
$$;
