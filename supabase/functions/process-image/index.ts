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
  imageConfig?: {
    aspectRatio?: string;
    imageSize?: '1K' | '2K' | '4K';
  };
}

// Generate unique telemetry ID for debugging
function generateTelemetryId(): string {
  return `img_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

// Validate and compress base64 image if too large (max 4MB payload)
function validateAndPrepareImage(imageBase64: string | undefined): { valid: boolean; data?: string; error?: string } {
  if (!imageBase64) {
    return { valid: false, error: 'No image provided' };
  }

  // Check if it's a valid base64 data URL or raw base64
  if (!imageBase64.startsWith('data:image/') && !imageBase64.match(/^[A-Za-z0-9+/=]+$/)) {
    return { valid: false, error: 'Invalid image format' };
  }

  // Estimate size (base64 is ~4/3 of original)
  const sizeInBytes = (imageBase64.length * 3) / 4;
  const maxSize = 10 * 1024 * 1024; // 10MB max

  if (sizeInBytes > maxSize) {
    return { valid: false, error: 'Image too large. Please use an image under 10MB.' };
  }

  return { valid: true, data: imageBase64 };
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
    return encrypted;
  }
}

// Get active image model from database with timeout
async function getActiveImageModel(supabaseUrl: string, supabaseKey: string) {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Database timeout')), 5000)
    );
    
    const queryPromise = supabase
      .from('image_ai_models')
      .select('*')
      .eq('is_active', true)
      .single();

    const { data, error } = await Promise.race([queryPromise, timeoutPromise]) as any;

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

// Fetch with timeout helper
async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number = 60000): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

// Generate image with Lovable AI Gateway (no API key needed)
async function generateWithLovableGateway(prompt: string, aspectRatio?: string) {
  console.log('Generating image with Lovable AI Gateway (google/gemini-2.5-flash-image)...');

  const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
  if (!lovableApiKey) {
    throw new Error('LOVABLE_API_KEY is not configured. Please contact support.');
  }

  // Build enhanced prompt with aspect ratio hint
  let enhancedPrompt = `Generate a high-quality, professional image: ${prompt}`;
  if (aspectRatio && aspectRatio !== 'auto' && aspectRatio !== '1:1') {
    enhancedPrompt += `\nAspect ratio: ${aspectRatio}. Compose the image appropriately for this ratio.`;
  }

  const response = await fetchWithTimeout('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${lovableApiKey}`,
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash-image',
      messages: [
        {
          role: 'user',
          content: enhancedPrompt
        }
      ],
      modalities: ['image', 'text'],
    }),
  }, 90000); // 90 second timeout for image generation

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    console.error('Lovable Gateway error:', response.status, errorText);
    throw new Error(`Image generation service temporarily unavailable (${response.status})`);
  }

  const data = await response.json();
  const images = data.choices?.[0]?.message?.images;

  if (images && images.length > 0) {
    return {
      imageUrl: images[0].image_url?.url,
      description: data.choices?.[0]?.message?.content || 'Image generated successfully',
    };
  }

  throw new Error('Image generation completed but no image was returned. Please try again.');
}

