import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ImageRequest {
  action: 'generate' | 'analyze' | 'edit';
  prompt: string;
  imageBase64?: string;
  editInstructions?: string;
}

// Decrypt API key (simple XOR)
function decryptApiKey(encrypted: string): string {
  const salt = 'jurismind_image_key_2024';
  const decoded = atob(encrypted);
  let decrypted = '';
  for (let i = 0; i < decoded.length; i++) {
    decrypted += String.fromCharCode(decoded.charCodeAt(i) ^ salt.charCodeAt(i % salt.length));
  }
  return decrypted;
}

// Get active image model from database
async function getActiveImageModel(supabaseUrl: string, supabaseKey: string) {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data, error } = await supabase
      .from('image_ai_models')
      .select('*')
      .eq('is_active', true)
      .single();

    if (error || !data) {
      console.log('No active image model found in DB, using fallback');
      return null;
    }

    return {
      provider: data.provider,
      modelName: data.model_name,
      apiKey: decryptApiKey(data.api_key_encrypted),
    };
  } catch (err) {
    console.error('Error fetching active image model:', err);
    return null;
  }
}

// Generate image with Google Gemini
async function generateWithGemini(apiKey: string, prompt: string) {
  console.log('Generating image with Gemini...');
  
  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash-image-preview',
      messages: [
        {
          role: 'user',
          content: `Generate a high-quality image: ${prompt}`
        }
      ],
      modalities: ['image', 'text'],
    }),
  });

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const data = await response.json();
  const images = data.choices?.[0]?.message?.images;
  
  if (images && images.length > 0) {
    return {
      imageUrl: images[0].image_url?.url,
      description: data.choices?.[0]?.message?.content || 'Image generated successfully',
    };
  }
  
  throw new Error('No image generated');
}

// Generate image with OpenAI DALL-E
async function generateWithOpenAI(apiKey: string, prompt: string) {
  console.log('Generating image with OpenAI DALL-E...');
  
  const response = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'dall-e-3',
      prompt: prompt,
      n: 1,
      size: '1024x1024',
      response_format: 'b64_json',
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  
  return {
    imageUrl: `data:image/png;base64,${data.data[0].b64_json}`,
    description: data.data[0].revised_prompt || 'Image generated successfully',
  };
}

// Analyze image with Gemini Vision
async function analyzeWithGemini(apiKey: string, imageBase64: string, prompt: string) {
  console.log('Analyzing image with Gemini Vision...');
  
  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt || 'Analyze this image in detail. Describe what you see, identify key elements, and provide relevant insights.' },
            { type: 'image_url', image_url: { url: imageBase64 } }
          ]
        }
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Gemini Vision API error: ${response.status}`);
  }

  const data = await response.json();
  
  return {
    analysis: data.choices?.[0]?.message?.content || 'Analysis complete',
  };
}

// Analyze image with OpenAI Vision
async function analyzeWithOpenAI(apiKey: string, imageBase64: string, prompt: string) {
  console.log('Analyzing image with OpenAI Vision...');
  
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt || 'Analyze this image in detail. Describe what you see, identify key elements, and provide relevant insights.' },
            { type: 'image_url', image_url: { url: imageBase64 } }
          ]
        }
      ],
      max_tokens: 1000,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI Vision API error: ${response.status}`);
  }

  const data = await response.json();
  
  return {
    analysis: data.choices?.[0]?.message?.content || 'Analysis complete',
  };
}

// Edit image with Gemini
async function editWithGemini(apiKey: string, imageBase64: string, editInstructions: string) {
  console.log('Editing image with Gemini...');
  
  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash-image-preview',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: editInstructions },
            { type: 'image_url', image_url: { url: imageBase64 } }
          ]
        }
      ],
      modalities: ['image', 'text'],
    }),
  });

  if (!response.ok) {
    throw new Error(`Gemini Edit API error: ${response.status}`);
  }

  const data = await response.json();
  const images = data.choices?.[0]?.message?.images;
  
  if (images && images.length > 0) {
    return {
      imageUrl: images[0].image_url?.url,
      description: data.choices?.[0]?.message?.content || 'Image edited successfully',
    };
  }
  
  throw new Error('No edited image generated');
}

// Edit image with OpenAI
async function editWithOpenAI(apiKey: string, imageBase64: string, editInstructions: string) {
  console.log('Editing image with OpenAI...');
  
  // OpenAI edit requires specific format - use DALL-E 3 for generation with edit prompt
  const response = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'dall-e-3',
      prompt: `Based on this image description and edit instruction: ${editInstructions}`,
      n: 1,
      size: '1024x1024',
      response_format: 'b64_json',
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI Edit API error: ${response.status}`);
  }

  const data = await response.json();
  
  return {
    imageUrl: `data:image/png;base64,${data.data[0].b64_json}`,
    description: data.data[0].revised_prompt || 'Image edited successfully',
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const { action, prompt, imageBase64, editInstructions }: ImageRequest = await req.json();

    console.log(`Processing image request: ${action}`);

    // Get active image model
    const activeModel = await getActiveImageModel(supabaseUrl, supabaseKey);
    
    // Determine provider and API key
    let provider = activeModel?.provider || 'google';
    let apiKey = activeModel?.apiKey || '';

    // Fallback to Lovable gateway if no API key
    const useLovableGateway = !apiKey || provider === 'google';

    let result;

    switch (action) {
      case 'generate':
        if (!prompt) {
          throw new Error('Prompt is required for image generation');
        }
        if (useLovableGateway || provider === 'google') {
          result = await generateWithGemini(apiKey, prompt);
        } else if (provider === 'openai') {
          result = await generateWithOpenAI(apiKey, prompt);
        } else {
          // Default to Gemini for unsupported providers
          result = await generateWithGemini(apiKey, prompt);
        }
        break;

      case 'analyze':
        if (!imageBase64) {
          throw new Error('Image is required for analysis');
        }
        if (useLovableGateway || provider === 'google') {
          result = await analyzeWithGemini(apiKey, imageBase64, prompt);
        } else if (provider === 'openai') {
          result = await analyzeWithOpenAI(apiKey, imageBase64, prompt);
        } else {
          result = await analyzeWithGemini(apiKey, imageBase64, prompt);
        }
        break;

      case 'edit':
        if (!imageBase64 || !editInstructions) {
          throw new Error('Image and edit instructions are required');
        }
        if (useLovableGateway || provider === 'google') {
          result = await editWithGemini(apiKey, imageBase64, editInstructions);
        } else if (provider === 'openai') {
          result = await editWithOpenAI(apiKey, imageBase64, editInstructions);
        } else {
          result = await editWithGemini(apiKey, imageBase64, editInstructions);
        }
        break;

      default:
        throw new Error('Invalid action. Use: generate, analyze, or edit');
    }

    return new Response(
      JSON.stringify({
        success: true,
        action,
        provider: activeModel?.modelName || 'Lovable AI Gateway',
        ...result,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Image processing error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Image processing failed',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
