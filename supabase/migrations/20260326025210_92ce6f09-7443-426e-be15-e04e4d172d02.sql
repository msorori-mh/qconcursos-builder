
-- Monthly revenue & student growth aggregation
CREATE OR REPLACE FUNCTION public.get_report_monthly_data(
  _months_back integer DEFAULT 12,
  _grade_id uuid DEFAULT NULL
)
RETURNS TABLE(year_month text, revenue numeric, new_students bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH months AS (
    SELECT to_char(date_trunc('month', now()) - (i || ' months')::interval, 'YYYY-MM') AS ym
    FROM generate_series(0, _months_back - 1) AS i
  ),
  rev AS (
    SELECT to_char(created_at, 'YYYY-MM') AS ym, SUM(amount) AS total
    FROM payment_requests
    WHERE status = 'approved'
      AND created_at >= date_trunc('month', now()) - (_months_back || ' months')::interval
    GROUP BY 1
  ),
  stu AS (
    SELECT to_char(created_at, 'YYYY-MM') AS ym, count(*) AS total
    FROM profiles
    WHERE created_at >= date_trunc('month', now()) - (_months_back || ' months')::interval
      AND (_grade_id IS NULL OR grade_id = _grade_id::text)
    GROUP BY 1
  )
  SELECT m.ym, COALESCE(r.total, 0), COALESCE(s.total, 0)
  FROM months m
  LEFT JOIN rev r ON r.ym = m.ym
  LEFT JOIN stu s ON s.ym = m.ym
  ORDER BY m.ym;
$$;

-- Governorate distribution
CREATE OR REPLACE FUNCTION public.get_report_governorate_data(
  _months_back integer DEFAULT 0,
  _grade_id uuid DEFAULT NULL
)
RETURNS TABLE(governorate text, student_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(p.governorate, 'غير محدد'), count(*)
  FROM profiles p
  WHERE (_months_back = 0 OR p.created_at >= date_trunc('month', now()) - (_months_back || ' months')::interval)
    AND (_grade_id IS NULL OR p.grade_id = _grade_id::text)
  GROUP BY 1
  ORDER BY 2 DESC;
$$;

-- Top schools
CREATE OR REPLACE FUNCTION public.get_report_school_data(
  _months_back integer DEFAULT 0,
  _grade_id uuid DEFAULT NULL,
  _limit integer DEFAULT 15
)
RETURNS TABLE(school_name text, governorate text, student_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT p.school_name, COALESCE(p.governorate, 'غير محدد'), count(*)
  FROM profiles p
  WHERE p.school_name IS NOT NULL AND trim(p.school_name) != ''
    AND (_months_back = 0 OR p.created_at >= date_trunc('month', now()) - (_months_back || ' months')::interval)
    AND (_grade_id IS NULL OR p.grade_id = _grade_id::text)
  GROUP BY 1, 2
  ORDER BY 3 DESC
  LIMIT _limit;
$$;

-- Subscription status distribution
CREATE OR REPLACE FUNCTION public.get_report_subscription_status(
  _months_back integer DEFAULT 0,
  _grade_id uuid DEFAULT NULL
)
RETURNS TABLE(status text, sub_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT s.status, count(*)
  FROM subscriptions s
  WHERE (_months_back = 0 OR s.created_at >= date_trunc('month', now()) - (_months_back || ' months')::interval)
    AND (_grade_id IS NULL OR s.grade_id = _grade_id)
  GROUP BY 1;
$$;

-- Grade content breakdown
CREATE OR REPLACE FUNCTION public.get_report_grade_content()
RETURNS TABLE(grade_name text, subjects_count bigint, lessons_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT g.name,
    (SELECT count(*) FROM subjects s WHERE s.grade_id = g.id),
    (SELECT count(*) FROM lessons l JOIN subjects s ON s.id = l.subject_id WHERE s.grade_id = g.id)
  FROM grades g
  ORDER BY g.sort_order;
$$;
