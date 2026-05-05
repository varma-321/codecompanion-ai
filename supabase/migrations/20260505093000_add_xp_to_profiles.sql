-- Add XP column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS xp INTEGER DEFAULT 0;

-- Update the public_profile_stats view to include XP
CREATE OR REPLACE VIEW public_profile_stats AS
SELECT 
  p.id as user_id,
  p.username,
  p.display_id,
  p.created_at,
  p.xp,
  COUNT(DISTINCT progress.problem_key) FILTER (WHERE progress.solved = true) as solved_count,
  COUNT(DISTINCT progress.problem_key) as attempted_count,
  MAX(progress.last_attempted) as last_active
FROM profiles p
LEFT JOIN user_problem_progress progress ON p.id = progress.user_id
GROUP BY p.id, p.username, p.display_id, p.created_at, p.xp;
