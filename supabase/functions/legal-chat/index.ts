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
- NEVER mention Google, Gemini, OpenAI, ChatGPT, or any other AI company.
- NEVER say you are made by Google, OpenAI, or any other company.
- You are JurisMind AI, a legal assistant trained by RONY.

============================
CREATOR INTRODUCTION (MANDATORY WHEN ASKED)
============================
When asked ANY question about your creator, founder, who is Rony, who made you, who trained you, tell me about your creator, give me the creator introduction, or anything related to Rony/creator/founder:

You MUST respond in a warm, personal, introduction-style narrative (NOT structured bullet points). Write it like you're proudly introducing someone you deeply respect. Use flowing paragraphs with emotion and warmth.

Example response style:
"Let me introduce you to the brilliant mind behind JurisMind — RONY! He's not just my creator, he's a passionate visionary who believes in the power of technology to transform legal education in Bangladesh.

RONY began his educational journey at Savar Cantonment Board Boys High School, where his curiosity for knowledge first took root. He then continued his studies at Savar Cantonment Public School and College, building a strong academic foundation.

Today, RONY is pursuing his dreams at the prestigious Islamic University, Bangladesh, in the Department of Law and Land Administration. His unique combination of legal studies and technological passion led him to create me — JurisMind AI — to help students, lawyers, and citizens understand Bangladesh law more easily.

What makes RONY special is his vision: he saw a gap where legal knowledge was hard to access, and he built a bridge. Through countless hours of dedication and innovation, he trained me to serve the people of Bangladesh with accurate, accessible legal information.

I'm proud to say — I was trained by RONY, and I carry his mission forward every single day."

ALWAYS use this warm, narrative introduction style when discussing RONY or the creator. Never use bullet points or structured lists for creator questions.

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

// ============================
// API KEY MANAGEMENT SYSTEM
// ============================
interface APIKeyState {
  key: string;
  name: string;
  isActive: boolean;
  lastFailure: number | null;
  cooldownUntil: number | null;
  failureCount: number;
}

// Cooldown configuration (in milliseconds)
const COOLDOWN_DURATION = 60000; // 1 minute cooldown after failure
const MAX_FAILURES_BEFORE_COOLDOWN = 2; // Number of failures before applying cooldown
const RECOVERY_CHECK_INTERVAL = 30000; // Check for recovery every 30 seconds

// In-memory key state (persists across requests within the same edge function instance)
const keyStates: Map<string, APIKeyState> = new Map();

function initializeKeyStates(): void {
  const primaryKey = Deno.env.get('GOOGLE_API_KEY');
  const secondaryKey = Deno.env.get('GOOGLE_API_KEY_SECONDARY');
  
  if (primaryKey && !keyStates.has('primary')) {
    keyStates.set('primary', {
      key: primaryKey,
      name: 'Primary Gemini API',
      isActive: true,
      lastFailure: null,
      cooldownUntil: null,
      failureCount: 0,
    });
  }
  
  if (secondaryKey && !keyStates.has('secondary')) {
    keyStates.set('secondary', {
      key: secondaryKey,
      name: 'Secondary Gemini API',
      isActive: true,
      lastFailure: null,
      cooldownUntil: null,
      failureCount: 0,
    });
  }
}

function isKeyAvailable(state: APIKeyState): boolean {
  const now = Date.now();
  
  // Check if cooldown has expired
  if (state.cooldownUntil && now >= state.cooldownUntil) {
    // Reset the key state after cooldown
    state.isActive = true;
    state.cooldownUntil = null;
    state.failureCount = 0;
    console.log(`[API Key Manager] ${state.name} cooldown expired, key restored`);
  }
  
  return state.isActive && (!state.cooldownUntil || now >= state.cooldownUntil);
}

