
-- Create subscription_plans table
CREATE TABLE public.subscription_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  duration_type text NOT NULL CHECK (duration_type IN ('semester', 'annual')),
  duration_months integer NOT NULL DEFAULT 5,
  price numeric NOT NULL,
  currency text NOT NULL DEFAULT 'YER',
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- RLS for subscription_plans
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Plans viewable by authenticated"
  ON public.subscription_plans FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Admins can manage plans"
  ON public.subscription_plans FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- Add semester column to subjects
ALTER TABLE public.subjects ADD COLUMN semester integer DEFAULT NULL;

-- Add plan_id to subscriptions
ALTER TABLE public.subscriptions ADD COLUMN plan_id uuid REFERENCES public.subscription_plans(id);

-- Add plan_id to payment_requests
ALTER TABLE public.payment_requests ADD COLUMN plan_id uuid REFERENCES public.subscription_plans(id);
