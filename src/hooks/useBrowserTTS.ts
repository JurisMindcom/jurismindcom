import { useState, useRef, useCallback, useEffect } from 'react';

interface UseBrowserTTSOptions {
  language?: 'english' | 'bangla' | 'mixed';
  rate?: number;
  pitch?: number;
  volume?: number;
}

interface UseBrowserTTSReturn {
  isSpeaking: boolean;
  isPaused: boolean;
  speak: (text: string) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  isSupported: boolean;
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
  
  // Convert numbers to words for better speech
  cleaned = cleaned.replace(/\bSection (\d+)/gi, (_, num) => {
    return `Section ${numberToWords(parseInt(num, 10))}`;
  });
  
  return cleaned;
};

// Convert number to words (for section numbers, etc.)
const numberToWords = (num: number): string => {
  if (num < 0 || num > 9999) return num.toString();
  
  const ones = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 
    'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
  const tens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
  
  if (num < 20) return ones[num];
  if (num < 100) {
    const remainder = num % 10;
    return tens[Math.floor(num / 10)] + (remainder ? ' ' + ones[remainder] : '');
  }
  if (num < 1000) {
    const remainder = num % 100;
    return ones[Math.floor(num / 100)] + ' hundred' + (remainder ? ' ' + numberToWords(remainder) : '');
  }
  
  const remainder = num % 1000;
  return numberToWords(Math.floor(num / 1000)) + ' thousand' + (remainder ? ' ' + numberToWords(remainder) : '');
};

// Get appropriate voice for language
const getVoiceForLanguage = (lang: string): SpeechSynthesisVoice | null => {
  const voices = window.speechSynthesis.getVoices();
  
  // Map language codes - prioritize high-quality voices
  const langMap: Record<string, string[]> = {
    bangla: ['bn-BD', 'bn-IN', 'bn', 'Bengali'],
    english: ['en-US', 'en-GB', 'en-IN', 'en'],
    mixed: ['en-IN', 'en-US', 'en'], // English with South Asian accent works well for mixed
  };
  
  const targetLangs = langMap[lang] || langMap.english;
  
  // Try to find high-quality voices first (Google, Microsoft)
  for (const targetLang of targetLangs) {
    const premiumVoice = voices.find(v => 
      (v.name.includes('Google') || v.name.includes('Microsoft') || v.name.includes('Premium')) &&
      (v.lang.toLowerCase().includes(targetLang.toLowerCase()) ||
       v.name.toLowerCase().includes(targetLang.toLowerCase()))
    );
    if (premiumVoice) return premiumVoice;
  }
  
  // Fallback to any matching voice
  for (const targetLang of targetLangs) {
    const voice = voices.find(v => 
      v.lang.toLowerCase().includes(targetLang.toLowerCase()) ||
      v.name.toLowerCase().includes(targetLang.toLowerCase())
    );
    if (voice) return voice;
  }
  
  // Final fallback to default
  return voices[0] || null;
};

export const useBrowserTTS = (options: UseBrowserTTSOptions = {}): UseBrowserTTSReturn => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(true);
  
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const textQueueRef = useRef<string[]>([]);
  const isProcessingRef = useRef(false);
  
  // Check browser support and preload voices
  useEffect(() => {
    if (!('speechSynthesis' in window)) {
      setIsSupported(false);
      setError('Text-to-speech not supported in this browser');
      return;
    }
    
    // Preload voices
    const loadVoices = () => {
      window.speechSynthesis.getVoices();
    };
    
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }, []);
  
  // Process queue of text to speak
  const processQueue = useCallback(() => {
    if (isProcessingRef.current || textQueueRef.current.length === 0 || isPaused) {
      return;
    }
    
    isProcessingRef.current = true;
    setIsSpeaking(true);
    
    const text = textQueueRef.current.shift();
    if (!text) {
      isProcessingRef.current = false;
      setIsSpeaking(false);
      return;
    }
    
    const cleanedText = cleanTextForSpeech(text);
    if (!cleanedText || cleanedText.length < 3) {
      isProcessingRef.current = false;
      processQueue();
      return;
    }
    
    const utterance = new SpeechSynthesisUtterance(cleanedText);
    utteranceRef.current = utterance;
    
    // Configure voice
    const voice = getVoiceForLanguage(options.language || 'english');
    if (voice) {
      utterance.voice = voice;
    }
    
    // Configure speech parameters for natural delivery
    utterance.rate = options.rate || 0.95;
    utterance.pitch = options.pitch || 1.0;
    utterance.volume = options.volume || 1.0;
    
    utterance.onend = () => {
      isProcessingRef.current = false;
      if (textQueueRef.current.length > 0) {
        processQueue();
      } else {
        setIsSpeaking(false);
      }
    };
    
    utterance.onerror = (event) => {
      isProcessingRef.current = false;
      if (event.error !== 'interrupted' && event.error !== 'canceled') {
        setError(`Speech error: ${event.error}`);
      }
      if (textQueueRef.current.length > 0) {
        processQueue();
      } else {
        setIsSpeaking(false);
      }
    };
    
    window.speechSynthesis.speak(utterance);
  }, [isPaused, options.language, options.rate, options.pitch, options.volume]);
  
  // Speak text (adds to queue and processes)
  const speak = useCallback((text: string) => {
    if (!isSupported || !text.trim()) return;
    
    setError(null);
    setIsPaused(false);
    
    // Split long text into sentences for smoother playback
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    textQueueRef.current.push(...sentences);
    
    processQueue();
  }, [isSupported, processQueue]);
  
  // Pause speaking
  const pause = useCallback(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.pause();
      setIsPaused(true);
    }
  }, []);
  
  // Resume speaking
  const resume = useCallback(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.resume();
      setIsPaused(false);
    }
  }, []);
  
  // Stop speaking completely
  const stop = useCallback(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    textQueueRef.current = [];
    isProcessingRef.current = false;
    setIsSpeaking(false);
    setIsPaused(false);
  }, []);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);
  
  return {
    isSpeaking,
    isPaused,
    speak,
    pause,
    resume,
    stop,
    isSupported,
    error,
  };
};

export default useBrowserTTS;
