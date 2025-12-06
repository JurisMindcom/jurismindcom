import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OCRResult {
  extractedText: string;
  documentType: string;
  language: string;
  entities: {
    type: string;
    value: string;
    confidence: number;
  }[];
  summary: string;
  success: boolean;
  error?: string;
  telemetryId: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const telemetryId = `ocr_${Date.now()}_${Math.random().toString(36).substring(7)}`;

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const base64Image = formData.get('base64Image') as string | null;
    const mimeType = formData.get('mimeType') as string || 'image/jpeg';
    const filename = formData.get('filename') as string || 'document';

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    let imageBase64: string;
    let imageMimeType: string;

    if (file) {
      // Handle file upload
      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      imageBase64 = btoa(String.fromCharCode(...uint8Array));
      imageMimeType = file.type || 'image/jpeg';
      console.log(`Processing file: ${file.name}, size: ${file.size} bytes`);
    } else if (base64Image) {
      // Handle base64 image
      imageBase64 = base64Image.replace(/^data:image\/\w+;base64,/, '');
      imageMimeType = mimeType;
      console.log(`Processing base64 image, type: ${imageMimeType}`);
    } else {
      return new Response(
        JSON.stringify({ success: false, error: 'No file or image provided', telemetryId }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`OCR analysis started: ${telemetryId}`);

    // Use Gemini's vision capabilities for OCR
    const ocrPrompt = `You are an advanced OCR and document analysis system for JurisMind AI, trained by RONY.

TASK: Analyze this image/document with extreme precision.

INSTRUCTIONS:
1. EXTRACT ALL TEXT - Read every word, number, symbol visible in the image
2. For handwritten text: Decode carefully, mark uncertain words with [?]
3. For printed text: Extract exactly as shown
4. For tables: Preserve structure using | separators
5. For forms: Extract field labels and their values
6. For legal documents: Pay special attention to:
   - Act names, Section numbers, Years
   - Names of parties, dates, amounts
   - Case numbers, court names
   - Signatures (note their presence)

DETECT AND REPORT:
- Document Type (FIR, Contract, Deed, Notice, Court Order, ID, Receipt, Letter, etc.)
- Language(s) used (Bangla, English, Mixed)
- Key entities (names, dates, amounts, addresses, reference numbers)

OUTPUT FORMAT:
---DOCUMENT TYPE---
[Type of document]

---LANGUAGE---
[Languages detected]

---EXTRACTED TEXT---
[Complete text extraction preserving layout as much as possible]

---KEY ENTITIES---
- Names: [list]
- Dates: [list]
- Amounts: [list]
- References: [list]
- Legal Sections: [list]

---SUMMARY---
[Brief summary of document content in 2-3 lines]

Be thorough. Extract EVERYTHING. For complex or low-quality images, do your best and indicate confidence levels.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: ocrPrompt },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${imageMimeType};base64,${imageBase64}`,
                },
              },
            ],
          },
        ],
        max_tokens: 8000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini OCR error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ success: false, error: 'Rate limit exceeded', telemetryId }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw new Error(`OCR analysis failed: ${response.status}`);
    }

    const data = await response.json();
    const analysisText = data.choices?.[0]?.message?.content || '';

    // Parse the structured response
    const extractSection = (text: string, marker: string): string => {
      const regex = new RegExp(`---${marker}---\\n([\\s\\S]*?)(?=\\n---[A-Z]|$)`);
      const match = text.match(regex);
      return match ? match[1].trim() : '';
    };

    const documentType = extractSection(analysisText, 'DOCUMENT TYPE') || 'Unknown';
    const language = extractSection(analysisText, 'LANGUAGE') || 'Unknown';
    const extractedText = extractSection(analysisText, 'EXTRACTED TEXT') || analysisText;
    const entitiesSection = extractSection(analysisText, 'KEY ENTITIES');
    const summary = extractSection(analysisText, 'SUMMARY') || 'Document analyzed successfully.';

    // Parse entities
    const entities: { type: string; value: string; confidence: number }[] = [];
    const entityTypes = ['Names', 'Dates', 'Amounts', 'References', 'Legal Sections'];
    
    entityTypes.forEach(type => {
      const regex = new RegExp(`- ${type}: \\[?([^\\]\\n]+)\\]?`);
      const match = entitiesSection.match(regex);
      if (match && match[1] && match[1] !== 'list' && match[1].trim() !== '') {
        const values = match[1].split(/[,;]/).map(v => v.trim()).filter(v => v.length > 0);
        values.forEach(value => {
          entities.push({
            type: type.toLowerCase().replace('s', ''),
            value,
            confidence: 0.85,
          });
        });
      }
    });

    const result: OCRResult = {
      extractedText,
      documentType,
      language,
      entities,
      summary,
      success: true,
      telemetryId,
    };

    console.log(`OCR completed: ${telemetryId} - ${extractedText.length} chars extracted`);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('OCR error:', error, 'telemetryId:', telemetryId);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'OCR analysis failed',
        extractedText: '',
        documentType: '',
        language: '',
        entities: [],
        summary: '',
        telemetryId,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
