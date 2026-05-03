-- Fix Direct Messages table to reference profiles directly for easier joins
-- and ensure search logic handles numeric IDs correctly.

-- 1. Re-create direct_messages with proper FKs to profiles
DROP TABLE IF EXISTS direct_messages CASCADE;

CREATE TABLE direct_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  receiver_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  subject TEXT,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Enable Security
ALTER TABLE direct_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own messages" 
ON direct_messages FOR SELECT 
USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can send messages" 
ON direct_messages FOR INSERT 
WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Receivers can mark messages as read" 
ON direct_messages FOR UPDATE 
USING (auth.uid() = receiver_id)
WITH CHECK (auth.uid() = receiver_id);

-- 3. Ensure the public_profile_stats view is fresh
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
