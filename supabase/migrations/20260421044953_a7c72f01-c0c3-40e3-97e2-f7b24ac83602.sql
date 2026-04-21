-- Shared cache for AI-generated problem details + test cases (lazy generate, then reuse forever)
CREATE TABLE IF NOT EXISTS public.problem_test_cases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  problem_key TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL DEFAULT '',
  difficulty TEXT NOT NULL DEFAULT 'Medium',
  topic TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  examples JSONB NOT NULL DEFAULT '[]'::jsonb,
  constraints JSONB NOT NULL DEFAULT '[]'::jsonb,
  hints JSONB NOT NULL DEFAULT '[]'::jsonb,
  starter_code TEXT NOT NULL DEFAULT '',
  function_name TEXT NOT NULL DEFAULT 'solve',
  return_type TEXT NOT NULL DEFAULT 'void',
  params JSONB NOT NULL DEFAULT '[]'::jsonb,
  test_cases JSONB NOT NULL DEFAULT '[]'::jsonb,
  generated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_problem_test_cases_key ON public.problem_test_cases(problem_key);

ALTER TABLE public.problem_test_cases ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read the cache
CREATE POLICY "Authenticated can read cached problem test cases"
  ON public.problem_test_cases FOR SELECT
  TO authenticated
  USING (true);

-- Anyone authenticated can populate the cache (first user wins, then upserts)
CREATE POLICY "Authenticated can insert cached problem test cases"
  ON public.problem_test_cases FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Admins (or the original generator) can update / fix entries
CREATE POLICY "Admins or generator can update cache"
  ON public.problem_test_cases FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR generated_by = auth.uid());

CREATE POLICY "Admins can delete cache"
  ON public.problem_test_cases FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Trigger for updated_at
CREATE TRIGGER update_problem_test_cases_updated_at
  BEFORE UPDATE ON public.problem_test_cases
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();