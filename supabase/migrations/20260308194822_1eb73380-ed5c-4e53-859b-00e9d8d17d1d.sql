
CREATE TABLE public.discussion_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  problem_key text NOT NULL,
  user_id uuid NOT NULL,
  parent_id uuid REFERENCES public.discussion_posts(id) ON DELETE CASCADE,
  content text NOT NULL DEFAULT '',
  likes integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.discussion_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view discussion posts" ON public.discussion_posts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert own discussion posts" ON public.discussion_posts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own discussion posts" ON public.discussion_posts FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own discussion posts" ON public.discussion_posts FOR DELETE TO authenticated USING (auth.uid() = user_id);
