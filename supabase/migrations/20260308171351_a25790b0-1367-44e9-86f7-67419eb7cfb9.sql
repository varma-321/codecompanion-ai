
CREATE TABLE public.execution_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  problem_id text NOT NULL,
  code_snapshot text NOT NULL DEFAULT '',
  language text NOT NULL DEFAULT 'java',
  test_results jsonb NOT NULL DEFAULT '[]'::jsonb,
  passed boolean NOT NULL DEFAULT false,
  execution_time_ms integer,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.execution_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own execution history" ON public.execution_history
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own execution history" ON public.execution_history
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own execution history" ON public.execution_history
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX idx_execution_history_user_problem ON public.execution_history (user_id, problem_id, created_at DESC);
