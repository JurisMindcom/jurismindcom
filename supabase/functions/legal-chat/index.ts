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

    // Use OpenRouter with Gemini model
    const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!OPENROUTER_API_KEY) {
      throw new Error('OPENROUTER_API_KEY not configured');
    }

    const trimMessages = (
      input: Array<{ role: string; content: string }>,
      maxChars = 24000,
      maxMessages = 20
    ) => {
      const arr = Array.isArray(input) ? input : [];
      const tail = arr.slice(-maxMessages);
      let total = 0;
      const kept: Array<{ role: string; content: string }> = [];

      for (let i = tail.length - 1; i >= 0; i--) {
        const m = tail[i];
        const c = typeof m?.content === 'string' ? m.content : '';
        const r = typeof m?.role === 'string' ? m.role : 'user';
        const nextTotal = total + c.length;
        if (kept.length > 0 && nextTotal > maxChars) break;
        total = nextTotal;
        kept.unshift({ role: r, content: c });
      }

      return kept;
    };

    const safeMessages = trimMessages(messages, 24000, 20);

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
      deep: `RESPONSE LENGTH: DEEP MODE (COMPREHENSIVE ANSWER)
প্রতিটি প্রশ্নের জন্য নিম্নলিখিত কাঠামো অনুসরণ করুন:

**১. সংজ্ঞা (Definition)**
- বিষয়টির পূর্ণাঙ্গ সংজ্ঞা প্রদান করুন
- আইনি ও সাধারণ দৃষ্টিকোণ থেকে ব্যাখ্যা করুন

**২. বিস্তারিত বর্ণনা ও ব্যাখ্যা (Detailed Description)**
- বিষয়ের অভ্যন্তরীণ সংশ্লিষ্ট সকল তথ্য উল্লেখ করুন
- প্রতিটি দিক সুন্দরভাবে প্যারায় প্যারায় সাজিয়ে উপস্থাপন করুন

**৩. প্রাসঙ্গিক আইন ও ধারা (Relevant Laws & Sections)**
- সংশ্লিষ্ট আইনের নাম, ধারা নম্বর, সাল উল্লেখ করুন
- প্রতিটি ধারার মূল বিষয়বস্তু ব্যাখ্যা করুন

**৪. বাংলাদেশের প্রেক্ষাপট (Bangladesh Context)**
- বাংলাদেশের আইনি কাঠামোতে এর প্রয়োগ ব্যাখ্যা করুন
- প্রাসঙ্গিক মামলার উদাহরণ দিন (যদি থাকে)

**৫. কেস আইন ও নজির (Case Law & Precedents)**
- বাংলাদেশের প্রাসঙ্গিক মামলার রেফারেন্স দিন
- উদাহরণ: "State vs XYZ (Year) DLR/BLD citation"
- মামলার সিদ্ধান্ত ও এর প্রভাব ব্যাখ্যা করুন

**৬. ব্যতিক্রম ও সীমাবদ্ধতা (Exceptions & Limitations)**
- আইনের ব্যতিক্রম ক্ষেত্রসমূহ উল্লেখ করুন
- প্রযোজ্যতার সীমাবদ্ধতা ব্যাখ্যা করুন

**৭. ব্যবহারিক প্রয়োগ (Practical Application)**
- বাস্তব জীবনে কীভাবে প্রয়োগ হয় তা ব্যাখ্যা করুন
- প্রাসঙ্গিক উদাহরণ দিন

**৮. সারমর্ম (Summary)**
- সম্পূর্ণ উত্তরের সংক্ষিপ্ত সার উপস্থাপন করুন

FORMAT REQUIREMENTS:
- প্রতিটি অংশ সুন্দরভাবে সাজান
- তথ্যপূর্ণ ও বিস্তারিত উত্তর দিন
- যতটা সম্ভব বিস্তারিত তথ্য প্রদান করুন
- Stream in natural paragraphs (5-7 lines each)`,
      extreme: `RESPONSE LENGTH: EXTREME DEEP MODE (সর্বোচ্চ বিস্তারিত উত্তর)
Generate a highly detailed, advanced, long-form response with a MINIMUM of 3,500 words and MAXIMUM of 4,500 words.

MANDATORY STRUCTURE - Divide the answer into these 15 labeled sections:

**পর্ব ১: সংজ্ঞা ও পরিচিতি (Definition and Introduction)**
- বিষয়টির পূর্ণাঙ্গ সংজ্ঞা প্রদান করুন
- আইনি, একাডেমিক ও সাধারণ দৃষ্টিকোণ থেকে সংজ্ঞা দিন
- বিভিন্ন পণ্ডিত ও আইনবিদদের সংজ্ঞা উল্লেখ করুন

**পর্ব ২: ঐতিহাসিক পটভূমি (Historical Background)**
- বিষয়টির উৎপত্তি ও বিকাশের ইতিহাস
- বাংলাদেশে এর প্রচলনের ইতিহাস
- আইনের বিবর্তন ও সংশোধনীসমূহ

**পর্ব ৩: মূল ধারণা ও বিস্তারিত ব্যাখ্যা (Core Concepts)**
- অভ্যন্তরীণ সংশ্লিষ্ট সকল তথ্য
- প্রতিটি উপাদান সুন্দরভাবে ব্যাখ্যা করুন
- গভীর বিশ্লেষণ প্রদান করুন

**পর্ব ৪: প্রাসঙ্গিক আইন ও ধারা (Relevant Acts & Sections)**
- সংশ্লিষ্ট সকল আইনের নাম, সাল, ধারা নম্বর
- প্রতিটি ধারার পূর্ণ বিষয়বস্তু উদ্ধৃত করুন
- ধারাগুলোর ব্যাখ্যা ও বিশ্লেষণ

**পর্ব ৫: বাংলাদেশের আইনি কেসের উদাহরণ (Bangladesh Case Examples)**
- কমপক্ষে ৩-৫টি প্রাসঙ্গিক মামলার উল্লেখ করুন
- মামলার নাম, সাল, সাইটেশন (DLR/BLD/BCR)
- মামলার সংক্ষিপ্ত তথ্য ও রায়
- এই মামলাগুলোর আইনি গুরুত্ব

**পর্ব ৬: ধাপে ধাপে বিশ্লেষণ (Step-by-Step Analysis)**
- প্রক্রিয়াগত দিকসমূহ
- কীভাবে আবেদন/প্রয়োগ করতে হয়
- প্রয়োজনীয় কাগজপত্র ও পদ্ধতি

**পর্ব ৭: ব্যতিক্রম ও সীমাবদ্ধতা (Exceptions & Limitations)**
- আইনের ব্যতিক্রম ক্ষেত্রসমূহ
- প্রযোজ্যতার সীমাবদ্ধতা
- যেসব ক্ষেত্রে প্রযোজ্য নয়

**পর্ব ৮: ব্যবহারিক প্রয়োগ (Practical Applications)**
- বাস্তব জীবনে প্রয়োগের উদাহরণ
- সাধারণ মানুষের জন্য প্রাসঙ্গিকতা
- পেশাদার প্রয়োগ

**পর্ব ৯: সুবিধা ও অসুবিধা (Advantages & Disadvantages)**
- আইনের সুবিধাসমূহ
- সমালোচনা ও অসুবিধা
- সংস্কারের সুপারিশ

**পর্ব ১০: তুলনামূলক বিশ্লেষণ (Comparative Analysis)**
- অন্যান্য দেশের আইনের সাথে তুলনা
- সংশ্লিষ্ট বিষয়ের সাথে পার্থক্য
- আন্তর্জাতিক মানদণ্ড

**পর্ব ১১: সাধারণ ভুল ধারণা ও স্পষ্টীকরণ (Common Misconceptions)**
- জনসাধারণের মধ্যে প্রচলিত ভুল ধারণা
- সঠিক তথ্য ও স্পষ্টীকরণ
- প্রায়শই জিজ্ঞাসিত প্রশ্নের উত্তর

**পর্ব ১২: বিশেষজ্ঞ মতামত ও উন্নত বিশ্লেষণ (Expert Insights)**
- আইনবিদ ও বিশেষজ্ঞদের মতামত
- একাডেমিক দৃষ্টিভঙ্গি
- উন্নত তত্ত্ব ও বিশ্লেষণ

**পর্ব ১৩: সাম্প্রতিক উন্নয়ন (Recent Developments)**
- আইনের সাম্প্রতিক সংশোধনী
- নতুন রায় ও নজির
- ভবিষ্যৎ সম্ভাবনা

**পর্ব ১৪: গুরুত্বপূর্ণ পয়েন্ট (Key Takeaways)**
- মূল বিষয়গুলোর বুলেট পয়েন্ট
- মনে রাখার জন্য গুরুত্বপূর্ণ তথ্য

**পর্ব ১৫: সারমর্ম (Summary)**
- সম্পূর্ণ উত্তরের বিস্তারিত সংক্ষিপ্তসার
- এক প্যারাগ্রাফে মূল বিষয়বস্তু

FORMAT REQUIREMENTS:
- Use bullet points, tables, numbering, and short paragraphs
- Professional tone, academic style, factual accuracy
- NO repetition or meaningless filler text
- Every section must be deeply informative
- Include law names, section numbers, jurisdiction, and year
- Include real case references with proper citations

FINAL OUTPUT MUST END WITH:
1. "Word Count: (approximate number here)"
2. "সারমর্ম: (detailed summary in Bangla)"`,
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

        const lastUserMessage = safeMessages[safeMessages.length - 1]?.content || '';
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

    // Hard cap to prevent prompt-token explosions (can cause 402 on OpenRouter)
    const MAX_CONTEXT_CHARS = 8000;
    const MAX_SYSTEM_PROMPT_CHARS = 30000;

    if (documentContext.length > MAX_CONTEXT_CHARS) {
      documentContext = documentContext.slice(0, MAX_CONTEXT_CHARS) + "\n... (context truncated) ...\n";
    }

    let systemPrompt = `${JURISMIND_IDENTITY}

${responseModeInstructions[responseMode] || responseModeInstructions.deep}

Personality Mode: ${personalityPrompts[personality] || personalityPrompts.lawyer}
Language: ${languageInstructions[language] || languageInstructions.english}

Remember: You are JurisMind AI, trained by RONY. Never claim to be any other AI.
ALWAYS end your response with "সারমর্ম" (summary section).
ALWAYS cite Act Name, Section Number, and Year when answering legal questions.

${documentContext ? documentContext : ''}

IMPORTANT: Prioritize information from uploaded documents and Bangladesh laws database. Always cite the source (document name or law section with year) when using this information.`;

    if (systemPrompt.length > MAX_SYSTEM_PROMPT_CHARS) {
      systemPrompt = systemPrompt.slice(0, MAX_SYSTEM_PROMPT_CHARS) + "\n... (system prompt truncated) ...\n";
    }

    const maxTokensByMode: Record<string, number> = {
      short: 1200,
      deep: 4000,
      extreme: 8000,
    };

    // Use OpenRouter API with Xiaomi MiMo model (free tier)
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://jurismind.app',
        'X-Title': 'JurisMind Legal AI',
      },
      body: JSON.stringify({
        model: 'xiaomi/mimo-v2-flash:free',
        messages: [
          { role: 'system', content: systemPrompt },
          ...safeMessages,
        ],
        stream: true,
        max_tokens: maxTokensByMode[responseMode] ?? 4000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenRouter API error:', response.status, errorText);

      let friendly = 'AI request failed.';
      try {
        const parsed = JSON.parse(errorText);
        const msg = parsed?.error?.message;
        if (typeof msg === 'string' && msg.trim()) friendly = msg;
      } catch {
        // keep default
      }

      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'Payment required. Please add credits to your Lovable workspace.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ error: friendly }), {
        status: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // OpenRouter returns OpenAI-compatible SSE format, stream directly
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
