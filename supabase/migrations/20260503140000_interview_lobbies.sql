-- Create Interview Lobbies table
CREATE TABLE IF NOT EXISTS public.interview_lobbies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  host_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  guest_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  problem_key text,
  status text NOT NULL DEFAULT 'waiting', -- waiting, coding, review
  current_code text,
  time_limit integer DEFAULT 30,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  last_activity timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.interview_lobbies ENABLE ROW LEVEL SECURITY;

-- Policies for lobbies
CREATE POLICY "Users can view any lobby" ON public.interview_lobbies FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create lobbies" ON public.interview_lobbies FOR INSERT TO authenticated WITH CHECK (auth.uid() = host_id);
CREATE POLICY "Users can update their lobbies" ON public.interview_lobbies FOR UPDATE TO authenticated USING (auth.uid() = host_id OR auth.uid() = guest_id);

-- Lobby Messages (Chat)
CREATE TABLE IF NOT EXISTS public.lobby_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lobby_id uuid NOT NULL REFERENCES public.interview_lobbies(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES public.profiles(id),
  content text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.lobby_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view lobby messages" ON public.lobby_messages FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.interview_lobbies WHERE id = lobby_id AND (host_id = auth.uid() OR guest_id = auth.uid()))
);

CREATE POLICY "Users can post to lobby" ON public.lobby_messages FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.interview_lobbies WHERE id = lobby_id AND (host_id = auth.uid() OR guest_id = auth.uid()))
);
