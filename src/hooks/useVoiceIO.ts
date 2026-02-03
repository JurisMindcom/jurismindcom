import { useState, useRef, useCallback, useEffect } from 'react';

// Type definitions for Web Speech API
interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionResultList {
  length: number;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onstart: ((this: SpeechRecognition, ev: Event) => void) | null;
  onend: ((this: SpeechRecognition, ev: Event) => void) | null;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => void) | null;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => void) | null;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognition;
}

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

interface UseVoiceIOOptions {
  language?: string;
  onTranscript?: (text: string, isFinal: boolean) => void;
  onListeningChange?: (isListening: boolean) => void;
  onSpeakingChange?: (isSpeaking: boolean) => void;
  onError?: (error: string) => void;
}

interface UseVoiceIOReturn {
  // Voice Input (STT)
  isListening: boolean;
  startListening: () => void;
  stopListening: () => void;
  toggleListening: () => void;
  transcript: string;
  interimTranscript: string;
  
  // Voice Output (TTS)
  isSpeaking: boolean;
  speak: (text: string, language?: string) => void;
  stopSpeaking: () => void;
  
  // State
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
  
  // Convert numbers for better speech
  cleaned = cleaned.replace(/(\d+)/g, (match) => {
    const num = parseInt(match, 10);
    if (num > 0 && num < 100) {
      return match; // Keep small numbers as-is
    }
    return match; // Browser TTS handles numbers well
  });
  
  return cleaned;
};

// Get appropriate voice for language
const getVoiceForLanguage = (lang: string): SpeechSynthesisVoice | null => {
  const voices = window.speechSynthesis.getVoices();
  
  // Map language codes
  const langMap: Record<string, string[]> = {
    bangla: ['bn', 'bn-BD', 'bn-IN', 'Bengali'],
    english: ['en', 'en-US', 'en-GB', 'en-IN'],
    mixed: ['en-IN', 'en', 'en-US'], // English with South Asian accent works well for mixed
  };
  
  const targetLangs = langMap[lang] || langMap.english;
  
  // Try to find a matching voice
  for (const targetLang of targetLangs) {
    const voice = voices.find(v => 
      v.lang.toLowerCase().includes(targetLang.toLowerCase()) ||
      v.name.toLowerCase().includes(targetLang.toLowerCase())
    );
    if (voice) return voice;
  }
  
  // Fallback to default
  return voices[0] || null;
};

export const useVoiceIO = (options: UseVoiceIOOptions = {}): UseVoiceIOReturn => {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(true);
  
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  
  // Check browser support
  useEffect(() => {
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    const hasTTS = 'speechSynthesis' in window;
    
    if (!SpeechRecognitionAPI || !hasTTS) {
      setIsSupported(false);
      setError('Voice features not supported in this browser');
    }
    
    // Preload voices
    if (hasTTS) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
      };
    }
  }, []);
  
  // Initialize speech recognition
  const initRecognition = useCallback(() => {
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) return null;
    
    const recognition = new SpeechRecognitionAPI();
    
    // Configure for optimal Bangla/English support
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    
    // Set language based on option
    const langMap: Record<string, string> = {
      bangla: 'bn-BD',
      english: 'en-US',
      mixed: 'en-IN', // Works well for Banglish
    };
    recognition.lang = langMap[options.language || 'english'] || 'en-US';
    
    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
      options.onListeningChange?.(true);
    };
    
    recognition.onend = () => {
      setIsListening(false);
      options.onListeningChange?.(false);
    };
    
    recognition.onresult = (event) => {
      let finalText = '';
      let interimText = '';
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalText += result[0].transcript;
        } else {
          interimText += result[0].transcript;
        }
      }
      
      if (finalText) {
        setTranscript(prev => prev + ' ' + finalText);
        options.onTranscript?.(finalText, true);
      }
      
      setInterimTranscript(interimText);
      if (interimText) {
        options.onTranscript?.(interimText, false);
      }
    };
    
    recognition.onerror = (event) => {
      let errorMessage = 'Voice recognition error';
      
      switch (event.error) {
        case 'no-speech':
          errorMessage = 'No speech detected. Please try again.';
          break;
        case 'audio-capture':
          errorMessage = 'Microphone not found or not allowed.';
          break;
        case 'not-allowed':
          errorMessage = 'Microphone access denied. Please enable microphone.';
          break;
        case 'network':
          errorMessage = 'Network error. Please check connection.';
          break;
        default:
          errorMessage = `Voice error: ${event.error}`;
      }
      
      setError(errorMessage);
      setIsListening(false);
      options.onError?.(errorMessage);
    };
    
    return recognition;
  }, [options]);
  
  // Start listening
  const startListening = useCallback(() => {
    if (!isSupported) {
      setError('Voice input not supported');
      return;
    }
    
    // Stop any ongoing speech
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
    
    // Clear previous transcript
    setTranscript('');
    setInterimTranscript('');
    
    // Initialize and start recognition
    if (!recognitionRef.current) {
      recognitionRef.current = initRecognition();
    }
    
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
      } catch (e) {
        // Already started, restart
        recognitionRef.current.stop();
        setTimeout(() => {
          recognitionRef.current?.start();
        }, 100);
      }
    }
  }, [isSupported, isSpeaking, initRecognition]);
  
  // Stop listening
  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
    setInterimTranscript('');
  }, []);
  
  // Toggle listening
  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);
  
  // Text-to-Speech
  const speak = useCallback((text: string, language?: string) => {
    if (!('speechSynthesis' in window)) {
      setError('Text-to-speech not supported');
      return;
    }
    
    // Stop any ongoing speech
    window.speechSynthesis.cancel();
    
    // Clean the text for natural speech
    const cleanedText = cleanTextForSpeech(text);
    if (!cleanedText) return;
    
    const utterance = new SpeechSynthesisUtterance(cleanedText);
    utteranceRef.current = utterance;
    
    // Configure voice
    const voice = getVoiceForLanguage(language || options.language || 'english');
    if (voice) {
      utterance.voice = voice;
    }
    
    // Configure speech parameters for natural delivery
    utterance.rate = 0.95; // Slightly slower for clarity
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    
    utterance.onstart = () => {
      setIsSpeaking(true);
      options.onSpeakingChange?.(true);
    };
    
    utterance.onend = () => {
      setIsSpeaking(false);
      options.onSpeakingChange?.(false);
    };
    
    utterance.onerror = (event) => {
      setIsSpeaking(false);
      options.onSpeakingChange?.(false);
      if (event.error !== 'interrupted') {
        setError(`Speech error: ${event.error}`);
      }
    };
    
    window.speechSynthesis.speak(utterance);
  }, [options]);
  
  // Stop speaking
  const stopSpeaking = useCallback(() => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    options.onSpeakingChange?.(false);
  }, [options]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      window.speechSynthesis.cancel();
    };
  }, []);
  
  return {
    isListening,
    startListening,
    stopListening,
    toggleListening,
    transcript,
    interimTranscript,
    isSpeaking,
    speak,
    stopSpeaking,
    isSupported,
    error,
  };
};

export default useVoiceIO;
