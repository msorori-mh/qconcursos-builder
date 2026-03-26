
-- Materialized View for dashboard statistics
CREATE MATERIALIZED VIEW IF NOT EXISTS public.dashboard_stats AS
SELECT
  (SELECT count(*) FROM public.grades) AS total_grades,
  (SELECT count(*) FROM public.subjects) AS total_subjects,
  (SELECT count(*) FROM public.lessons) AS total_lessons,
  (SELECT count(*) FROM public.questions) AS total_questions,
  (SELECT count(*) FROM public.profiles) AS total_students,
  (SELECT count(*) FROM public.payment_requests WHERE status = 'pending') AS pending_payments,
  (SELECT count(*) FROM public.payment_requests WHERE status = 'approved') AS approved_payments,
  (SELECT count(*) FROM public.payment_requests WHERE status = 'rejected') AS rejected_payments,
  (SELECT COALESCE(SUM(amount), 0) FROM public.payment_requests WHERE status = 'approved') AS total_revenue,
  (SELECT count(*) FROM public.subscriptions WHERE status = 'active') AS active_subscriptions,
  (SELECT count(*) FROM public.subscriptions WHERE status = 'pending') AS pending_subscriptions,
  (SELECT count(*) FROM public.subscriptions WHERE status = 'expired') AS expired_subscriptions;

-- Create unique index for concurrent refresh
CREATE UNIQUE INDEX IF NOT EXISTS dashboard_stats_single_row ON public.dashboard_stats ((1));

-- Function to refresh the materialized view
CREATE OR REPLACE FUNCTION public.refresh_dashboard_stats()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.dashboard_stats;
END;
$$;

-- Grant access to authenticated users (admins will use it)
GRANT SELECT ON public.dashboard_stats TO authenticated;
GRANT SELECT ON public.dashboard_stats TO anon;
