
-- Lesson comments / discussion table
CREATE TABLE public.lesson_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id uuid NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  parent_id uuid REFERENCES public.lesson_comments(id) ON DELETE CASCADE,
  content text NOT NULL,
  is_pinned boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_lesson_comments_lesson ON public.lesson_comments(lesson_id);
CREATE INDEX idx_lesson_comments_parent ON public.lesson_comments(parent_id);

ALTER TABLE public.lesson_comments ENABLE ROW LEVEL SECURITY;

-- Everyone authenticated can read comments
CREATE POLICY "Anyone can view comments" ON public.lesson_comments
  FOR SELECT TO authenticated USING (true);

-- Users can insert their own comments
CREATE POLICY "Users can insert own comments" ON public.lesson_comments
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Users can update their own comments
CREATE POLICY "Users can update own comments" ON public.lesson_comments
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Users can delete their own comments
CREATE POLICY "Users can delete own comments" ON public.lesson_comments
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Admins can manage all comments
CREATE POLICY "Admins can manage comments" ON public.lesson_comments
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.lesson_comments;
