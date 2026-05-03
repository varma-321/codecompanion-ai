-- Enable realtime for lobby tables so postgres_changes events fire
ALTER PUBLICATION supabase_realtime ADD TABLE public.interview_lobbies;
ALTER PUBLICATION supabase_realtime ADD TABLE public.lobby_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE public.lobby_messages;
