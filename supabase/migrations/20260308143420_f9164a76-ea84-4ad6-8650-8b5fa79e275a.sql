
-- Learning history table
CREATE TABLE IF NOT EXISTS public.learning_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic text NOT NULL,
  algorithm text NOT NULL,
  difficulty text NOT NULL DEFAULT 'medium',
  time_spent_seconds integer NOT NULL DEFAULT 0,
  completed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.learning_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own learning_history" ON public.learning_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert learning_history" ON public.learning_history FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update learning_history" ON public.learning_history FOR UPDATE USING (auth.uid() = user_id);

-- Add difficulty and time_spent to problems table
ALTER TABLE public.problems ADD COLUMN IF NOT EXISTS difficulty text NOT NULL DEFAULT 'medium';
ALTER TABLE public.problems ADD COLUMN IF NOT EXISTS solved boolean NOT NULL DEFAULT false;
ALTER TABLE public.problems ADD COLUMN IF NOT EXISTS time_spent_seconds integer NOT NULL DEFAULT 0;
ALTER TABLE public.problems ADD COLUMN IF NOT EXISTS topic text NOT NULL DEFAULT 'general';