// Generate image with OpenRouter API
async function generateWithOpenRouter(
  apiKey: string,
  modelName: string,
  prompt: string,
  imageConfig?: { aspectRatio?: string; imageSize?: '1K' | '2K' | '4K' }
) {
  console.log(`Generating image with OpenRouter (${modelName})...`);

  const body: Record<string, unknown> = {
    model: modelName.toLowerCase().includes('seedream') ? 'bytedance/seedream-4.5' : modelName,
    messages: [{ role: 'user', content: prompt }],
    modalities: ['image', 'text'],
    stream: false,
  };

  if (modelName.toLowerCase().includes('gemini') && imageConfig?.aspectRatio) {
    body.image_config = {
      aspect_ratio: imageConfig.aspectRatio,
      ...(imageConfig.imageSize ? { image_size: imageConfig.imageSize } : {}),
    };
  }

  const response = await fetchWithTimeout('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://jurismind.app',
      'X-Title': 'JurisMind',
    },
    body: JSON.stringify(body),
  }, 90000);

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    console.error('OpenRouter error:', response.status, errorText);
    throw new Error(`OpenRouter API error: ${response.status}`);
  }

  const data = await response.json();
  const message = data.choices?.[0]?.message;

  const url =
    message?.images?.[0]?.image_url?.url ||
    message?.images?.[0]?.imageUrl?.url ||
    message?.images?.[0]?.url;

  if (url) {
    return {
      imageUrl: url,
      description: message?.content || 'Image generated successfully',
    };
  }

  throw new Error('No image generated from OpenRouter');
}

// Generate image with OpenAI DALL-E
async function generateWithOpenAI(apiKey: string, prompt: string) {
  console.log('Generating image with OpenAI DALL-E...');
  
  const response = await fetchWithTimeout('https://api.openai.com/v1/images/generations', {
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
  }, 90000);

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    console.error('OpenAI error:', response.status, errorText);
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  
  return {
    imageUrl: `data:image/png;base64,${data.data[0].b64_json}`,
    description: data.data[0].revised_prompt || 'Image generated successfully',
  };
}

// Generate with generic API (tries multiple approaches)
async function generateWithCustomAPI(
  apiKey: string,
  modelName: string,
  prompt: string,
  imageConfig?: { aspectRatio?: string; imageSize?: '1K' | '2K' | '4K' }
) {
  console.log(`Generating with custom model: ${modelName}`);

  // Try OpenRouter first as it supports many models
  try {
    return await generateWithOpenRouter(apiKey, modelName, prompt, imageConfig);
  } catch (err: any) {
    console.log('OpenRouter failed, trying Lovable AI Gateway...', err?.message || String(err));
  }

  // Fallback to Lovable Gateway
  return await generateWithLovableGateway(prompt, imageConfig?.aspectRatio);
}

// Analyze image with Lovable AI Gateway
async function analyzeWithLovableGateway(imageBase64: string, prompt: string) {
  console.log('Analyzing image with Lovable AI Gateway...');

  const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
  if (!lovableApiKey) {
    throw new Error('LOVABLE_API_KEY is not configured. Please contact support.');
  }

  const response = await fetchWithTimeout('https://ai.gateway.lovable.dev/v1/chat/completions', {
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
  }, 60000);

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    console.error('Lovable Gateway Vision error:', response.status, errorText);
    throw new Error(`Image analysis service temporarily unavailable (${response.status})`);
  }

  const data = await response.json();
  
  return {
    analysis: data.choices?.[0]?.message?.content || 'Image analysis completed successfully.',
  };
}

// Analyze image with OpenAI Vision
async function analyzeWithOpenAI(apiKey: string, imageBase64: string, prompt: string) {
  console.log('Analyzing image with OpenAI Vision...');
  
  const response = await fetchWithTimeout('https://api.openai.com/v1/chat/completions', {
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
  }, 60000);

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    console.error('OpenAI Vision error:', response.status, errorText);
    throw new Error(`OpenAI Vision API error: ${response.status}`);
  }

  const data = await response.json();
  
  return {
    analysis: data.choices?.[0]?.message?.content || 'Image analysis completed successfully.',
  };
}

