-- Create storage bucket for AI generated images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('generated-images', 'generated-images', true)
ON CONFLICT (id) DO NOTHING;

-- Create policies for generated-images bucket
CREATE POLICY "Users can view their own generated images"
ON storage.objects FOR SELECT
USING (bucket_id = 'generated-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload their own generated images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'generated-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own generated images"
ON storage.objects FOR DELETE
USING (bucket_id = 'generated-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Add is_generated column to documents table to distinguish AI generated images
ALTER TABLE public.documents 
ADD COLUMN IF NOT EXISTS is_generated boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS generation_prompt text,
ADD COLUMN IF NOT EXISTS aspect_ratio text;