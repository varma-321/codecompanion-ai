
-- Add input and expected_output columns to test_cases
ALTER TABLE public.test_cases ADD COLUMN IF NOT EXISTS input text NOT NULL DEFAULT '';
ALTER TABLE public.test_cases ADD COLUMN IF NOT EXISTS expected_output text NOT NULL DEFAULT '';

-- Drop old content column
ALTER TABLE public.test_cases DROP COLUMN IF EXISTS content;

-- Add update and delete RLS policies for test_cases
CREATE POLICY "Users can update own test_cases" ON public.test_cases FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own test_cases" ON public.test_cases FOR DELETE USING (auth.uid() = user_id);
