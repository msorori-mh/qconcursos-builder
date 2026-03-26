
CREATE TABLE public.lesson_summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id uuid NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  summary text NOT NULL,
  key_points jsonb NOT NULL DEFAULT '[]',
  study_tip text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(lesson_id)
);

ALTER TABLE public.lesson_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view summaries"
  ON public.lesson_summaries FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Service role can manage summaries"
  ON public.lesson_summaries FOR ALL
  TO public
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
