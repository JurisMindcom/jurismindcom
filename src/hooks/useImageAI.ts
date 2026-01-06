import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

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
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-image`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action,
          prompt,
          imageBase64,
          editInstructions,
        }),
      });

      if (!response.ok) {
        throw new Error(`Image processing failed: ${response.status}`);
      }

      const result: ImageResult = await response.json();

      if (result.success) {
        toast({
          title: action === 'generate' ? 'Image Generated' : action === 'analyze' ? 'Image Analyzed' : 'Image Edited',
          description: `Using ${result.provider || 'AI'} model`,
        });
        return result;
      } else {
        throw new Error(result.error || 'Image processing failed');
      }
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

  const generateImage = async (prompt: string) => {
    return processImage('generate', prompt);
  };

  const analyzeImage = async (imageBase64: string, prompt?: string) => {
    return processImage('analyze', prompt || 'Analyze this image in detail', imageBase64);
  };

  const editImage = async (imageBase64: string, editInstructions: string) => {
    return processImage('edit', '', imageBase64, editInstructions);
  };

  // Convert file to base64
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
