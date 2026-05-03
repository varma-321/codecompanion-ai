-- Function to allow admins to delete users completely
CREATE OR REPLACE FUNCTION admin_delete_user(target_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 1. Security Check: Only admins can perform this action
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Permission Denied: Only admins can delete users.';
  END IF;

  -- 2. Clear all user-related data from public tables 
  -- (Ordered to avoid dependency issues)
  DELETE FROM public.user_roles WHERE user_id = target_user_id;
  DELETE FROM public.user_achievements WHERE user_id = target_user_id;
  DELETE FROM public.user_code_saves WHERE user_id = target_user_id;
  DELETE FROM public.user_problem_progress WHERE user_id = target_user_id;
  DELETE FROM public.execution_history WHERE user_id = target_user_id;
  DELETE FROM public.learning_history WHERE user_id = target_user_id;
  DELETE FROM public.contest_results WHERE user_id = target_user_id;
  DELETE FROM public.interview_results WHERE user_id = target_user_id;
  DELETE FROM public.discussion_posts WHERE user_id = target_user_id;
  DELETE FROM public.shared_solutions WHERE user_id = target_user_id;
  DELETE FROM public.agent_runs WHERE user_id = target_user_id;
  DELETE FROM public.system_patch_proposals WHERE proposed_by = target_user_id;
  DELETE FROM public.issues WHERE user_id = target_user_id;
  
  -- Clear data from tables linked to problems
  DELETE FROM public.analyses WHERE user_id = target_user_id;
  DELETE FROM public.hints WHERE user_id = target_user_id;
  DELETE FROM public.solutions WHERE user_id = target_user_id;
  DELETE FROM public.test_cases WHERE user_id = target_user_id;
  DELETE FROM public.custom_problems WHERE user_id = target_user_id;
  DELETE FROM public.problems WHERE user_id = target_user_id;
  
  -- 3. Clear Profile
  DELETE FROM public.profiles WHERE id = target_user_id;
  
  -- 4. Finally, remove the Auth account
  DELETE FROM auth.users WHERE id = target_user_id;
END;
$$;

-- Updated Function to allow Admins OR the Owner to reset a password
CREATE OR REPLACE FUNCTION admin_reset_password(target_user_id UUID, new_password TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- CHECK: Is the requester an admin OR the owner of the account?
  IF NOT (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
    OR auth.uid() = target_user_id
  ) THEN
    RAISE EXCEPTION 'Permission denied: You can only reset your own password or must be an admin.';
  END IF;

  -- Update the password in auth.users
  UPDATE auth.users 
  SET encrypted_password = crypt(new_password, gen_salt('bf'))
  WHERE id = target_user_id;
END;
$$;

-- Updated Function to allow Admins OR the Owner to reset a username
CREATE OR REPLACE FUNCTION admin_reset_username(target_user_id UUID, new_username TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- CHECK: Is the requester an admin OR the owner of the account?
  IF NOT (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
    OR auth.uid() = target_user_id
  ) THEN
    RAISE EXCEPTION 'Permission denied: You can only change your own username or must be an admin.';
  END IF;

  -- Update the username in public.profiles
  UPDATE public.profiles 
  SET username = new_username
  WHERE id = target_user_id;
END;
$$;
