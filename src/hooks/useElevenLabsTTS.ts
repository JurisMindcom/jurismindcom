import { useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UseElevenLabsTTSReturn {
  isSpeaking: boolean;
  speak: (text: string, language?: string) => Promise<void>;
  stopSpeaking: () => void;
  error: string | null;
}

// Clean text for natural speech - remove markdown, symbols, code blocks
const cleanTextForSpeech = (text: string): string => {
  let cleaned = text;
  
  // Remove code blocks
  cleaned = cleaned.replace(/```[\s\S]*?```/g, '');
  cleaned = cleaned.replace(/`[^`]+`/g, '');
  
  // Remove markdown formatting
  cleaned = cleaned.replace(/#{1,6}\s/g, ''); // Headers
  cleaned = cleaned.replace(/\*\*([^*]+)\*\*/g, '$1'); // Bold
  cleaned = cleaned.replace(/\*([^*]+)\*/g, '$1'); // Italic
  cleaned = cleaned.replace(/__([^_]+)__/g, '$1'); // Bold underscore
  cleaned = cleaned.replace(/_([^_]+)_/g, '$1'); // Italic underscore
  cleaned = cleaned.replace(/~~([^~]+)~~/g, '$1'); // Strikethrough
  
  // Remove bullet points and numbered lists markers
  cleaned = cleaned.replace(/^\s*[-*•]\s+/gm, '');
  cleaned = cleaned.replace(/^\s*\d+\.\s+/gm, '');
  
  // Remove links but keep text
  cleaned = cleaned.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
  
  // Remove images
  cleaned = cleaned.replace(/!\[[^\]]*\]\([^)]+\)/g, '');
  
  // Remove horizontal rules
  cleaned = cleaned.replace(/^[-*_]{3,}$/gm, '');
  
  // Remove excessive symbols
  cleaned = cleaned.replace(/[<>{}|\^~]/g, '');
  
  // Clean up whitespace
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  cleaned = cleaned.replace(/\s{2,}/g, ' ');
  cleaned = cleaned.trim();
  
  return cleaned;
};

export const useElevenLabsTTS = (): UseElevenLabsTTSReturn => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioQueueRef = useRef<string[]>([]);
  const isProcessingRef = useRef(false);

  // Process queue of audio to speak
  const processQueue = useCallback(async () => {
    if (isProcessingRef.current || audioQueueRef.current.length === 0) {
      return;
    }
    
    isProcessingRef.current = true;
    setIsSpeaking(true);
    
    while (audioQueueRef.current.length > 0) {
      const text = audioQueueRef.current.shift();
      if (!text) continue;
      
      try {
        const cleanedText = cleanTextForSpeech(text);
        if (!cleanedText || cleanedText.length < 3) continue;
        
        // Use fetch instead of supabase.functions.invoke for binary data
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            },
            body: JSON.stringify({ text: cleanedText }),
          }
        );

        if (!response.ok) {
          throw new Error(`TTS request failed: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.error) {
          throw new Error(data.error);
        }

        if (data.audioContent) {
          // Use data URI for base64 audio
          const audioUrl = `data:audio/mpeg;base64,${data.audioContent}`;
          
          await new Promise<void>((resolve, reject) => {
            const audio = new Audio(audioUrl);
            audioRef.current = audio;
            
            audio.onended = () => {
              audioRef.current = null;
              resolve();
            };
            
            audio.onerror = (e) => {
              audioRef.current = null;
              reject(new Error('Audio playback failed'));
            };
            
            audio.play().catch(reject);
          });
        }
      } catch (err) {
        console.error('TTS Error:', err);
        setError(err instanceof Error ? err.message : 'TTS failed');
      }
    }
    
    isProcessingRef.current = false;
    setIsSpeaking(false);
  }, []);

  const speak = useCallback(async (text: string, language?: string) => {
    if (!text || text.trim().length === 0) return;
    
    setError(null);
    audioQueueRef.current.push(text);
    processQueue();
  }, [processQueue]);

  const stopSpeaking = useCallback(() => {
    // Clear the queue
    audioQueueRef.current = [];
    
    // Stop current audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    
    isProcessingRef.current = false;
    setIsSpeaking(false);
  }, []);

  return {
    isSpeaking,
    speak,
    stopSpeaking,
    error,
  };
};

export default useElevenLabsTTS;
