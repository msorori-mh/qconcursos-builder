
-- Certificates table
CREATE TABLE public.certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  issued_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, subject_id)
);

ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;

-- Users can view own certificates
CREATE POLICY "Users can view own certificates"
  ON public.certificates FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- System (admin) can insert certificates
CREATE POLICY "System can insert certificates"
  ON public.certificates FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

-- Function to check and issue certificate when all lessons completed
CREATE OR REPLACE FUNCTION public.check_and_issue_certificate()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_subject_id uuid;
  v_total_lessons int;
  v_completed_lessons int;
BEGIN
  -- Only proceed if the lesson was marked as completed
  IF NEW.completed IS NOT TRUE THEN
    RETURN NEW;
  END IF;

  -- Get the subject_id for this lesson
  SELECT subject_id INTO v_subject_id
  FROM public.lessons
  WHERE id = NEW.lesson_id;

  IF v_subject_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Count total lessons in the subject
  SELECT count(*) INTO v_total_lessons
  FROM public.lessons
  WHERE subject_id = v_subject_id;

  -- Count completed lessons by this user in the subject
  SELECT count(*) INTO v_completed_lessons
  FROM public.user_progress up
  JOIN public.lessons l ON l.id = up.lesson_id
  WHERE up.user_id = NEW.user_id
    AND l.subject_id = v_subject_id
    AND up.completed = true;

  -- If all lessons completed, issue certificate (ignore if already exists)
  IF v_completed_lessons >= v_total_lessons AND v_total_lessons > 0 THEN
    INSERT INTO public.certificates (user_id, subject_id)
    VALUES (NEW.user_id, v_subject_id)
    ON CONFLICT (user_id, subject_id) DO NOTHING;

    -- Send notification
    INSERT INTO public.notifications (user_id, title, message, type)
    VALUES (
      NEW.user_id,
      'شهادة إتمام جديدة 🎓',
      'تهانينا! لقد أكملت جميع دروس المادة وحصلت على شهادة إتمام.',
      'success'
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger on user_progress insert or update
CREATE TRIGGER trigger_check_certificate
  AFTER INSERT OR UPDATE ON public.user_progress
  FOR EACH ROW
  EXECUTE FUNCTION public.check_and_issue_certificate();
