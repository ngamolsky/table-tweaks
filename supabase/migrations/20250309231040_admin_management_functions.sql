-- Create a table to track admin users
CREATE TABLE IF NOT EXISTS "public"."admin_users" (
  "id" UUID NOT NULL,
  "email" TEXT NOT NULL,
  "added_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  "added_by" UUID,
  CONSTRAINT "admin_users_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "admin_users_email_key" UNIQUE ("email"),
  CONSTRAINT "admin_users_id_fkey" FOREIGN KEY ("id") REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Enable RLS on admin_users table
ALTER TABLE "public"."admin_users" ENABLE ROW LEVEL SECURITY;

-- Only admins can view the admin_users table
CREATE POLICY "Only admins can view admin users"
  ON "public"."admin_users"
  FOR SELECT
  USING (is_admin());

-- Only admins can insert into the admin_users table
CREATE POLICY "Only admins can add admin users"
  ON "public"."admin_users"
  FOR INSERT
  WITH CHECK (is_admin());

-- Only admins can update the admin_users table
CREATE POLICY "Only admins can update admin users"
  ON "public"."admin_users"
  FOR UPDATE
  USING (is_admin());

-- Only admins can delete from the admin_users table
CREATE POLICY "Only admins can remove admin users"
  ON "public"."admin_users"
  FOR DELETE
  USING (is_admin());

-- Function to add a user as an admin
CREATE OR REPLACE FUNCTION public.add_admin_user(user_email TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  user_id UUID;
BEGIN
  -- Check if the current user is an admin
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only admins can add other admins';
    RETURN FALSE;
  END IF;

  -- Find the user ID from the email
  SELECT id INTO user_id FROM auth.users WHERE email = user_email;
  
  IF user_id IS NULL THEN
    RAISE EXCEPTION 'User with email % not found', user_email;
    RETURN FALSE;
  END IF;

  -- Add the user to the admin_users table
  INSERT INTO public.admin_users (id, email, added_by)
  VALUES (user_id, user_email, auth.uid())
  ON CONFLICT (id) DO NOTHING;

  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to add admin user: %', SQLERRM;
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to remove a user from admin role
CREATE OR REPLACE FUNCTION public.remove_admin_user(user_email TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  user_id UUID;
BEGIN
  -- Check if the current user is an admin
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only admins can remove other admins';
    RETURN FALSE;
  END IF;

  -- Find the user ID from the email
  SELECT id INTO user_id FROM auth.users WHERE email = user_email;
  
  IF user_id IS NULL THEN
    RAISE EXCEPTION 'User with email % not found', user_email;
    RETURN FALSE;
  END IF;

  -- Remove the user from the admin_users table
  DELETE FROM public.admin_users WHERE id = user_id;

  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to remove admin user: %', SQLERRM;
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if a user is an admin by email
CREATE OR REPLACE FUNCTION public.is_user_admin(user_email TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.admin_users WHERE email = user_email
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a trigger function to automatically grant admin role when a user is added to admin_users
CREATE OR REPLACE FUNCTION public.handle_admin_user_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- When a new admin user is added
  IF TG_OP = 'INSERT' THEN
    -- Grant admin role to the user
    EXECUTE format('GRANT admin TO auth_uid(%L)::text', NEW.id);
  -- When an admin user is removed
  ELSIF TG_OP = 'DELETE' THEN
    -- Revoke admin role from the user
    EXECUTE format('REVOKE admin FROM auth_uid(%L)::text', OLD.id);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers for admin_users table
CREATE TRIGGER on_admin_user_added
  AFTER INSERT ON public.admin_users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_admin_user_changes();

CREATE TRIGGER on_admin_user_removed
  AFTER DELETE ON public.admin_users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_admin_user_changes();
