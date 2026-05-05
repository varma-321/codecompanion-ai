
-- Add GitHub settings to profiles
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS github_token TEXT,
  ADD COLUMN IF NOT EXISTS github_repo TEXT,
  ADD COLUMN IF NOT EXISTS github_auto_push BOOLEAN DEFAULT false;
