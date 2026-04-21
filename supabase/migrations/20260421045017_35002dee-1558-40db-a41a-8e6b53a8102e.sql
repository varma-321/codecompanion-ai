DROP POLICY IF EXISTS "Authenticated can insert cached problem test cases" ON public.problem_test_cases;

CREATE POLICY "Authenticated can insert their own cache entries"
  ON public.problem_test_cases FOR INSERT
  TO authenticated
  WITH CHECK (generated_by = auth.uid());