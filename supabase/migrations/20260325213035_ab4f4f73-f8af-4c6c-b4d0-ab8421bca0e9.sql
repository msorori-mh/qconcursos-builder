
-- Add referral_code to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referral_code text UNIQUE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referred_by text;

-- Create referrals table
CREATE TABLE public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL,
  referred_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  referrer_reward_applied boolean NOT NULL DEFAULT false,
  referred_reward_applied boolean NOT NULL DEFAULT false,
  discount_percent integer NOT NULL DEFAULT 10,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  completed_at timestamp with time zone,
  UNIQUE(referred_id)
);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

-- Users can view their own referrals (as referrer or referred)
CREATE POLICY "Users can view own referrals"
  ON public.referrals FOR SELECT
  TO authenticated
  USING (auth.uid() = referrer_id OR auth.uid() = referred_id);

-- System/admin can manage referrals
CREATE POLICY "Admins can manage referrals"
  ON public.referrals FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Allow insert for authenticated users (when referred friend subscribes)
CREATE POLICY "Users can insert referrals"
  ON public.referrals FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = referred_id);

-- Generate referral codes for existing profiles
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code := upper(substr(md5(NEW.user_id::text || now()::text), 1, 8));
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_referral_code
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  WHEN (NEW.referral_code IS NULL)
  EXECUTE FUNCTION public.generate_referral_code();

-- Generate codes for existing profiles
UPDATE public.profiles SET referral_code = upper(substr(md5(user_id::text || now()::text), 1, 8)) WHERE referral_code IS NULL;
