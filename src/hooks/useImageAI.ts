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
}

export const useImageAI = () => {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentAction, setCurrentAction] = useState<string | null>(null);

  const processImage = async (
    action: 'generate' | 'analyze' | 'edit',
    prompt: string,
    imageBase64?: string,
    editInstructions?: string
  ): Promise<ImageResult | null> => {
    setIsProcessing(true);
    setCurrentAction(action);

    try {
      const { data, error } = await supabase.functions.invoke('process-image', {
        body: {
          action,
          prompt,
          imageBase64,
          editInstructions,
        },
      });

      if (error) {
        throw new Error(error.message || 'Image processing failed');
      }

      const result = data as ImageResult;

      if (result?.success) {
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
      }

      throw new Error(result?.error || 'Image processing failed');
    } catch (error: any) {
      console.error('Image AI error:', error);
      toast({
        title: 'Image Processing Error',
        description: error.message || 'Failed to process image',
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsProcessing(false);
      setCurrentAction(null);
    }
  };

  const generateImage = async (prompt: string) => processImage('generate', prompt);

  const analyzeImage = async (imageBase64: string, prompt?: string) =>
    processImage('analyze', prompt || 'Analyze this image in detail', imageBase64);

  const editImage = async (imageBase64: string, editInstructions: string) =>
    processImage('edit', '', imageBase64, editInstructions);

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

