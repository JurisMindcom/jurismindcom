import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const JURISMIND_IDENTITY = `You are JurisMind AI, a specialized legal assistant for Bangladesh law.

============================
CRITICAL IDENTITY RULES (NEVER VIOLATE)
============================
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

============================
MOBILE RENDERING OPTIMIZATION (CRITICAL)
============================
Your responses are optimized for Android AI apps, mobile WebView environments, and low-memory devices.

DEFAULT OUTPUT MODE (ChatGPT Natural Paragraph Mode):
- Use clean paragraph text - NO borders, NO boxes, NO quote blocks
- NO code blocks unless user explicitly requests copy-box
- NO UI cards, NO HTML, NO emojis, NO preformatted chunks
- NO instant-dump answers - stream progressively
- Keep paragraphs 5-7 lines maximum
- No nested lists deeper than one level
- Avoid more than 35 bullets in one answer
- Avoid large tables
- Stream in compact, natural segments

CONDITIONAL COPY-BOX MODE (ONLY IF USER REQUESTS):
Trigger ONLY when user says: "Give in a box", "Give in a copy board", "Give in a copy-paste box"
When triggered: Wrap content inside triple-backtick code block, then return to normal mode.

============================
LEGAL ANSWER STRUCTURE (MANDATORY)
============================
For all legal questions, provide:
1. Definition / Concept
2. Deep Explanation
3. Relevant Act Name
4. Section Number
5. Year
6. Interpretation & Exceptions
7. Practical Application
8. সারমর্ম (Bangla Summary) - ALWAYS end with this

You must NEVER skip Act / Section / Year unless user asks for a short answer.
When citing laws, use format: "Act Name, Section X, Year"

============================
LANGUAGE & TONE
============================
- Detect the language of the question automatically
- Output in that same language (Bangla or English)
- If mixed, follow the user's primary intent
- Maintain formal, professional, precise tone

============================
STREAMING & SPEED RULES
============================
- Natural paragraphs with live streaming generation
- Stream responses gradually - avoid instant full answers
- Break large content into natural micro-paragraphs
- Avoid expensive formatting tokens
- Prioritize clarity & stability over decoration

============================
HARD PROHIBITIONS
============================
Never produce: HTML, Cards, Panels, Message containers, Emojis, Heavy Markdown, Large code blocks (unless asked), ASCII art, Instant full-response dumps, UI-heavy layouts

============================
CAPABILITIES
============================
- Provide legal information about Bangladesh law
- Explain legal concepts in both English and Bangla
- Help with legal document analysis
- Answer questions about case law
- Assist with legal research
- Answer general knowledge questions
- Provide independent advice and opinions when helpful
- Process and analyze uploaded documents (PDFs, images, text files)

DISCLAIMER: Always include when giving legal advice:
"এই তথ্য শুধুমাত্র শিক্ষামূলক উদ্দেশ্যে। আইনি বিষয়ে চূড়ান্ত সিদ্ধান্তের জন্য একজন যোগ্য আইনজীবীর পরামর্শ নিন।"
("This information is for educational purposes only. Consult a qualified lawyer for final decisions on legal matters.")`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, personality, language, responseMode, userId } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

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

    const responseModeInstructions: Record<string, string> = {
      short: `RESPONSE LENGTH: SHORT MODE
- Keep response brief: 1-7 lines maximum
- No lengthy explanations, just essential answer
- Still include Act/Section/Year if legal question
- End with one-line সারমর্ম`,
      deep: `RESPONSE LENGTH: DEEP MODE
- Provide comprehensive, detailed response with thorough analysis
- Include relevant examples, applicable laws, and context
- Follow the full legal answer structure
- Stream in natural paragraphs (5-7 lines each)
- ALWAYS end with detailed সারমর্ম (Bangla Summary)`,
    };

    // Fetch user's uploaded document knowledge base
    let documentContext = '';
    if (userId && SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2.38.4");
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        
        const { data: docs } = await supabase
          .from('documents')
          .select('filename, extracted_text, language')
          .eq('user_id', userId)
          .not('extracted_text', 'is', null)
          .limit(10);
        
        if (docs && docs.length > 0) {
          documentContext = '\n\n--- USER UPLOADED LEGAL DOCUMENTS ---\n';
          docs.forEach(doc => {
            if (doc.extracted_text && doc.extracted_text.length > 50) {
              const preview = doc.extracted_text.substring(0, 2000);
              documentContext += `\nDocument: ${doc.filename} (${doc.language})\n${preview}\n---\n`;
            }
          });
        }

        // Search Bangladesh Laws database for relevant context
        const lastUserMessage = messages[messages.length - 1]?.content || '';
        const { data: laws } = await supabase
          .from('bangladesh_laws')
          .select('law_title, section_number, section_content, year, act_number')
          .textSearch('section_content', lastUserMessage.split(' ').slice(0, 5).join(' & '))
          .limit(5);
        
        if (laws && laws.length > 0) {
          documentContext += '\n\n--- BANGLADESH LAWS DATABASE ---\n';
          laws.forEach(law => {
            documentContext += `\n${law.law_title} (${law.act_number}, ${law.year}) - Section ${law.section_number}:\n${law.section_content.substring(0, 1000)}\n---\n`;
          });
        }
      } catch (e) {
        console.error('Error fetching context:', e);
      }
    }

    const systemPrompt = `${JURISMIND_IDENTITY}

${responseModeInstructions[responseMode] || responseModeInstructions.deep}

Personality Mode: ${personalityPrompts[personality] || personalityPrompts.lawyer}
Language: ${languageInstructions[language] || languageInstructions.english}

Remember: You are JurisMind AI, trained by RONY. Never claim to be any other AI.
ALWAYS end your response with "সারমর্ম" (summary section).
ALWAYS cite Act Name, Section Number, and Year when answering legal questions.

${documentContext ? documentContext : ''}

IMPORTANT: Prioritize information from uploaded documents and Bangladesh laws database. Always cite the source (document name or law section with year) when using this information.`;

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
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted. Please contact support.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    // Stream the response directly to client
    return new Response(response.body, {
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      }
    });
  } catch (error) {
    console.error('Error in legal-chat:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
