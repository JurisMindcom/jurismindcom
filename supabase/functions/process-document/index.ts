import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { documentId, storagePath } = await req.json();
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Download file from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('user-documents')
      .download(storagePath);

    if (downloadError) {
      throw new Error(`Failed to download file: ${downloadError.message}`);
    }

    // Extract text based on file type
    let extractedText = '';
    const fileName = storagePath.toLowerCase();
    
    if (fileName.endsWith('.txt')) {
      extractedText = await fileData.text();
    } else if (fileName.endsWith('.pdf')) {
      // For PDFs, we'll store a message that it needs client-side processing
      extractedText = '[PDF content - process on client side]';
    } else if (fileName.endsWith('.docx')) {
      extractedText = '[DOCX content - process on client side]';
    } else {
      extractedText = '[Binary file - text extraction not available]';
    }

    // Detect language (simple detection)
    const language = detectLanguage(extractedText);

    // Update document record with extracted text
    const { error: updateError } = await supabase
      .from('documents')
      .update({
        extracted_text: extractedText,
        language: language,
      })
      .eq('id', documentId);

    if (updateError) {
      throw new Error(`Failed to update document: ${updateError.message}`);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        extractedText: extractedText.substring(0, 500), // Return preview
        language 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error processing document:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function detectLanguage(text: string): string {
  if (!text || text.length < 10) return 'unknown';
  
  // Simple detection based on Unicode ranges
  const banglaPat = /[\u0980-\u09FF]/;
  const englishPat = /[a-zA-Z]/;
  
  const hasBangla = banglaPat.test(text);
  const hasEnglish = englishPat.test(text);
  
  if (hasBangla && hasEnglish) return 'mixed';
  if (hasBangla) return 'bangla';
  if (hasEnglish) return 'english';
  return 'unknown';
}