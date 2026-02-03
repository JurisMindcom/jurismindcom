import { useState, useRef, useCallback, useEffect } from 'react';

interface UseVoiceRecorderReturn {
  isRecording: boolean;
  audioBlob: Blob | null;
  duration: number;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  clearRecording: () => void;
  error: string | null;
  isSupported: boolean;
}

export const useVoiceRecorder = (): UseVoiceRecorderReturn => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(true);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Check browser support
  useEffect(() => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setIsSupported(false);
      setError('Voice recording not supported in this browser');
    }
  }, []);
  
  const startRecording = useCallback(async () => {
    if (!isSupported) {
      setError('Voice recording not supported');
      return;
    }
    
    try {
      setError(null);
      chunksRef.current = [];
      setAudioBlob(null);
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        } 
      });
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
          ? 'audio/webm;codecs=opus' 
          : 'audio/webm'
      });
      
      mediaRecorderRef.current = mediaRecorder;
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
        
        // Clear timer
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
      };
      
      mediaRecorder.onerror = () => {
        setError('Recording error occurred');
        setIsRecording(false);
      };
      
      // Start recording
      mediaRecorder.start(100); // Collect data every 100ms
      setIsRecording(true);
      startTimeRef.current = Date.now();
      setDuration(0);
      
      // Update duration every 100ms
      timerRef.current = setInterval(() => {
        setDuration((Date.now() - startTimeRef.current) / 1000);
      }, 100);
      
    } catch (err: any) {
      if (err.name === 'NotAllowedError') {
        setError('Microphone access denied. Please allow microphone access.');
      } else if (err.name === 'NotFoundError') {
        setError('No microphone found. Please connect a microphone.');
      } else {
        setError(`Recording error: ${err.message}`);
      }
    }
  }, [isSupported]);
  
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, []);
  
  const clearRecording = useCallback(() => {
    setAudioBlob(null);
    setDuration(0);
    chunksRef.current = [];
  }, []);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);
  
  return {
    isRecording,
    audioBlob,
    duration,
    startRecording,
    stopRecording,
    clearRecording,
    error,
    isSupported,
  };
};

export default useVoiceRecorder;
