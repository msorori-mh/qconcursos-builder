ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS parent_email text,
ADD COLUMN IF NOT EXISTS parent_phone text;