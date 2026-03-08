-- Create profiles table linked to auth.users
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Create trigger to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, username)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Drop old foreign keys and re-point to auth.users
ALTER TABLE public.problems DROP CONSTRAINT IF EXISTS problems_user_id_fkey;
ALTER TABLE public.analyses DROP CONSTRAINT IF EXISTS analyses_user_id_fkey;
ALTER TABLE public.hints DROP CONSTRAINT IF EXISTS hints_user_id_fkey;
ALTER TABLE public.solutions DROP CONSTRAINT IF EXISTS solutions_user_id_fkey;
ALTER TABLE public.test_cases DROP CONSTRAINT IF EXISTS test_cases_user_id_fkey;

ALTER TABLE public.problems ADD CONSTRAINT problems_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.analyses ADD CONSTRAINT analyses_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.hints ADD CONSTRAINT hints_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.solutions ADD CONSTRAINT solutions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.test_cases ADD CONSTRAINT test_cases_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Update RLS policies to use auth.uid()
DROP POLICY IF EXISTS "Users can view own problems" ON public.problems;
DROP POLICY IF EXISTS "Users can insert own problems" ON public.problems;
DROP POLICY IF EXISTS "Users can update own problems" ON public.problems;
DROP POLICY IF EXISTS "Users can delete own problems" ON public.problems;

CREATE POLICY "Users can view own problems" ON public.problems FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own problems" ON public.problems FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own problems" ON public.problems FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own problems" ON public.problems FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own analyses" ON public.analyses;
DROP POLICY IF EXISTS "Users can insert analyses" ON public.analyses;
DROP POLICY IF EXISTS "Users can update analyses" ON public.analyses;

CREATE POLICY "Users can view own analyses" ON public.analyses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert analyses" ON public.analyses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update analyses" ON public.analyses FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own hints" ON public.hints;
DROP POLICY IF EXISTS "Users can insert hints" ON public.hints;

CREATE POLICY "Users can view own hints" ON public.hints FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert hints" ON public.hints FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own solutions" ON public.solutions;
DROP POLICY IF EXISTS "Users can insert solutions" ON public.solutions;
DROP POLICY IF EXISTS "Users can update solutions" ON public.solutions;

CREATE POLICY "Users can view own solutions" ON public.solutions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert solutions" ON public.solutions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update solutions" ON public.solutions FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own test_cases" ON public.test_cases;
DROP POLICY IF EXISTS "Users can insert test_cases" ON public.test_cases;

CREATE POLICY "Users can view own test_cases" ON public.test_cases FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert test_cases" ON public.test_cases FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Drop old users table
DROP TABLE IF EXISTS public.users CASCADE;