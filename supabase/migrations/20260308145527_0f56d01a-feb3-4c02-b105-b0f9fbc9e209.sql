
CREATE TABLE public.user_problem_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  problem_key text NOT NULL,
  status text NOT NULL DEFAULT 'not_started',
  attempts integer NOT NULL DEFAULT 0,
  solved boolean NOT NULL DEFAULT false,
  marked_for_revision boolean NOT NULL DEFAULT false,
  last_attempted timestamp with time zone,
  solved_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, problem_key)
);

ALTER TABLE public.user_problem_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own progress" ON public.user_problem_progress FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own progress" ON public.user_problem_progress FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own progress" ON public.user_problem_progress FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own progress" ON public.user_problem_progress FOR DELETE TO authenticated USING (auth.uid() = user_id);
