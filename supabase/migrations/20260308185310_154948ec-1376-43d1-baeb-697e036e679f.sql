CREATE TABLE public.user_code_saves (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  problem_key text NOT NULL,
  code text NOT NULL DEFAULT '',
  language text NOT NULL DEFAULT 'java',
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, problem_key)
);

ALTER TABLE public.user_code_saves ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own code saves"
  ON public.user_code_saves FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own code saves"
  ON public.user_code_saves FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own code saves"
  ON public.user_code_saves FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own code saves"
  ON public.user_code_saves FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER update_user_code_saves_updated_at
  BEFORE UPDATE ON public.user_code_saves
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();