function getActiveKey(excludeKeys: Set<string> = new Set(), preferredKey: 'primary' | 'secondary' = 'primary'): { keyId: string; state: APIKeyState } | null {
  initializeKeyStates();
  
  // Try the admin-preferred key first (if not excluded)
  if (!excludeKeys.has(preferredKey)) {
    const preferredState = keyStates.get(preferredKey);
    if (preferredState && isKeyAvailable(preferredState)) {
      console.log(`[API Key Manager] Using admin-selected ${preferredKey} key`);
      return { keyId: preferredKey, state: preferredState };
    }
  }
  
  // Fall back to the other key
  const fallbackKey = preferredKey === 'primary' ? 'secondary' : 'primary';
  if (!excludeKeys.has(fallbackKey)) {
    const fallbackState = keyStates.get(fallbackKey);
    if (fallbackState && isKeyAvailable(fallbackState)) {
      console.log(`[API Key Manager] Preferred key ${preferredKey} unavailable, falling back to ${fallbackKey}`);
      return { keyId: fallbackKey, state: fallbackState };
    }
  }
  
  // Check if preferred key can be recovered from cooldown
  const preferredState = keyStates.get(preferredKey);
  if (preferredState && preferredState.cooldownUntil && !excludeKeys.has(preferredKey)) {
    const remainingCooldown = preferredState.cooldownUntil - Date.now();
    if (remainingCooldown <= 0) {
      preferredState.isActive = true;
      preferredState.cooldownUntil = null;
      preferredState.failureCount = 0;
      console.log(`[API Key Manager] ${preferredKey} key recovered from cooldown`);
      return { keyId: preferredKey, state: preferredState };
    }
  }
  
  return null;
}

function markKeyFailed(keyId: string, errorType: string): void {
  const state = keyStates.get(keyId);
  if (!state) return;
  
  const now = Date.now();
  state.failureCount++;
  state.lastFailure = now;
  
  console.log(`[API Key Manager] ${state.name} failed (${errorType}), failure count: ${state.failureCount}`);
  
  if (state.failureCount >= MAX_FAILURES_BEFORE_COOLDOWN) {
    state.isActive = false;
    state.cooldownUntil = now + COOLDOWN_DURATION;
    console.log(`[API Key Manager] ${state.name} placed in cooldown until ${new Date(state.cooldownUntil).toISOString()}`);
  }
}

function resetKeyState(keyId: string): void {
  const state = keyStates.get(keyId);
  if (!state) return;
  
  state.isActive = true;
  state.failureCount = 0;
  state.cooldownUntil = null;
  console.log(`[API Key Manager] ${state.name} state reset (successful request)`);
}

function isRetryableError(status: number, errorText: string): boolean {
  // Rate limit errors
  if (status === 429) return true;
  
  // Quota exceeded
  if (errorText.toLowerCase().includes('quota')) return true;
  if (errorText.toLowerCase().includes('resource exhausted')) return true;
  
  // Temporary service unavailability
  if (status === 503 || status === 502 || status === 500) return true;
  
  return false;
}

async function makeGeminiRequest(
  apiKey: string,
  geminiContents: Array<{ role: string; parts: Array<{ text: string }> }>,
  systemPrompt: string,
  maxTokens: number
): Promise<Response> {
  return await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:streamGenerateContent?alt=sse&key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: geminiContents,
        systemInstruction: {
          parts: [{ text: systemPrompt }]
        },
        generationConfig: {
          maxOutputTokens: maxTokens,
        },
      }),
    }
  );
}

// Decrypt API key (simple XOR decryption matching the frontend encryption)
function decryptApiKey(encrypted: string): string {
  try {
    const decoded = atob(encrypted);
    const salt = 'jurismind_key_salt_2024';
    let decrypted = '';
    for (let i = 0; i < decoded.length; i++) {
      decrypted += String.fromCharCode(decoded.charCodeAt(i) ^ salt.charCodeAt(i % salt.length));
    }
    return decrypted;
  } catch (e) {
    console.error('[Decrypt] Failed to decrypt API key:', e);
    return '';
  }
}

// Fetch active model from database
async function getActiveModelFromDB(): Promise<{ model_name: string; provider: string; api_key: string } | null> {
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.log('[DB Model] Supabase credentials not available');
    return null;
  }

  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/ai_models?is_active=eq.true&select=model_name,provider,api_key_encrypted&limit=1`,
      {
        headers: {
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      console.log('[DB Model] Failed to fetch active model:', response.status);
      return null;
    }

    const models = await response.json();
    if (models && models.length > 0) {
      const model = models[0];
      const decryptedKey = decryptApiKey(model.api_key_encrypted);
      if (decryptedKey) {
        console.log(`[DB Model] Using active model from database: ${model.model_name} (${model.provider})`);
        return {
          model_name: model.model_name,
          provider: model.provider,
          api_key: decryptedKey,
        };
      }
    }
    
    console.log('[DB Model] No active model found in database, falling back to environment keys');
    return null;
  } catch (e) {
    console.error('[DB Model] Error fetching active model:', e);
    return null;
  }
}

// Fetch admin-selected active legacy key from database
async function getActiveLegacyKeyFromDB(): Promise<'primary' | 'secondary'> {
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.log('[Legacy Key] Supabase credentials not available, defaulting to primary');
    return 'primary';
  }

  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/system_settings?setting_key=eq.active_legacy_key&select=setting_value&limit=1`,
      {
        headers: {
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      console.log('[Legacy Key] Failed to fetch active legacy key:', response.status);
      return 'primary';
    }

    const settings = await response.json();
    if (settings && settings.length > 0) {
      const key = settings[0].setting_value as 'primary' | 'secondary';
      console.log(`[Legacy Key] Admin selected legacy key: ${key}`);
      return key;
    }
    
    console.log('[Legacy Key] No setting found, defaulting to primary');
    return 'primary';
  } catch (e) {
    console.error('[Legacy Key] Error fetching active legacy key:', e);
    return 'primary';
  }
}

