
CREATE TABLE public.weekly_schedule (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  day_of_week integer NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  period_number integer NOT NULL CHECK (period_number BETWEEN 1 AND 10),
  subject_name text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, day_of_week, period_number)
);

ALTER TABLE public.weekly_schedule ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own schedule" ON public.weekly_schedule
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own schedule" ON public.weekly_schedule
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own schedule" ON public.weekly_schedule
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own schedule" ON public.weekly_schedule
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
