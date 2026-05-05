
-- RPC to safely update user role
CREATE OR REPLACE FUNCTION admin_update_user_role(target_user_id UUID, new_role public.app_role)
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
    RAISE EXCEPTION 'Permission Denied: Only admins can change user roles.';
  END IF;

  -- 2. Delete existing roles for the user
  DELETE FROM public.user_roles WHERE user_id = target_user_id;

  -- 3. Insert the new role
  INSERT INTO public.user_roles (user_id, role) VALUES (target_user_id, new_role);
END;
$$;
