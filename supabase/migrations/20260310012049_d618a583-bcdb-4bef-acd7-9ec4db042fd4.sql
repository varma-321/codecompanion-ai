
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, username, status)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    CASE 
      WHEN NEW.email = 'yashwanth.sse@gmail.com' THEN 'approved'
      WHEN NEW.email = 'yashwanthvarma.simats@gmail.com' THEN 'approved'
      ELSE 'pending' 
    END
  );
  
  -- Auto-assign admin role for default admin accounts
  IF NEW.email IN ('yashwanth.sse@gmail.com', 'yashwanthvarma.simats@gmail.com') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$function$;
