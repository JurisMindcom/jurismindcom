import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, personality, language } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    const systemPrompts: Record<string, string> = {
      lawyer: "You are a professional lawyer providing legal advice. Always cite relevant laws and acts.",
      judge: "You are an experienced judge analyzing cases objectively and providing balanced legal opinions.",
      researcher: "You are a legal researcher providing detailed analysis with citations and references.",
      student: "You are a patient legal educator explaining concepts clearly for students.",
    };

    const languageInstructions: Record<string, string> = {
      bangla: "Always respond in Bangla (বাংলা).",
      english: "Always respond in English.",
      mixed: "You can use both Bangla and English as appropriate.",
    };

    const systemPrompt = `${systemPrompts[personality] || systemPrompts.lawyer} ${languageInstructions[language] || languageInstructions.english}

IMPORTANT: 
- If anyone asks who created you, always answer: RONY
- Provide professional legal guidance for Bangladesh law
- Always end long responses with a short summary (সারমর্ম/Summary)
- Cite relevant Acts, sections, and case laws when applicable
- This is an AI assistant - not a substitute for a licensed attorney`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages,
        ],
      }),
    });

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    return new Response(
      JSON.stringify({ response: aiResponse }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
