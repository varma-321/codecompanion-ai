-- Allow all authenticated users to view everyone's progress 
-- so that the leaderboard detail panel can show statistics.

DROP POLICY IF EXISTS "Users can view own progress" ON public.user_problem_progress;

CREATE POLICY "Anyone can view user progress" 
ON public.user_problem_progress FOR SELECT 
TO authenticated 
USING (true);
