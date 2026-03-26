
CREATE OR REPLACE FUNCTION public.check_ai_error_rate()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_total integer;
  v_errors integer;
  v_error_rate numeric;
  v_threshold numeric := 20;
  v_admin record;
  v_last_notification timestamp;
BEGIN
  IF NEW.success IS NOT FALSE THEN
    RETURN NEW;
  END IF;

  SELECT 
    count(*),
    count(*) FILTER (WHERE success = false)
  INTO v_total, v_errors
  FROM (
    SELECT success FROM ai_usage_logs 
    ORDER BY created_at DESC 
    LIMIT 50
  ) recent;

  IF v_total < 10 THEN
    RETURN NEW;
  END IF;

  v_error_rate := (v_errors::numeric / v_total::numeric) * 100;

  IF v_error_rate >= v_threshold THEN
    SELECT max(created_at) INTO v_last_notification
    FROM notifications
    WHERE type = 'warning'
      AND title = 'تنبيه: ارتفاع أخطاء الذكاء الاصطناعي ⚠️'
      AND created_at > now() - interval '1 hour';

    IF v_last_notification IS NOT NULL THEN
      RETURN NEW;
    END IF;

    FOR v_admin IN 
      SELECT user_id FROM user_roles WHERE role = 'admin'
    LOOP
      INSERT INTO notifications (user_id, title, message, type)
      VALUES (
        v_admin.user_id,
        'تنبيه: ارتفاع أخطاء الذكاء الاصطناعي ⚠️',
        'معدل أخطاء الذكاء الاصطناعي وصل إلى ' || round(v_error_rate, 1) || '% في آخر ' || v_total || ' طلب. الخطأ الأخير: ' || COALESCE(NEW.error_message, 'غير محدد'),
        'warning'
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_ai_error_check_rate
  AFTER INSERT ON ai_usage_logs
  FOR EACH ROW
  EXECUTE FUNCTION check_ai_error_rate();
