import { motion } from 'framer-motion';

interface VoiceWaveformProps {
  isActive: boolean;
  className?: string;
}

const VoiceWaveform = ({ isActive, className = '' }: VoiceWaveformProps) => {
  const bars = 5;
  
  if (!isActive) return null;
  
  return (
    <div className={`flex items-center justify-center gap-1 ${className}`}>
      {Array.from({ length: bars }).map((_, i) => (
        <motion.span
          key={i}
          className="w-1 bg-destructive rounded-full"
          initial={{ height: 8 }}
          animate={{
            height: [8, 20, 8, 16, 8],
          }}
          transition={{
            duration: 0.8,
            repeat: Infinity,
            delay: i * 0.1,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
};

export default VoiceWaveform;