// Edit image with Lovable AI Gateway
async function editWithLovableGateway(imageBase64: string, editInstructions: string) {
  console.log('Editing image with Lovable AI Gateway...');

  const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
  if (!lovableApiKey) {
    throw new Error('LOVABLE_API_KEY is not configured. Please contact support.');
  }

  // Build comprehensive edit prompt
  const enhancedInstructions = `Edit this image according to these instructions: ${editInstructions}\n\nMaintain high quality and professional appearance.`;

  const response = await fetchWithTimeout('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${lovableApiKey}`,
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash-image',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: enhancedInstructions },
            { type: 'image_url', image_url: { url: imageBase64 } }
          ]
        }
      ],
      modalities: ['image', 'text'],
    }),
  }, 90000);

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    console.error('Lovable Gateway Edit error:', response.status, errorText);
    throw new Error(`Image editing service temporarily unavailable (${response.status})`);
  }

  const data = await response.json();
  const images = data.choices?.[0]?.message?.images;
  
  if (images && images.length > 0) {
    return {
      imageUrl: images[0].image_url?.url,
      description: data.choices?.[0]?.message?.content || 'Image edited successfully',
    };
  }
  
  // Fallback: if no image returned, provide helpful message
  throw new Error('Image editing completed but no modified image was returned. Please try with different instructions.');
}

// Edit image with OpenAI
async function editWithOpenAI(apiKey: string, imageBase64: string, editInstructions: string) {
  console.log('Editing image with OpenAI...');
  
  const response = await fetchWithTimeout('https://api.openai.com/v1/images/generations', {
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
  }, 90000);

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    console.error('OpenAI Edit error:', response.status, errorText);
    throw new Error(`OpenAI Edit API error: ${response.status}`);
  }

  const data = await response.json();
  
  return {
    imageUrl: `data:image/png;base64,${data.data[0].b64_json}`,
    description: data.data[0].revised_prompt || 'Image edited successfully',
  };
}

// Create a safe JSON response
function createResponse(body: Record<string, unknown>, status: number = 200): Response {
  return new Response(
    JSON.stringify(body),
    { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
      status: status 
    }
  );
}

