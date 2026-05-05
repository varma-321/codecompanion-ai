
-- Add email and requested_role to profiles
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS requested_role TEXT DEFAULT 'user';

-- Update handle_new_user to populate email and requested_role, and create an issue notification
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    is_admin_email BOOLEAN;
    username_val TEXT;
    requested_role_val TEXT;
BEGIN
  is_admin_email := (NEW.email = 'yashwanthvarma.simats@gmail.com');
  username_val := COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1));
  requested_role_val := COALESCE(NEW.raw_user_meta_data->>'requested_role', 'user');

  -- 1. Insert into profiles
  INSERT INTO public.profiles (id, username, email, status, requested_role)
  VALUES (
    NEW.id,
    username_val,
    NEW.email,
    CASE WHEN is_admin_email THEN 'approved' ELSE 'pending' END,
    requested_role_val
  );
  
  -- 2. Auto-assign admin role for default admin
  IF is_admin_email THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  END IF;

  -- 3. Create an "Issue" as a notification for the admin
  IF NOT is_admin_email THEN
    INSERT INTO public.issues (user_id, user_email, page_url, page_title, comment, status)
    VALUES (
      NEW.id,
      NEW.email,
      '/admin',
      'Signup Request',
      'New ' || requested_role_val || ' signup request from ' || username_val || ' (' || NEW.email || '). Please review and approve.',
      'open'
    );
  END IF;
  
  RETURN NEW;
END;
$$;
