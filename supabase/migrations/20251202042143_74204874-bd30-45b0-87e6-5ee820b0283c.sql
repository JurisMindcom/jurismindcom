-- Create table for Bangladesh Laws
CREATE TABLE IF NOT EXISTS public.bangladesh_laws (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  law_title TEXT NOT NULL,
  law_title_bn TEXT,
  act_number TEXT,
  year INTEGER,
  chapter TEXT,
  section_number TEXT,
  section_title TEXT,
  section_content TEXT NOT NULL,
  section_content_bn TEXT,
  status TEXT DEFAULT 'active',
  amendments TEXT,
  source_url TEXT,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for search performance
CREATE INDEX IF NOT EXISTS idx_bangladesh_laws_title ON public.bangladesh_laws(law_title);
CREATE INDEX IF NOT EXISTS idx_bangladesh_laws_year ON public.bangladesh_laws(year);
CREATE INDEX IF NOT EXISTS idx_bangladesh_laws_section ON public.bangladesh_laws(section_number);
CREATE INDEX IF NOT EXISTS idx_bangladesh_laws_status ON public.bangladesh_laws(status);

-- Full-text search index
CREATE INDEX IF NOT EXISTS idx_bangladesh_laws_content_search ON public.bangladesh_laws USING gin(to_tsvector('english', section_content));

-- Enable RLS
ALTER TABLE public.bangladesh_laws ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Laws viewable by all authenticated users"
  ON public.bangladesh_laws
  FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage laws"
  ON public.bangladesh_laws
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Add document text extraction column
ALTER TABLE public.documents 
  ADD COLUMN IF NOT EXISTS extracted_text TEXT,
  ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'unknown';

-- Create law source sync log table
CREATE TABLE IF NOT EXISTS public.law_source_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  sync_completed_at TIMESTAMP WITH TIME ZONE,
  total_laws_synced INTEGER DEFAULT 0,
  status TEXT DEFAULT 'in_progress',
  error_message TEXT,
  synced_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.law_source_sync_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for sync log
CREATE POLICY "Admins can view sync logs"
  ON public.law_source_sync_log
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage sync logs"
  ON public.law_source_sync_log
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));