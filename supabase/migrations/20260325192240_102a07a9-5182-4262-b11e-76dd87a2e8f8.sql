
-- Function to check if a lesson is the first in its subject
CREATE OR REPLACE FUNCTION public.is_first_lesson_in_subject(_lesson_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.lessons l
    WHERE l.id = _lesson_id
      AND l.sort_order = (
        SELECT MIN(l2.sort_order) FROM public.lessons l2 WHERE l2.subject_id = l.subject_id
      )
  )
$$;

-- Drop old policy and create updated one
DROP POLICY IF EXISTS "Paid lessons viewable by active subscribers" ON public.lessons;

CREATE POLICY "Paid lessons viewable by active subscribers"
ON public.lessons
FOR SELECT
TO authenticated
USING (
  is_free = true
  OR is_first_lesson_in_subject(id)
  OR has_active_subscription(auth.uid())
  OR has_role(auth.uid(), 'admin'::app_role)
);
