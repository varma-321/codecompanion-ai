
ALTER TABLE public.problems ADD COLUMN IF NOT EXISTS bookmarked boolean NOT NULL DEFAULT false;
ALTER TABLE public.problems ADD COLUMN IF NOT EXISTS notes text NOT NULL DEFAULT '';
