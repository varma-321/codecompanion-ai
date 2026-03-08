
-- Add spaced repetition columns to user_problem_progress
ALTER TABLE public.user_problem_progress
  ADD COLUMN IF NOT EXISTS next_review_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS ease_factor real NOT NULL DEFAULT 2.5,
  ADD COLUMN IF NOT EXISTS review_interval integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS review_count integer NOT NULL DEFAULT 0;

-- Contest results table
CREATE TABLE public.contest_results (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  contest_type text NOT NULL DEFAULT 'practice',
  problems_attempted integer NOT NULL DEFAULT 0,
  problems_solved integer NOT NULL DEFAULT 0,
  total_time_seconds integer NOT NULL DEFAULT 0,
  score integer NOT NULL DEFAULT 0,
  problem_keys text[] NOT NULL DEFAULT '{}',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.contest_results ENABLE ROW LEVEL SECURITY;

-- RLS for contest_results
CREATE POLICY "Users can view own contest results" ON public.contest_results
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own contest results" ON public.contest_results
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Leaderboard view: allow reading all contest_results for leaderboard (aggregate only)
CREATE POLICY "Anyone can view contest results for leaderboard" ON public.contest_results
  FOR SELECT TO authenticated USING (true);

-- Also allow reading profiles for leaderboard
-- profiles already has "viewable by everyone" policy
