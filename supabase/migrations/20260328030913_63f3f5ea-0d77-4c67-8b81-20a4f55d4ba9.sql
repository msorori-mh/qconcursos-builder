
CREATE OR REPLACE FUNCTION public.notify_admins_on_pending_payment()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
DECLARE
  v_admin record;
  v_student_name text;
  v_amount text;
BEGIN
  IF NEW.status <> 'pending' THEN
    RETURN NEW;
  END IF;

  SELECT full_name INTO v_student_name
  FROM profiles WHERE user_id = NEW.user_id LIMIT 1;

  v_amount := NEW.amount::text || ' ' || NEW.currency;

  FOR v_admin IN
    SELECT user_id FROM user_roles WHERE role = 'admin'
  LOOP
    INSERT INTO notifications (user_id, title, message, type)
    VALUES (
      v_admin.user_id,
      'طلب دفع جديد 💳',
      'طلب دفع معلق بمبلغ ' || v_amount || ' من الطالب: ' || COALESCE(v_student_name, 'غير معروف'),
      'info'
    );
  END LOOP;

  RETURN NEW;
END;
$function$;

CREATE TRIGGER on_pending_payment_request
  AFTER INSERT ON public.payment_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_admins_on_pending_payment();
