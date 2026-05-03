-- Support multiple participants per lobby
CREATE TABLE IF NOT EXISTS public.lobby_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lobby_id uuid NOT NULL REFERENCES public.interview_lobbies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  username text,
  role text NOT NULL DEFAULT 'participant', -- 'host' or 'participant'
  status text NOT NULL DEFAULT 'active',   -- 'active', 'left'
  joined_at timestamp with time zone NOT NULL DEFAULT now(),
  left_at timestamp with time zone,
  UNIQUE(lobby_id, user_id)
);

ALTER TABLE public.lobby_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view lobby participants" 
ON public.lobby_participants FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can join lobbies as participant" 
ON public.lobby_participants FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own participation" 
ON public.lobby_participants FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Add closed_at and max_participants to lobbies
ALTER TABLE public.interview_lobbies ADD COLUMN IF NOT EXISTS closed_at timestamp with time zone;
ALTER TABLE public.interview_lobbies ADD COLUMN IF NOT EXISTS max_participants integer DEFAULT 10;

-- Allow host to close/delete lobby
CREATE POLICY "Host can delete lobby" 
ON public.interview_lobbies FOR DELETE TO authenticated USING (auth.uid() = host_id);
