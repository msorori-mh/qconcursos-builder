
-- Badges definitions table
CREATE TABLE public.badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL,
  icon text NOT NULL DEFAULT 'Award',
  color text NOT NULL DEFAULT '#f59e0b',
  condition_type text NOT NULL, -- 'lessons_completed', 'quizzes_passed', 'points_earned', 'streak_days', 'certificates_earned'
  condition_value integer NOT NULL DEFAULT 1,
  points_reward integer NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Student points ledger
CREATE TABLE public.student_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  points integer NOT NULL DEFAULT 0,
  reason text NOT NULL, -- 'lesson_completed', 'quiz_passed', 'badge_earned', 'streak_bonus'
  reference_id uuid, -- lesson_id, badge_id, etc.
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Student earned badges
CREATE TABLE public.student_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_id uuid NOT NULL REFERENCES public.badges(id) ON DELETE CASCADE,
  earned_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, badge_id)
);

-- Indexes
CREATE INDEX idx_student_points_user ON public.student_points(user_id);
CREATE INDEX idx_student_badges_user ON public.student_badges(user_id);

-- RLS
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_badges ENABLE ROW LEVEL SECURITY;

-- Badges: viewable by all, managed by admins
CREATE POLICY "Badges viewable by everyone" ON public.badges FOR SELECT TO public USING (true);
CREATE POLICY "Admins can manage badges" ON public.badges FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'));

-- Points: users see own, admins see all, system inserts
CREATE POLICY "Users can view own points" ON public.student_points FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all points" ON public.student_points FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "System can insert points" ON public.student_points FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Student badges: users see own, admins see all
CREATE POLICY "Users can view own badges" ON public.student_badges FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all badges" ON public.student_badges FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "System can insert badges" ON public.student_badges FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Function to get total points for a user
CREATE OR REPLACE FUNCTION public.get_user_total_points(_user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(SUM(points), 0)::integer FROM public.student_points WHERE user_id = _user_id
$$;

-- Function to award points and check badges
CREATE OR REPLACE FUNCTION public.award_points_on_progress()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_points integer;
  v_badge record;
  v_lessons_completed integer;
  v_total_points integer;
  v_certificates integer;
BEGIN
  -- Only on completion
  IF NEW.completed IS NOT TRUE THEN RETURN NEW; END IF;
  -- Avoid duplicate points
  IF EXISTS (SELECT 1 FROM student_points WHERE user_id = NEW.user_id AND reason = 'lesson_completed' AND reference_id = NEW.lesson_id) THEN
    RETURN NEW;
  END IF;

  -- Award 10 points for lesson completion
  v_points := 10;
  IF NEW.quiz_score IS NOT NULL AND NEW.quiz_score >= 80 THEN
    v_points := v_points + 5; -- bonus for good quiz score
  END IF;

  INSERT INTO student_points (user_id, points, reason, reference_id)
  VALUES (NEW.user_id, v_points, 'lesson_completed', NEW.lesson_id);

  -- Check badge conditions
  SELECT count(*) INTO v_lessons_completed FROM user_progress WHERE user_id = NEW.user_id AND completed = true;
  SELECT COALESCE(SUM(points), 0) INTO v_total_points FROM student_points WHERE user_id = NEW.user_id;
  SELECT count(*) INTO v_certificates FROM certificates WHERE user_id = NEW.user_id;

  FOR v_badge IN SELECT * FROM badges LOOP
    -- Skip if already earned
    IF EXISTS (SELECT 1 FROM student_badges WHERE user_id = NEW.user_id AND badge_id = v_badge.id) THEN
      CONTINUE;
    END IF;

    IF (v_badge.condition_type = 'lessons_completed' AND v_lessons_completed >= v_badge.condition_value)
    OR (v_badge.condition_type = 'points_earned' AND v_total_points >= v_badge.condition_value)
    OR (v_badge.condition_type = 'certificates_earned' AND v_certificates >= v_badge.condition_value)
    THEN
      INSERT INTO student_badges (user_id, badge_id) VALUES (NEW.user_id, v_badge.id);
      -- Award badge bonus points
      IF v_badge.points_reward > 0 THEN
        INSERT INTO student_points (user_id, points, reason, reference_id)
        VALUES (NEW.user_id, v_badge.points_reward, 'badge_earned', v_badge.id);
      END IF;
      -- Notify
      INSERT INTO notifications (user_id, title, message, type)
      VALUES (NEW.user_id, 'شارة جديدة 🏆', 'تهانينا! حصلت على شارة: ' || v_badge.name, 'success');
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

-- Trigger on user_progress
CREATE TRIGGER tr_award_points_on_progress
AFTER INSERT OR UPDATE ON public.user_progress
FOR EACH ROW EXECUTE FUNCTION public.award_points_on_progress();

-- Insert default badges
INSERT INTO public.badges (name, description, icon, color, condition_type, condition_value, points_reward, sort_order) VALUES
('المبتدئ', 'أكمل أول درس', 'BookOpen', '#3b82f6', 'lessons_completed', 1, 5, 1),
('المتعلم النشط', 'أكمل 10 دروس', 'Flame', '#f97316', 'lessons_completed', 10, 20, 2),
('المثابر', 'أكمل 25 درساً', 'Target', '#8b5cf6', 'lessons_completed', 25, 50, 3),
('الخبير', 'أكمل 50 درساً', 'Crown', '#eab308', 'lessons_completed', 50, 100, 4),
('الأسطورة', 'أكمل 100 درس', 'Star', '#ef4444', 'lessons_completed', 100, 200, 5),
('جامع النقاط', 'احصل على 100 نقطة', 'Coins', '#10b981', 'points_earned', 100, 10, 6),
('نجم النقاط', 'احصل على 500 نقطة', 'Gem', '#6366f1', 'points_earned', 500, 30, 7),
('حامل الشهادة', 'احصل على أول شهادة إتمام', 'Award', '#f59e0b', 'certificates_earned', 1, 25, 8),
('المتفوق', 'احصل على 3 شهادات إتمام', 'Trophy', '#ec4899', 'certificates_earned', 3, 75, 9);
