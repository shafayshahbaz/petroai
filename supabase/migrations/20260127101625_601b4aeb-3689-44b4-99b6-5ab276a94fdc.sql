-- Create platform_settings table for global admin settings
CREATE TABLE public.platform_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  value text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

-- Only super admins can manage platform settings
CREATE POLICY "Super admins can view platform settings"
ON public.platform_settings
FOR SELECT
USING (is_super_admin());

CREATE POLICY "Super admins can insert platform settings"
ON public.platform_settings
FOR INSERT
WITH CHECK (is_super_admin());

CREATE POLICY "Super admins can update platform settings"
ON public.platform_settings
FOR UPDATE
USING (is_super_admin());

CREATE POLICY "Super admins can delete platform settings"
ON public.platform_settings
FOR DELETE
USING (is_super_admin());

-- Allow authenticated users to read tutorial video (specific key)
CREATE POLICY "Authenticated users can view tutorial video"
ON public.platform_settings
FOR SELECT
TO authenticated
USING (key = 'tutorial_video_id');

-- Add trigger for updated_at
CREATE TRIGGER update_platform_settings_updated_at
BEFORE UPDATE ON public.platform_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();