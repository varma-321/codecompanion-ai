
-- Achievements table
CREATE TABLE public.user_achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  achievement_key text NOT NULL,
  unlocked_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, achievement_key)
);

ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own achievements" ON public.user_achievements FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own achievements" ON public.user_achievements FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Custom problems table
CREATE TABLE public.custom_problems (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  difficulty text NOT NULL DEFAULT 'Medium',
  starter_code text NOT NULL DEFAULT '',
  test_cases jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_public boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.custom_problems ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own custom problems" ON public.custom_problems FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can view public custom problems" ON public.custom_problems FOR SELECT TO authenticated USING (is_public = true);
CREATE POLICY "Users can insert own custom problems" ON public.custom_problems FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own custom problems" ON public.custom_problems FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own custom problems" ON public.custom_problems FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Interview results table
CREATE TABLE public.interview_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  problem_title text NOT NULL,
  difficulty text NOT NULL DEFAULT 'Medium',
  time_taken_seconds integer NOT NULL DEFAULT 0,
  score integer NOT NULL DEFAULT 0,
  ai_feedback text,
  code_snapshot text NOT NULL DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.interview_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own interview results" ON public.interview_results FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own interview results" ON public.interview_results FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Shared solutions table
CREATE TABLE public.shared_solutions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  problem_key text NOT NULL,
  code text NOT NULL,
  approach text NOT NULL DEFAULT '',
  language text NOT NULL DEFAULT 'java',
  likes integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.shared_solutions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view shared solutions" ON public.shared_solutions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert own shared solutions" ON public.shared_solutions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own shared solutions" ON public.shared_solutions FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own shared solutions" ON public.shared_solutions FOR DELETE TO authenticated USING (auth.uid() = user_id);
