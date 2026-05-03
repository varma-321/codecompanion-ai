-- Create table for threaded conversation messages
CREATE TABLE IF NOT EXISTS issue_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  issue_id UUID REFERENCES issues(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES auth.users(id),
  sender_role TEXT NOT NULL CHECK (sender_role IN ('user', 'admin')),
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE issue_messages ENABLE ROW LEVEL SECURITY;

-- Policies for issue_messages
CREATE POLICY "Users can view messages for their own issues"
ON issue_messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM issues 
    WHERE issues.id = issue_messages.issue_id 
    AND issues.user_id = auth.uid()
  )
);

CREATE POLICY "Admins can view all issue messages"
ON issue_messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Users can insert messages to their own issues"
ON issue_messages FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM issues 
    WHERE issues.id = issue_id 
    AND issues.user_id = auth.uid()
    AND issues.status = 'open' -- Optional: only allow replies to open issues
  )
);

CREATE POLICY "Admins can insert messages to any issue"
ON issue_messages FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Trigger to automatically add the initial comment to the messages table
CREATE OR REPLACE FUNCTION handle_new_issue()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO issue_messages (issue_id, sender_id, sender_role, message, created_at)
  VALUES (NEW.id, NEW.user_id, 'user', NEW.comment, NEW.created_at);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_issue_created ON issues;
CREATE TRIGGER on_issue_created
  AFTER INSERT ON issues
  FOR EACH ROW EXECUTE FUNCTION handle_new_issue();
