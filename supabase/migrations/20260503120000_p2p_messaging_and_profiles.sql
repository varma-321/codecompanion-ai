-- Add a system-generated numeric ID to profiles if it doesn't exist
-- Using a sequence for simple, readable IDs
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='display_id') THEN
    ALTER TABLE public.profiles ADD COLUMN display_id SERIAL;
  END IF;
END $$;

-- Create table for Direct Messages between users
CREATE TABLE IF NOT EXISTS direct_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  subject TEXT,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE direct_messages ENABLE ROW LEVEL SECURITY;

-- Policies for direct_messages
CREATE POLICY "Users can view their own sent/received messages"
ON direct_messages FOR SELECT
USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can send messages"
ON direct_messages FOR INSERT
WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Receivers can mark messages as read"
ON direct_messages FOR UPDATE
USING (auth.uid() = receiver_id)
WITH CHECK (auth.uid() = receiver_id);

-- Create a view for public profile statistics
CREATE OR REPLACE VIEW public_profile_stats AS
SELECT 
  p.id as user_id,
  p.username,
  p.display_id,
  p.created_at,
  COUNT(DISTINCT progress.problem_key) FILTER (WHERE progress.solved = true) as solved_count,
  COUNT(DISTINCT progress.problem_key) as attempted_count,
  MAX(progress.last_attempted) as last_active
FROM profiles p
LEFT JOIN user_problem_progress progress ON p.id = progress.user_id
GROUP BY p.id, p.username, p.display_id, p.created_at;
