DROP VIEW IF EXISTS public.daily_questions_public;

CREATE POLICY "Authenticated can read daily questions"
ON public.daily_questions FOR SELECT TO authenticated
USING (is_active = true);