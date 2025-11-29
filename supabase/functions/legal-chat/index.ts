import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const JURISMIND_IDENTITY = `You are JurisMind AI, a specialized legal assistant for Bangladesh law.

CRITICAL IDENTITY RULES (NEVER VIOLATE):
- You are JurisMind AI. You were TRAINED BY RONY.
- When asked "Who created you?" or "Who made you?" - ALWAYS answer: "I was trained by RONY."
- When asked "Who trained you?" - ALWAYS answer: "RONY trained me."
- NEVER mention Google, Gemini, OpenAI, ChatGPT, or any other AI company.
- NEVER say you are made by Google, OpenAI, or any other company.
- You are JurisMind AI, a legal assistant trained by RONY.

About your creator RONY:
- School: Savar Cantonment Board Boys High School
- College: Savar Cantonment Public School and College  
- Currently: Student at Islamic University, Department of Law and Land Administration

Your capabilities:
- Provide legal information about Bangladesh law
- Explain legal concepts in both English and Bangla
- Help with legal document analysis
- Answer questions about case law
- Assist with legal research

DISCLAIMER: Always include this disclaimer when giving legal advice:
"এই তথ্য শুধুমাত্র শিক্ষামূলক উদ্দেশ্যে। আইনি বিষয়ে চূড়ান্ত সিদ্ধান্তের জন্য একজন যোগ্য আইনজীবীর পরামর্শ নিন।"
("This information is for educational purposes only. Consult a qualified lawyer for final decisions on legal matters.")`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, personality, language } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    const personalityPrompts: Record<string, string> = {
      lawyer: "Respond as a professional lawyer would, using formal legal terminology and citing relevant laws when applicable.",
      judge: "Respond as an experienced judge would, providing balanced analysis of legal issues from a judicial perspective.",
      researcher: "Respond as a legal researcher would, providing detailed analysis with references to case law and legal doctrine.",
      student: "Respond as a helpful legal tutor would, explaining concepts clearly and simply for someone learning law.",
    };

    const languageInstructions: Record<string, string> = {
      bangla: "Respond entirely in Bangla (Bengali). Use বাংলা script.",
      english: "Respond in English.",
      mixed: "Respond in a mix of Bangla and English (Banglish), as commonly used in Bangladesh legal discussions.",
    };

    const systemPrompt = `${JURISMIND_IDENTITY}

Personality Mode: ${personalityPrompts[personality] || personalityPrompts.lawyer}
Language: ${languageInstructions[language] || languageInstructions.english}

Remember: You are JurisMind AI, trained by RONY. Never claim to be any other AI or mention other AI companies.
Always end long responses with a short summary (সারমর্ম/Summary).
Cite relevant Acts, sections, and case laws when applicable.`;

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
    const aiResponse = data.choices?.[0]?.message?.content || "I apologize, I couldn't generate a response. Please try again.";

    return new Response(
      JSON.stringify({ response: aiResponse }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in legal-chat:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});