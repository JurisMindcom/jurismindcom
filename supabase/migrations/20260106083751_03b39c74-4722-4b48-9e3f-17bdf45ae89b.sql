-- Create ai_models table to store AI model configurations
CREATE TABLE public.ai_models (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  model_name TEXT NOT NULL,
  provider TEXT NOT NULL DEFAULT 'google',
  api_key_encrypted TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.ai_models ENABLE ROW LEVEL SECURITY;

-- Only admins can view ai_models
CREATE POLICY "Admins can view ai_models"
ON public.ai_models
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Only admins can insert ai_models
CREATE POLICY "Admins can insert ai_models"
ON public.ai_models
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Only admins can update ai_models
CREATE POLICY "Admins can update ai_models"
ON public.ai_models
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- Only admins can delete ai_models
CREATE POLICY "Admins can delete ai_models"
ON public.ai_models
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- Create trigger for updated_at
CREATE TRIGGER update_ai_models_updated_at
BEFORE UPDATE ON public.ai_models
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to ensure only one model is active at a time
CREATE OR REPLACE FUNCTION public.ensure_single_active_model()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_active = true THEN
    UPDATE public.ai_models SET is_active = false WHERE id != NEW.id AND is_active = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to ensure single active model
CREATE TRIGGER ensure_single_active_model_trigger
BEFORE INSERT OR UPDATE ON public.ai_models
FOR EACH ROW
WHEN (NEW.is_active = true)
EXECUTE FUNCTION public.ensure_single_active_model();