import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, Mic } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface VoiceMessageCardProps {
  audioBlob: Blob;
  duration?: number;
  timestamp: string;
}

const VoiceMessageCard = ({ audioBlob, duration = 0, timestamp }: VoiceMessageCardProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [audioDuration, setAudioDuration] = useState(duration);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  
  // Create audio URL on mount
  useEffect(() => {
    audioUrlRef.current = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrlRef.current);
    audioRef.current = audio;
    
    audio.onloadedmetadata = () => {
      if (audio.duration && isFinite(audio.duration)) {
        setAudioDuration(audio.duration);
      }
    };
    
    audio.ontimeupdate = () => {
      if (audio.duration && isFinite(audio.duration)) {
        setProgress((audio.currentTime / audio.duration) * 100);
      }
    };
    
    audio.onended = () => {
      setIsPlaying(false);
      setProgress(0);
    };
    
    return () => {
      audio.pause();
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
      }
    };
  }, [audioBlob]);
  
  const togglePlayback = () => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };
  
  const formatTime = (seconds: number) => {
    if (!isFinite(seconds) || seconds <= 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className="flex justify-end"
    >
      <div className="max-w-[80%]">
        <div className="flex items-center gap-3 p-3 rounded-2xl bg-gradient-to-br from-primary to-primary-glow text-primary-foreground">
          {/* Play/Pause Button */}
          <Button
            size="icon"
            variant="ghost"
            className="h-10 w-10 rounded-full bg-primary-foreground/20 hover:bg-primary-foreground/30 text-primary-foreground shrink-0"
            onClick={togglePlayback}
          >
            {isPlaying ? (
              <Pause className="h-5 w-5 fill-current" />
            ) : (
              <Play className="h-5 w-5 fill-current ml-0.5" />
            )}
          </Button>
          
          {/* Waveform Visualization */}
          <div className="flex-1 min-w-[120px]">
            <div className="flex items-center gap-0.5 h-8">
              {Array.from({ length: 20 }).map((_, i) => {
                const barProgress = (i / 20) * 100;
                const isActive = barProgress <= progress;
                const height = 8 + Math.sin(i * 0.5) * 8 + Math.random() * 8;
                
                return (
                  <div
                    key={i}
                    className={`w-1 rounded-full transition-all duration-150 ${
                      isActive ? 'bg-primary-foreground' : 'bg-primary-foreground/40'
                    }`}
                    style={{ height: `${height}px` }}
                  />
                );
              })}
            </div>
            
            {/* Duration */}
            <div className="flex justify-between text-xs opacity-80 mt-1">
              <span>{formatTime(progress * audioDuration / 100)}</span>
              <span>{formatTime(audioDuration)}</span>
            </div>
          </div>
          
          {/* Mic Icon */}
          <div className="p-1.5 rounded-full bg-primary-foreground/20 shrink-0">
            <Mic className="h-4 w-4" />
          </div>
        </div>
        
        {/* Timestamp */}
        <div className="flex justify-end mt-1 px-2">
          <span className="text-xs text-muted-foreground">
            {new Date(timestamp).toLocaleTimeString()}
          </span>
        </div>
      </div>
    </motion.div>
  );
};

export default VoiceMessageCard;
