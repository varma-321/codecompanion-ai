
-- Agent run history
CREATE TABLE public.agent_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  problem_key TEXT NOT NULL,
  title TEXT NOT NULL,
  phase TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  passed_count INTEGER NOT NULL DEFAULT 0,
  total_count INTEGER NOT NULL DEFAULT 0,
  error_type TEXT,
  final_code TEXT NOT NULL DEFAULT '',
  logs JSONB NOT NULL DEFAULT '[]'::jsonb,
  key_usage JSONB NOT NULL DEFAULT '{}'::jsonb,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.agent_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all agent runs"
  ON public.agent_runs FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert agent runs"
  ON public.agent_runs FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) AND user_id = auth.uid());

CREATE POLICY "Admins can update agent runs"
  ON public.agent_runs FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_agent_runs_created ON public.agent_runs(created_at DESC);
CREATE INDEX idx_agent_runs_problem ON public.agent_runs(problem_key);

-- System patch proposals (admin reviews, never auto-applied)
CREATE TABLE public.system_patch_proposals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  proposed_by UUID NOT NULL,
  problem_key TEXT,
  error_type TEXT NOT NULL,
  error_summary TEXT NOT NULL,
  target_files TEXT[] NOT NULL DEFAULT '{}',
  diff TEXT NOT NULL,
  explanation TEXT NOT NULL,
  context_snippet TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.system_patch_proposals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view patch proposals"
  ON public.system_patch_proposals FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert patch proposals"
  ON public.system_patch_proposals FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) AND proposed_by = auth.uid());

CREATE POLICY "Admins can update patch proposals"
  ON public.system_patch_proposals FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_patch_proposals_status ON public.system_patch_proposals(status, created_at DESC);
