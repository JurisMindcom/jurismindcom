import { motion } from 'framer-motion';
import { Volume2, Pause, Play, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface TTSSpeakButtonProps {
  isSpeaking: boolean;
  isPaused: boolean;
  onSpeak: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  disabled?: boolean;
}

const TTSSpeakButton = ({
  isSpeaking,
  isPaused,
  onSpeak,
  onPause,
  onResume,
  onStop,
  disabled = false,
}: TTSSpeakButtonProps) => {
  const isActive = isSpeaking || isPaused;
  
  return (
    <div className="inline-flex items-center gap-1">
      {/* Main Speak/Pause Button */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={`h-7 w-7 relative ${
                isActive 
                  ? 'text-accent hover:text-accent hover:bg-accent/10' 
                  : 'hover:bg-muted'
              }`}
              onClick={() => {
                if (isSpeaking && !isPaused) {
                  onPause();
                } else if (isPaused) {
                  onResume();
                } else {
                  onSpeak();
                }
              }}
              disabled={disabled}
            >
              {/* Glow effect when active */}
              {isActive && (
                <motion.div
                  className="absolute inset-0 rounded-md bg-accent/20"
                  animate={{
                    opacity: [0.3, 0.6, 0.3],
                    scale: [1, 1.1, 1],
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                />
              )}
              
              {/* Indicator dots when speaking */}
              {isSpeaking && !isPaused && (
                <div className="absolute -top-0.5 -right-0.5 flex gap-0.5">
                  {[0, 1, 2].map((i) => (
                    <motion.span
                      key={i}
                      className="w-1 h-1 rounded-full bg-accent"
                      animate={{
                        opacity: [0.4, 1, 0.4],
                        scale: [0.8, 1.2, 0.8],
                      }}
                      transition={{
                        duration: 0.8,
                        repeat: Infinity,
                        delay: i * 0.15,
                      }}
                    />
                  ))}
                </div>
              )}
              
              {isPaused ? (
                <Play className="h-4 w-4 fill-current" />
              ) : isSpeaking ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Volume2 className="h-4 w-4" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {isPaused ? 'Resume' : isSpeaking ? 'Pause' : 'Speak'}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      
      {/* Stop Button (only visible when active) */}
      {isActive && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-accent hover:text-accent hover:bg-accent/10"
                  onClick={onStop}
                >
                  <Square className="h-3 w-3 fill-current" />
                </Button>
              </motion.div>
            </TooltipTrigger>
            <TooltipContent>Stop</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
};

export default TTSSpeakButton;
