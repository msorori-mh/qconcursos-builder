
CREATE TABLE public.lesson_simulations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lesson_id uuid NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  phet_url text NOT NULL,
  thumbnail_url text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.lesson_simulations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Simulations viewable by everyone"
  ON public.lesson_simulations FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Admins can manage simulations"
  ON public.lesson_simulations FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_lesson_simulations_lesson_id ON public.lesson_simulations(lesson_id);
