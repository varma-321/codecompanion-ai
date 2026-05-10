-- Daily Questions table (LeetCode-style standalone problems)
CREATE TABLE public.daily_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  difficulty TEXT NOT NULL DEFAULT 'Medium',
  topic TEXT NOT NULL DEFAULT 'general',
  description TEXT NOT NULL DEFAULT '',
  constraints JSONB NOT NULL DEFAULT '[]'::jsonb,
  examples JSONB NOT NULL DEFAULT '[]'::jsonb,
  starter_code TEXT NOT NULL DEFAULT '',
  visible_test_cases JSONB NOT NULL DEFAULT '[]'::jsonb,
  hidden_test_cases JSONB NOT NULL DEFAULT '[]'::jsonb,
  daily_date DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_daily_questions_daily_date ON public.daily_questions(daily_date);
CREATE INDEX idx_daily_questions_slug ON public.daily_questions(slug);

ALTER TABLE public.daily_questions ENABLE ROW LEVEL SECURITY;

-- Public-safe view that EXCLUDES hidden_test_cases
CREATE OR REPLACE VIEW public.daily_questions_public AS
SELECT id, slug, title, difficulty, topic, description, constraints, examples,
       starter_code, visible_test_cases, daily_date, is_active, created_at, updated_at
FROM public.daily_questions
WHERE is_active = true;

GRANT SELECT ON public.daily_questions_public TO authenticated, anon;

-- RLS: only admins can directly read the base table (hidden cases live there)
CREATE POLICY "Admins can view all daily questions"
ON public.daily_questions FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert daily questions"
ON public.daily_questions FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update daily questions"
ON public.daily_questions FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete daily questions"
ON public.daily_questions FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_daily_questions_updated
BEFORE UPDATE ON public.daily_questions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Daily Submissions
CREATE TABLE public.daily_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  question_id UUID NOT NULL REFERENCES public.daily_questions(id) ON DELETE CASCADE,
  code TEXT NOT NULL DEFAULT '',
  language TEXT NOT NULL DEFAULT 'java',
  status TEXT NOT NULL DEFAULT 'PENDING',
  runtime_ms INTEGER,
  memory_kb INTEGER,
  passed_count INTEGER NOT NULL DEFAULT 0,
  total_count INTEGER NOT NULL DEFAULT 0,
  first_failing_case JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_daily_submissions_user ON public.daily_submissions(user_id, created_at DESC);
CREATE INDEX idx_daily_submissions_question ON public.daily_submissions(question_id);

ALTER TABLE public.daily_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own daily submissions"
ON public.daily_submissions FOR SELECT TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users insert own daily submissions"
ON public.daily_submissions FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);