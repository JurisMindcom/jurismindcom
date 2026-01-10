import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

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

  const statusText = {
    generate: 'Creating image…',
    analyze: 'Analyzing photo…',
    edit: 'Editing image…',
  };

  return (
    <div className="w-full max-w-[400px]">
      <p className="text-sm text-foreground mb-2 font-medium">
        {statusText[mode]}
      </p>
      
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
