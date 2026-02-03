import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface ImageResult {
  success: boolean;
  action: 'generate' | 'analyze' | 'edit';
  provider?: string;
  imageUrl?: string;
  description?: string;
  analysis?: string;
  error?: string;
  telemetryId?: string;
}

type ImageConfig = {
  aspectRatio?: string;
  imageSize?: '1K' | '2K' | '4K';
  style?: string;
  imageCount?: number;
};

export const useImageAI = () => {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentAction, setCurrentAction] = useState<string | null>(null);

  const processImage = async (
    action: 'generate' | 'analyze' | 'edit',
    prompt: string,
    imageBase64?: string,
    editInstructions?: string,
    config?: ImageConfig
  ): Promise<ImageResult | null> => {
    setIsProcessing(true);
    setCurrentAction(action);

    try {
      // Set a client-side timeout to prevent hanging
      const timeoutMs = 120000; // 2 minutes
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout - please try again')), timeoutMs)
      );

      const invokePromise = supabase.functions.invoke('process-image', {
        body: {
          action,
          prompt: config?.style && config.style !== 'normal' 
            ? `[Style: ${config.style}] ${prompt}` 
            : prompt,
          imageBase64,
          editInstructions: config?.style && config.style !== 'normal' && editInstructions
            ? `[Style: ${config.style}] ${editInstructions}`
            : editInstructions,
          imageConfig: config ? {
            aspectRatio: config.aspectRatio,
            imageSize: config.imageSize,
          } : undefined,
        },
      });

      const { data, error } = await Promise.race([invokePromise, timeoutPromise.then(() => { throw new Error('timeout'); })]);

      // Handle network/invoke errors gracefully
      if (error) {
        console.error('Image AI invoke error:', error);
        
        // Don't show destructive toast for network issues - return graceful failure
        const userMessage = error.message?.includes('non-2xx') 
          ? 'Image service is busy. Please try again.'
          : error.message?.includes('timeout')
            ? 'Request took too long. Please try again with a simpler prompt.'
            : 'Unable to process image. Please try again.';
        
        toast({
          title: 'Processing Issue',
          description: userMessage,
        });
        
        return {
          success: false,
          action,
          error: userMessage,
        };
      }

      const result = data as ImageResult;

      // Handle API-level errors (returned with success: false)
      if (!result?.success) {
        const errorMessage = result?.error || 'Image processing did not complete. Please try again.';
        console.log('Image AI returned error:', errorMessage, 'Telemetry:', result?.telemetryId);
        
        toast({
          title: 'Processing Notice',
          description: errorMessage,
        });
        
        return {
          success: false,
          action,
          error: errorMessage,
          telemetryId: result?.telemetryId,
        };
      }

      // Success case
      toast({
        title:
          action === 'generate'
            ? 'Image Generated'
            : action === 'analyze'
              ? 'Image Analyzed'
              : 'Image Edited',
        description: `Using ${result.provider || 'AI'} model`,
      });
      
      return result;
      
    } catch (error: any) {
      console.error('Image AI unexpected error:', error);
      
      const userMessage = error.message?.includes('timeout')
        ? 'Request took too long. Please try again.'
        : 'Something went wrong. Please try again.';
      
      toast({
        title: 'Processing Notice',
        description: userMessage,
      });
      
      return {
        success: false,
        action,
        error: userMessage,
      };
    } finally {
      setIsProcessing(false);
      setCurrentAction(null);
    }
  };

  const generateImage = async (prompt: string, config?: ImageConfig) => 
    processImage('generate', prompt, undefined, undefined, config);

  const analyzeImage = async (imageBase64: string, prompt?: string) =>
    processImage('analyze', prompt || 'Analyze this image in detail', imageBase64);

  const editImage = async (imageBase64: string, editInstructions: string, config?: ImageConfig) =>
    processImage('edit', '', imageBase64, editInstructions, config);

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  return {
    isProcessing,
    currentAction,
    generateImage,
    analyzeImage,
    editImage,
    fileToBase64,
  };
};

export default useImageAI;

