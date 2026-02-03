import { motion } from 'framer-motion';
import { Loader2, Sparkles, Wand2, ScanEye } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Progress } from '@/components/ui/progress';

interface ImageProcessingPlaceholderProps {
  mode: 'generate' | 'analyze' | 'edit';
  aspectRatio?: string;
  originalImage?: string;
}

const aspectRatioClasses: Record<string, string> = {
  '1:1': 'aspect-square',
  '16:9': 'aspect-video',
  '9:16': 'aspect-[9/16]',
  '3:2': 'aspect-[3/2]',
  '2:3': 'aspect-[2/3]',
  '4:3': 'aspect-[4/3]',
  '3:4': 'aspect-[3/4]',
};

const ImageProcessingPlaceholder = ({ mode, aspectRatio = '1:1', originalImage }: ImageProcessingPlaceholderProps) => {
  const aspectClass = aspectRatioClasses[aspectRatio] || 'aspect-square';
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState(0);

  const stages = {
    generate: ['Initializing AI...', 'Generating image...', 'Refining details...', 'Finalizing...'],
    analyze: ['Scanning image...', 'Detecting elements...', 'Processing details...', 'Completing analysis...'],
    edit: ['Loading image...', 'Applying changes...', 'Enhancing result...', 'Finalizing edit...'],
  };

  const icons = {
    generate: Sparkles,
    analyze: ScanEye,
    edit: Wand2,
  };

  const IconComponent = icons[mode];

  useEffect(() => {
    // Simulate progress with realistic timing
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        // Slow down as we approach 90% (we never hit 100% until actually done)
        if (prev < 30) return prev + 2;
        if (prev < 60) return prev + 1.5;
        if (prev < 85) return prev + 0.8;
        if (prev < 95) return prev + 0.3;
        return prev;
      });
    }, 200);

    // Update stage text
    const stageInterval = setInterval(() => {
      setStage(prev => (prev + 1) % stages[mode].length);
    }, 3000);

    return () => {
      clearInterval(progressInterval);
      clearInterval(stageInterval);
    };
  }, [mode]);

  return (
    <div className="w-full max-w-[400px]">
      {/* Status header with icon */}
      <div className="flex items-center gap-2 mb-3">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        >
          <IconComponent className="h-4 w-4 text-primary" />
        </motion.div>
        <p className="text-sm text-foreground font-medium">
          {stages[mode][stage]}
        </p>
      </div>

      {/* Progress bar */}
      <div className="mb-3">
        <Progress value={progress} className="h-1.5" />
        <p className="text-xs text-muted-foreground mt-1 text-right">
          {Math.round(progress)}%
        </p>
      </div>
      
      <div className={`relative rounded-xl overflow-hidden ${aspectClass} w-full max-w-[400px]`}>
        {/* For edit mode, show original image with overlay */}
        {mode === 'edit' && originalImage ? (
          <>
            <img
              src={originalImage}
              alt="Original image being edited"
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-background/50 backdrop-blur-sm" />
          </>
        ) : null}

        {/* Animated gradient background */}
        <motion.div
          className="absolute inset-0"
          style={{
            background: mode === 'edit' && originalImage
              ? 'linear-gradient(135deg, rgba(168,85,247,0.4), rgba(236,72,153,0.4), rgba(251,146,60,0.4), rgba(168,85,247,0.4))'
              : 'linear-gradient(135deg, hsl(var(--primary) / 0.6), hsl(280 60% 50% / 0.6), hsl(330 60% 50% / 0.6), hsl(var(--primary) / 0.6))',
            backgroundSize: '400% 400%',
          }}
          animate={{
            backgroundPosition: ['0% 0%', '100% 100%', '0% 0%'],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: 'linear',
          }}
        />

        {/* Shimmer overlay */}
        <motion.div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)',
          }}
          animate={{
            x: ['-100%', '100%'],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />

        {/* Center loader */}
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div
            animate={{ 
              scale: [1, 1.1, 1],
              opacity: [0.8, 1, 0.8],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            className="bg-background/30 backdrop-blur-sm rounded-full p-4"
          >
            <Loader2 className="h-8 w-8 text-white animate-spin" />
          </motion.div>
        </div>

        {/* Noise texture overlay */}
        <div 
          className="absolute inset-0 opacity-20 mix-blend-overlay"
          style={{
            backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.65\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\'/%3E%3C/svg%3E")',
          }}
        />
      </div>
    </div>
  );
};

export default ImageProcessingPlaceholder;