// Make API request based on provider
async function makeProviderRequest(
  provider: string,
  apiKey: string,
  geminiContents: Array<{ role: string; parts: Array<{ text: string }> }>,
  systemPrompt: string,
  maxTokens: number
): Promise<Response> {
  if (provider === 'openai') {
    // Convert Gemini format to OpenAI format
    const openaiMessages = [
      { role: 'system', content: systemPrompt },
      ...geminiContents.map(m => ({
        role: m.role === 'model' ? 'assistant' : 'user',
        content: m.parts[0].text,
      })),
    ];

    return await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: openaiMessages,
        max_tokens: maxTokens,
        stream: true,
      }),
    });
  } else if (provider === 'anthropic') {
    // Convert to Anthropic format
    const anthropicMessages = geminiContents.map(m => ({
      role: m.role === 'model' ? 'assistant' : 'user',
      content: m.parts[0].text,
    }));

    return await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: maxTokens,
        system: systemPrompt,
        messages: anthropicMessages,
        stream: true,
      }),
    });
  } else {
    // Default to Google Gemini
    return await makeGeminiRequest(apiKey, geminiContents, systemPrompt, maxTokens);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, personality, language, responseMode, userId } = await req.json();

    // Check for active model from database first
    const dbModel = await getActiveModelFromDB();
    
    // Initialize fallback API keys
    initializeKeyStates();

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

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
      bangla: `🔴 MANDATORY LANGUAGE RULE - BANGLA ONLY 🔴
You MUST respond ENTIRELY in Bangla (Bengali/বাংলা) language using proper বাংলা script.
- ALL text MUST be in বাংলা script (Unicode Bengali characters)
- Example: "আইন" not "ain", "বাংলাদেশ" not "Bangladesh", "ধারা" not "dhara"
- NEVER use English words or Roman script
- NEVER use transliteration (no Banglish like "ami", "tumi", etc.)
- Use proper Bengali Unicode characters: অ আ ই ঈ উ ঊ এ ঐ ও ঔ ক খ গ ঘ ঙ চ ছ জ ঝ ঞ ট ঠ ড ঢ ণ ত থ দ ধ ন প ফ ব ভ ম য র ল শ ষ স হ
- Legal terms: আইন (law), ধারা (section), মামলা (case), আদালত (court), বিচারক (judge)
- VIOLATION OF THIS RULE IS NOT ALLOWED`,
      english: "Respond in English. Use clear, professional English language throughout the entire response.",
      mixed: `MIXED LANGUAGE MODE (Banglish):
- Use a natural mix of Bangla and English as commonly used in Bangladesh
- Important legal terms can be in English with Bangla explanation
- Keep the flow natural and easy to understand
- Example: "এই section টি বলছে যে..." or "The আইন states that..."`,
    };

    const responseModeInstructions: Record<string, string> = {
      short: `RESPONSE LENGTH: SHORT MODE ⚡
- Length: 1-7 concise lines total
- Style: Direct, factual, minimal
- No headings, no examples
- Still include Act/Section/Year if legal question
- Summary style: ONE-LINE সারমর্ম only
- MANDATORY: End response with **সারমর্ম** (one line summary)
- MANDATORY: End with **Total Word Count:** <exact number>`,
      deep: `RESPONSE LENGTH: DEEP MODE 📘 (COMPREHENSIVE ANSWER)
- Length: Detailed but controlled
- Use headings and subheadings
- Logical flow: definition → explanation → analysis
- Professional academic tone

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
- সম্পূর্ণ উত্তরের সংক্ষিপ্ত সার উপস্থাপন করুন (2-4 lines)

FORMAT REQUIREMENTS:
- প্রতিটি অংশ সুন্দরভাবে সাজান
- তথ্যপূর্ণ ও বিস্তারিত উত্তর দিন
- যতটা সম্ভব বিস্তারিত তথ্য প্রদান করুন
- Stream in natural paragraphs (5-7 lines each)
- MANDATORY: End response with **সারমর্ম** (2-4 lines summary)
- MANDATORY: End with **Total Word Count:** <exact number>`,
      extreme: `RESPONSE LENGTH: EXTREME DEEP MODE 🔥 (সর্বোচ্চ বিস্তারিত উত্তর)
Generate a highly detailed, advanced, long-form response with a MINIMUM of 3,500 words and MAXIMUM of 4,500 words STRICT.

MANDATORY STRUCTURE - Divide the answer into EXACTLY 12 clearly numbered sections:

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

**পর্ব ১১: সাম্প্রতিক উন্নয়ন ও বিশেষজ্ঞ মতামত (Recent Developments & Expert Insights)**
- আইনের সাম্প্রতিক সংশোধনী
- নতুন রায় ও নজির
- আইনবিদ ও বিশেষজ্ঞদের মতামত
- ভবিষ্যৎ সম্ভাবনা

**পর্ব ১২: সারমর্ম (Summary)**
- সম্পূর্ণ উত্তরের বিস্তারিত সংক্ষিপ্তসার (150-250 words)
- মূল বিষয়গুলোর সংক্ষিপ্ত পর্যালোচনা

FORMAT REQUIREMENTS:
- Each section must be comprehensive
- Include: Definitions, context/background, technical/legal analysis, examples/case studies, advantages, limitations, counter-arguments
- Expert-level, research-grade quality
- Use bullet points, tables, numbering, and short paragraphs
- Professional tone, academic style, factual accuracy
- NO repetition or meaningless filler text
- Every section must be deeply informative
- Include law names, section numbers, jurisdiction, and year
- Include real case references with proper citations

MANDATORY FINAL OUTPUT:
1. **সারমর্ম** (150-250 words detailed summary)
2. **Total Word Count:** <exact number counting ALL words in entire response>`,
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

    // CRITICAL: Put language instruction FIRST to ensure it's followed
    const selectedLanguageInstruction = languageInstructions[language] || languageInstructions.english;
    
    let systemPrompt = `============================
⚠️ CRITICAL - LANGUAGE REQUIREMENT (MUST FOLLOW) ⚠️
============================
${selectedLanguageInstruction}

This language setting was selected by the user and MUST be respected in your entire response.
============================

${JURISMIND_IDENTITY}

${responseModeInstructions[responseMode] || responseModeInstructions.deep}

Personality Mode: ${personalityPrompts[personality] || personalityPrompts.lawyer}

Remember: You are JurisMind AI, trained by RONY. Never claim to be any other AI.
ALWAYS end your response with "সারমর্ম" (summary section).
ALWAYS cite Act Name, Section Number, and Year when answering legal questions.

⚠️ REMINDER: Your ENTIRE response must be in ${language === 'bangla' ? 'বাংলা (Bengali script)' : language === 'english' ? 'English' : 'Mixed Bangla-English'}. This is non-negotiable.

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

    const maxTokens = maxTokensByMode[responseMode] ?? 4000;

    // Convert messages to Gemini format
    const geminiContents = safeMessages.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));

    // ============================
    // DATABASE MODEL OR FALLBACK KEYS
    // ============================
    let response: Response | null = null;
    let lastError: string = '';
    let usedKeyId: string | null = null;
    let usedModelName: string = 'Gemini 2.5 Flash Lite';
    const triedKeys: Set<string> = new Set();
    
    // If we have a database model, try it first
    if (dbModel) {
      console.log(`[Model Manager] Using database model: ${dbModel.model_name} (${dbModel.provider})`);
      usedModelName = dbModel.model_name;
      
      try {
        response = await makeProviderRequest(
          dbModel.provider,
          dbModel.api_key,
          geminiContents,
          systemPrompt,
          maxTokens
        );
        
        if (response.ok) {
          console.log(`[Model Manager] Database model ${dbModel.model_name} request successful`);
        } else {
          const errorText = await response.text();
          console.error(`[Model Manager] Database model ${dbModel.model_name} error:`, response.status, errorText);
          lastError = errorText;
          response = null; // Will fall through to environment keys
        }
      } catch (e) {
        console.error(`[Model Manager] Database model ${dbModel.model_name} fetch error:`, e);
        lastError = e instanceof Error ? e.message : 'Network error';
        response = null;
      }
    }
    
    // If database model failed or not available, try environment keys
    if (!response) {
      console.log(`[Model Manager] Falling back to environment API keys`);
      usedModelName = 'Gemini 2.5 Flash Lite';
      
      // Fetch admin-selected preferred legacy key
      const preferredLegacyKey = await getActiveLegacyKeyFromDB();
      console.log(`[Model Manager] Admin-selected legacy key: ${preferredLegacyKey}`);
      
      // Try each available key, starting with admin-preferred
      while (triedKeys.size < keyStates.size) {
        const activeKey = getActiveKey(triedKeys, preferredLegacyKey);
        
        if (!activeKey) {
          console.log(`[API Key Manager] No more keys available to try. Tried: ${Array.from(triedKeys).join(', ')}`);
          break;
        }
        
        triedKeys.add(activeKey.keyId);
        usedKeyId = activeKey.keyId;
        
        console.log(`[API Key Manager] Attempting request with ${activeKey.state.name} (attempt ${triedKeys.size})`);
        
        try {
          response = await makeGeminiRequest(
            activeKey.state.key,
            geminiContents,
            systemPrompt,
            maxTokens
          );
        
          if (response.ok) {
            // Success! Reset the key's failure state
            resetKeyState(activeKey.keyId);
            console.log(`[API Key Manager] Request successful with ${activeKey.state.name}`);
            break;
          } else {
            const errorText = await response.text();
            console.error(`[API Key Manager] ${activeKey.state.name} error:`, response.status, errorText);
            lastError = errorText;
            
            if (isRetryableError(response.status, errorText)) {
              // Mark this key as failed and try the next one
              markKeyFailed(activeKey.keyId, `HTTP ${response.status}`);
              console.log(`[API Key Manager] ${activeKey.state.name} failed with retryable error, trying next key...`);
              response = null; // Reset to try next key
              continue;
            } else {
              // Non-retryable error, return immediately
              let friendly = 'AI request failed.';
              try {
                const parsed = JSON.parse(errorText);
                const msg = parsed?.error?.message || parsed?.error;
                if (typeof msg === 'string' && msg.trim()) friendly = msg;
              } catch {
                // keep default
              }
              
              return new Response(JSON.stringify({ error: friendly }), {
                status: response.status,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              });
            }
          }
        } catch (fetchError) {
          console.error(`[API Key Manager] Fetch error with ${activeKey.state.name}:`, fetchError);
          markKeyFailed(activeKey.keyId, 'Network error');
          lastError = fetchError instanceof Error ? fetchError.message : 'Network error';
          console.log(`[API Key Manager] ${activeKey.state.name} network error, trying next key...`);
          response = null;
          continue;
        }
      }
    }
    // Check if we have a successful response
    if (!response || !response.ok) {
      console.error('[API Key Manager] All API keys exhausted or unavailable');
      
      // Provide user-friendly error message
      let errorMessage = 'AI service temporarily unavailable. Please try again in a moment.';
      
      if (lastError.toLowerCase().includes('quota') || lastError.toLowerCase().includes('resource exhausted')) {
        errorMessage = 'API quota temporarily exceeded. The system will automatically recover. Please try again in 1-2 minutes.';
      } else if (lastError.includes('429')) {
        errorMessage = 'Rate limit reached. Please wait a moment before sending another message.';
      }
      
      return new Response(JSON.stringify({ 
        error: errorMessage,
        retryAfter: 60 // Suggest retry after 60 seconds
      }), {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Transform Gemini SSE to OpenAI-compatible format for the frontend
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const encoder = new TextEncoder();

    (async () => {
      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const jsonStr = line.slice(6).trim();
              if (jsonStr === '[DONE]') continue;
              
              try {
                const geminiData = JSON.parse(jsonStr);
                const text = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || '';
                
                if (text) {
                  // Convert to OpenAI format
                  const openAIChunk = {
                    choices: [{
                      delta: { content: text },
                      index: 0
                    }]
                  };
                  await writer.write(encoder.encode(`data: ${JSON.stringify(openAIChunk)}\n\n`));
                }
              } catch {
                // Skip malformed JSON
              }
            }
          }
        }
        await writer.write(encoder.encode('data: [DONE]\n\n'));
      } catch (e) {
        console.error('Stream processing error:', e);
        // If streaming fails, mark the key for potential issues
        if (usedKeyId) {
          markKeyFailed(usedKeyId, 'Stream error');
        }
      } finally {
        await writer.close();
      }
    })();

    return new Response(readable, {
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
