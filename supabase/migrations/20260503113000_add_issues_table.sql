CREATE TABLE issues (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  user_email TEXT,
  page_url TEXT NOT NULL,
  page_title TEXT,
  comment TEXT NOT NULL,
  admin_reply TEXT,
  status TEXT DEFAULT 'open',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE issues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own issues" 
ON issues FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all issues" 
ON issues FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Users can view their own issues" 
ON issues FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can update issues" 
ON issues FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);
