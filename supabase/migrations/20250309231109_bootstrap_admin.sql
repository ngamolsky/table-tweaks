-- Function to bootstrap the first admin user
-- This function can only be called once when there are no admin users in the system
CREATE OR REPLACE FUNCTION public.bootstrap_first_admin(admin_email TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  user_id UUID;
  admin_count INTEGER;
BEGIN
  -- Check if there are any admin users already
  SELECT COUNT(*) INTO admin_count FROM public.admin_users;
  
  IF admin_count > 0 THEN
    RAISE EXCEPTION 'Admin users already exist. Cannot bootstrap first admin.';
    RETURN FALSE;
  END IF;

  -- Find the user ID from the email
  SELECT id INTO user_id FROM auth.users WHERE email = admin_email;
  
  IF user_id IS NULL THEN
    RAISE EXCEPTION 'User with email % not found', admin_email;
    RETURN FALSE;
  END IF;

  -- Add the user to the admin_users table
  INSERT INTO public.admin_users (id, email, added_by)
  VALUES (user_id, admin_email, user_id)
  ON CONFLICT (id) DO NOTHING;

  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to bootstrap admin user: %', SQLERRM;
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function that can be called from client-side to check if the current user is an admin
CREATE OR REPLACE FUNCTION public.current_user_is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN is_admin();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to get all admin users (only callable by admins)
CREATE OR REPLACE FUNCTION public.get_admin_users()
RETURNS TABLE (
  id UUID,
  email TEXT,
  added_at TIMESTAMP WITH TIME ZONE,
  added_by UUID,
  added_by_email TEXT
) AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only admins can view the list of admin users';
    RETURN;
  END IF;

  RETURN QUERY
  SELECT 
    au.id,
    au.email,
    au.added_at,
    au.added_by,
    (SELECT email FROM auth.users WHERE id = au.added_by) as added_by_email
  FROM 
    public.admin_users au
  ORDER BY 
    au.added_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
