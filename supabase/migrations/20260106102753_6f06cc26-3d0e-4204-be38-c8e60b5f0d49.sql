-- Create table for Image AI Models (separate from chat models)
CREATE TABLE public.image_ai_models (
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
ALTER TABLE public.image_ai_models ENABLE ROW LEVEL SECURITY;

-- Admin policies for image_ai_models
CREATE POLICY "Admins can view image_ai_models" 
  ON public.image_ai_models 
  FOR SELECT 
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert image_ai_models" 
  ON public.image_ai_models 
  FOR INSERT 
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update image_ai_models" 
  ON public.image_ai_models 
  FOR UPDATE 
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete image_ai_models" 
  ON public.image_ai_models 
  FOR DELETE 
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_image_ai_models_updated_at
  BEFORE UPDATE ON public.image_ai_models
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();