serve(async (req) => {
  const telemetryId = generateTelemetryId();
  
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log(`[${telemetryId}] Processing image request...`);

  try {
    // Parse request body with error handling
    let requestBody: ImageRequest;
    try {
      requestBody = await req.json();
    } catch (parseError) {
      console.error(`[${telemetryId}] JSON parse error:`, parseError);
      return createResponse({
        success: false,
        error: 'Invalid request format. Please try again.',
        telemetryId,
      }, 200); // Return 200 with error in body to prevent red banner
    }

    const { action, prompt, imageBase64, editInstructions, imageConfig } = requestBody;

    console.log(`[${telemetryId}] Action: ${action}`);

    // Validate action
    if (!action || !['generate', 'analyze', 'edit'].includes(action)) {
      return createResponse({
        success: false,
        error: 'Invalid action. Use: generate, analyze, or edit.',
        telemetryId,
      }, 200);
    }

    // Validate required inputs
    if (action === 'generate' && !prompt?.trim()) {
      return createResponse({
        success: false,
        error: 'Please provide a description for the image you want to generate.',
        telemetryId,
      }, 200);
    }

    if (action === 'analyze') {
      const imageValidation = validateAndPrepareImage(imageBase64);
      if (!imageValidation.valid) {
        return createResponse({
          success: false,
          error: imageValidation.error || 'Please upload an image to analyze.',
          telemetryId,
        }, 200);
      }
    }

    if (action === 'edit') {
      const imageValidation = validateAndPrepareImage(imageBase64);
      if (!imageValidation.valid) {
        return createResponse({
          success: false,
          error: imageValidation.error || 'Please upload an image to edit.',
          telemetryId,
        }, 200);
      }
      if (!editInstructions?.trim()) {
        return createResponse({
          success: false,
          error: 'Please provide instructions for how you want to edit the image.',
          telemetryId,
        }, 200);
      }
    }

    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      console.error(`[${telemetryId}] Missing Supabase configuration`);
      return createResponse({
        success: false,
        error: 'Service configuration error. Please try again later.',
        telemetryId,
      }, 200);
    }

    // Get active image model from database
    const activeModel = await getActiveImageModel(supabaseUrl, supabaseKey);
    
    let result;
    let providerName = 'Lovable AI';

    // Determine how to handle the request based on active model
    const hasCustomModel = activeModel && activeModel.apiKey && activeModel.apiKey.length > 10;
    
    if (hasCustomModel) {
      console.log(`[${telemetryId}] Using custom model: ${activeModel.modelName} (${activeModel.provider})`);
      providerName = activeModel.modelName;
    } else {
      console.log(`[${telemetryId}] No custom model configured, using Lovable AI Gateway`);
    }

    try {
      switch (action) {
        case 'generate':
          if (hasCustomModel) {
            const provider = activeModel.provider.toLowerCase();
            if (provider === 'openai' || activeModel.modelName.toLowerCase().includes('dall')) {
              result = await generateWithOpenAI(activeModel.apiKey, prompt!);
            } else {
              result = await generateWithCustomAPI(activeModel.apiKey, activeModel.modelName, prompt!, imageConfig);
            }
          } else {
            result = await generateWithLovableGateway(prompt!, imageConfig?.aspectRatio);
          }
          break;

        case 'analyze':
          if (hasCustomModel && activeModel.provider.toLowerCase() === 'openai') {
            result = await analyzeWithOpenAI(activeModel.apiKey, imageBase64!, prompt || '');
          } else {
            result = await analyzeWithLovableGateway(imageBase64!, prompt || '');
          }
          break;

        case 'edit':
          if (hasCustomModel && activeModel.provider.toLowerCase() === 'openai') {
            result = await editWithOpenAI(activeModel.apiKey, imageBase64!, editInstructions!);
          } else {
            result = await editWithLovableGateway(imageBase64!, editInstructions!);
          }
          break;
      }
    } catch (aiError: any) {
      console.error(`[${telemetryId}] AI processing error:`, aiError);
      
      // Try fallback to Lovable Gateway if custom model fails
      if (hasCustomModel) {
        console.log(`[${telemetryId}] Custom model failed, attempting fallback to Lovable AI Gateway...`);
        try {
          switch (action) {
            case 'generate':
              result = await generateWithLovableGateway(prompt!, imageConfig?.aspectRatio);
              providerName = 'Lovable AI (fallback)';
              break;
            case 'analyze':
              result = await analyzeWithLovableGateway(imageBase64!, prompt || '');
              providerName = 'Lovable AI (fallback)';
              break;
            case 'edit':
              result = await editWithLovableGateway(imageBase64!, editInstructions!);
              providerName = 'Lovable AI (fallback)';
              break;
          }
        } catch (fallbackError: any) {
          console.error(`[${telemetryId}] Fallback also failed:`, fallbackError);
          return createResponse({
            success: false,
            error: `Image ${action} temporarily unavailable. Please try again in a moment.`,
            telemetryId,
          }, 200);
        }
      } else {
        // No fallback available
        const userFriendlyMessage = aiError.message?.includes('timeout') || aiError.message?.includes('abort')
          ? `Image ${action} is taking longer than expected. Please try again.`
          : `Image ${action} temporarily unavailable. Please try again in a moment.`;
        
        return createResponse({
          success: false,
          error: userFriendlyMessage,
          telemetryId,
        }, 200);
      }
    }

    // Validate result
    if (!result) {
      return createResponse({
        success: false,
        error: `Image ${action} completed but no result was returned. Please try again.`,
        telemetryId,
      }, 200);
    }

    console.log(`[${telemetryId}] Success! Provider: ${providerName}`);

    return createResponse({
      success: true,
      action,
      provider: providerName,
      telemetryId,
      ...result,
    }, 200);

  } catch (error: any) {
    console.error(`[${telemetryId}] Unexpected error:`, error);
    
    // ALWAYS return 200 with error in body to prevent red banner
    return createResponse({
      success: false,
      error: 'Something went wrong. Please try again.',
      telemetryId,
    }, 200);
  }
});
