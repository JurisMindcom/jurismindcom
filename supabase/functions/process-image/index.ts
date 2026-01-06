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

// Decrypt API key (simple XOR) - matches the encryption in AddImageModel.tsx
function decryptApiKey(encrypted: string): string {
  try {
    const salt = 'jurismind_image_key_2024';
    const decoded = atob(encrypted);
    let decrypted = '';
    for (let i = 0; i < decoded.length; i++) {
      decrypted += String.fromCharCode(decoded.charCodeAt(i) ^ salt.charCodeAt(i % salt.length));
    }
    return decrypted;
  } catch (err) {
    console.error('Decryption error:', err);
    // If decryption fails, the key might be stored plainly
    return encrypted;
  }
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
      console.log('No active image model found in DB, will use Lovable AI Gateway');
      return null;
    }

    console.log('Found active image model:', data.model_name, 'Provider:', data.provider);
    
    const apiKey = decryptApiKey(data.api_key_encrypted);
    console.log('API key decrypted, length:', apiKey.length);

    return {
      provider: data.provider?.toLowerCase() || 'openrouter',
      modelName: data.model_name,
      apiKey: apiKey,
    };
  } catch (err) {
    console.error('Error fetching active image model:', err);
    return null;
  }
}

// Generate image with Lovable AI Gateway (no API key needed)
async function generateWithLovableGateway(prompt: string) {
  console.log('Generating image with Lovable AI Gateway (google/gemini-2.5-flash-image-preview)...');

  const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
  if (!lovableApiKey) {
    throw new Error('LOVABLE_API_KEY is not configured on the backend');
  }

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${lovableApiKey}`,
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
    const errorText = await response.text();
    console.error('Lovable Gateway error:', errorText);
    throw new Error(`Lovable Gateway API error: ${response.status}`);
  }

  const data = await response.json();
  const images = data.choices?.[0]?.message?.images;
  
  if (images && images.length > 0) {
    return {
      imageUrl: images[0].image_url?.url,
      description: data.choices?.[0]?.message?.content || 'Image generated successfully',
    };
  }
  
  throw new Error('No image generated from Lovable Gateway');
}

// Generate image with OpenRouter API (supports many models including Seedream)
async function generateWithOpenRouter(apiKey: string, modelName: string, prompt: string) {
  console.log(`Generating image with OpenRouter (${modelName})...`);
  
  const response = await fetch('https://openrouter.ai/api/v1/images/generations', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://jurismind.app',
      'X-Title': 'JurisMind',
    },
    body: JSON.stringify({
      model: modelName.toLowerCase().includes('seedream') ? 'bytedance/seedream-4.5' : modelName,
      prompt: prompt,
      n: 1,
      size: '1024x1024',
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('OpenRouter error:', errorText);
    throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  console.log('OpenRouter response:', JSON.stringify(data).slice(0, 500));
  
  if (data.data && data.data[0]) {
    return {
      imageUrl: data.data[0].url || `data:image/png;base64,${data.data[0].b64_json}`,
      description: data.data[0].revised_prompt || 'Image generated successfully',
    };
  }
  
  throw new Error('No image generated from OpenRouter');
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
    const errorText = await response.text();
    console.error('OpenAI error:', errorText);
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  
  return {
    imageUrl: `data:image/png;base64,${data.data[0].b64_json}`,
    description: data.data[0].revised_prompt || 'Image generated successfully',
  };
}

// Generate with generic API (tries multiple approaches)
async function generateWithCustomAPI(apiKey: string, modelName: string, prompt: string) {
  console.log(`Generating with custom model: ${modelName}`);
  
  // Try OpenRouter first as it supports many models
  try {
    return await generateWithOpenRouter(apiKey, modelName, prompt);
  } catch (err) {
    console.log('OpenRouter failed, trying direct approach...');
  }
  
  // Fallback to Lovable Gateway
  return await generateWithLovableGateway(prompt);
}

// Analyze image with Lovable AI Gateway
async function analyzeWithLovableGateway(imageBase64: string, prompt: string) {
  console.log('Analyzing image with Lovable AI Gateway...');

  const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
  if (!lovableApiKey) {
    throw new Error('LOVABLE_API_KEY is not configured on the backend');
  }

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${lovableApiKey}`,
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
    throw new Error(`Lovable Gateway Vision API error: ${response.status}`);
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

// Edit image with Lovable AI Gateway
async function editWithLovableGateway(imageBase64: string, editInstructions: string) {
  console.log('Editing image with Lovable AI Gateway...');

  const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
  if (!lovableApiKey) {
    throw new Error('LOVABLE_API_KEY is not configured on the backend');
  }

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${lovableApiKey}`,
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
    throw new Error(`Lovable Gateway Edit API error: ${response.status}`);
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

    // Get active image model from database
    const activeModel = await getActiveImageModel(supabaseUrl, supabaseKey);
    
    let result;
    let providerName = 'Lovable AI Gateway';

    // Determine how to handle the request based on active model
    const hasCustomModel = activeModel && activeModel.apiKey && activeModel.apiKey.length > 10;
    
    if (hasCustomModel) {
      console.log(`Using custom model: ${activeModel.modelName} (${activeModel.provider})`);
      providerName = activeModel.modelName;
    } else {
      console.log('No custom model configured, using Lovable AI Gateway');
    }

    switch (action) {
      case 'generate':
        if (!prompt) {
          throw new Error('Prompt is required for image generation');
        }
        
        if (hasCustomModel) {
          const provider = activeModel.provider.toLowerCase();
          
          if (provider === 'openai' || activeModel.modelName.toLowerCase().includes('dall')) {
            result = await generateWithOpenAI(activeModel.apiKey, prompt);
          } else {
            // Use OpenRouter for other models (Seedream, Midjourney, etc.)
            result = await generateWithCustomAPI(activeModel.apiKey, activeModel.modelName, prompt);
          }
        } else {
          result = await generateWithLovableGateway(prompt);
        }
        break;

      case 'analyze':
        if (!imageBase64) {
          throw new Error('Image is required for analysis');
        }
        
        if (hasCustomModel && activeModel.provider.toLowerCase() === 'openai') {
          result = await analyzeWithOpenAI(activeModel.apiKey, imageBase64, prompt);
        } else {
          result = await analyzeWithLovableGateway(imageBase64, prompt);
        }
        break;

      case 'edit':
        if (!imageBase64 || !editInstructions) {
          throw new Error('Image and edit instructions are required');
        }
        
        if (hasCustomModel && activeModel.provider.toLowerCase() === 'openai') {
          result = await editWithOpenAI(activeModel.apiKey, imageBase64, editInstructions);
        } else {
          result = await editWithLovableGateway(imageBase64, editInstructions);
        }
        break;

      default:
        throw new Error('Invalid action. Use: generate, analyze, or edit');
    }

    return new Response(
      JSON.stringify({
        success: true,
        action,
        provider: providerName,
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
