import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Unlock, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ImageCustomization {
  aspectRatio: string;
  style: string;
  imageCount: number;
  customRatio?: string;
}

interface ImageCustomizationPanelProps {
  value: ImageCustomization;
  onChange: (value: ImageCustomization) => void;
  disabled?: boolean;
}

const STYLE_PRESETS = [
  { id: 'normal', label: 'Normal', icon: '✨' },
  { id: 'realistic', label: 'Realistic', icon: '📷' },
  { id: 'cinematic', label: 'Cinematic', icon: '🎬' },
  { id: 'cartoon', label: 'Cartoon', icon: '🎨' },
  { id: '3d', label: '3D', icon: '🧊' },
  { id: 'vector', label: 'Vector', icon: '📐' },
  { id: 'anime', label: 'Anime', icon: '🌸' },
];

const ASPECT_RATIOS = [
  { id: 'auto', label: 'Auto' },
  { id: '1:1', label: '1:1' },
  { id: '16:9', label: '16:9' },
  { id: '9:16', label: '9:16' },
  { id: '3:2', label: '3:2' },
  { id: '2:3', label: '2:3' },
  { id: '4:3', label: '4:3' },
  { id: '3:4', label: '3:4' },
];

const IMAGE_COUNTS = [1, 2, 3, 4];

const ImageCustomizationPanel = ({ value, onChange, disabled }: ImageCustomizationPanelProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isCustomRatio, setIsCustomRatio] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Close panel when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleStyleChange = (styleId: string) => {
    onChange({ ...value, style: styleId });
  };

  const handleRatioChange = (ratioId: string) => {
    if (ratioId === 'custom') {
      setIsCustomRatio(true);
    } else {
      setIsCustomRatio(false);
      onChange({ ...value, aspectRatio: ratioId, customRatio: undefined });
    }
  };

  const handleCustomRatioChange = (customRatio: string) => {
    onChange({ ...value, aspectRatio: 'custom', customRatio });
  };

  const handleCountChange = (count: number) => {
    onChange({ ...value, imageCount: count });
  };

  // Get display text for current settings
  const getDisplayText = () => {
    const parts = [];
    if (value.style && value.style !== 'normal') {
      parts.push(value.style);
    }
    if (value.aspectRatio && value.aspectRatio !== 'auto') {
      parts.push(value.aspectRatio === 'custom' ? value.customRatio : value.aspectRatio);
    }
    if (value.imageCount > 1) {
      parts.push(`×${value.imageCount}`);
    }
    return parts.length > 0 ? parts.join(' · ') : null;
  };

  const displayText = getDisplayText();

  return (
    <div className="relative" ref={panelRef}>
      {/* Customization Button - Handwritten artistic style */}
      <button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={cn(
          "relative group px-4 py-2 rounded-lg transition-all duration-300",
          "bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900",
          "border border-zinc-700/50",
          "shadow-[0_0_15px_rgba(255,255,255,0.05),inset_0_1px_0_rgba(255,255,255,0.1)]",
          "hover:shadow-[0_0_20px_rgba(255,138,0,0.15),inset_0_1px_0_rgba(255,255,255,0.15)]",
          "hover:border-primary/40",
          "active:scale-[0.98]",
          disabled && "opacity-50 cursor-not-allowed",
          isOpen && "border-primary/60 shadow-[0_0_25px_rgba(255,138,0,0.2)]"
        )}
      >
        {/* Artistic scratches/texture overlay */}
        <div className="absolute inset-0 opacity-20 pointer-events-none overflow-hidden rounded-lg">
          <div className="absolute top-1 left-2 w-8 h-[1px] bg-white/30 rotate-[15deg]" />
          <div className="absolute bottom-2 right-3 w-5 h-[1px] bg-white/20 rotate-[-10deg]" />
          <div className="absolute top-3 right-4 w-3 h-[1px] bg-white/25 rotate-[5deg]" />
        </div>

        {/* Main content */}
        <div className="flex items-center gap-2">
          {/* Small decorative element */}
          <div className="flex flex-col gap-[2px]">
            <div className="w-[3px] h-[3px] bg-primary/60 rounded-full" />
            <div className="w-[3px] h-[3px] bg-primary/40 rounded-full" />
          </div>

          {/* Handwritten-style text */}
          <span 
            className={cn(
              "text-sm font-medium tracking-wide",
              "bg-gradient-to-r from-zinc-100 via-white to-zinc-200 bg-clip-text text-transparent",
              "drop-shadow-[0_0_10px_rgba(255,255,255,0.1)]"
            )}
            style={{ 
              fontFamily: "'Caveat', 'Segoe Script', 'Bradley Hand', cursive",
              letterSpacing: '0.05em'
            }}
          >
            Customization
          </span>

          {/* Active indicator */}
          {displayText && (
            <span className="text-[10px] text-primary/80 font-medium ml-1 truncate max-w-[80px]">
              {displayText}
            </span>
          )}
        </div>

        {/* Glow effect on hover */}
        <div className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
          <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-primary/5 to-transparent" />
        </div>
      </button>

      {/* Animated Flyout Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, x: 20, y: 20 }}
            animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, x: 20, y: 20 }}
            transition={{ 
              type: "spring", 
              stiffness: 400, 
              damping: 25,
              duration: 0.3
            }}
            className={cn(
              "absolute right-0 top-full mt-2 z-50",
              "w-[320px] max-h-[70vh] overflow-y-auto",
              "rounded-xl border border-zinc-700/50",
              "bg-zinc-900/95 backdrop-blur-xl",
              "shadow-[0_20px_60px_-10px_rgba(0,0,0,0.5),0_0_30px_rgba(255,138,0,0.1)]",
              "p-4 space-y-5"
            )}
            style={{
              transformOrigin: 'top right'
            }}
          >
            {/* Panel Header */}
            <div className="flex items-center gap-2 pb-2 border-b border-zinc-700/50">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <h3 className="text-sm font-semibold text-zinc-100">Image Customization</h3>
            </div>

            {/* Style Presets Section */}
            <div className="space-y-3">
              <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                <span className="w-4 h-[1px] bg-zinc-600" />
                Style
              </label>
              <div className="grid grid-cols-3 gap-2">
                {STYLE_PRESETS.map((style) => (
                  <button
                    key={style.id}
                    onClick={() => handleStyleChange(style.id)}
                    className={cn(
                      "relative px-3 py-2.5 rounded-lg transition-all duration-200",
                      "border text-center",
                      "hover:scale-[1.02] active:scale-[0.98]",
                      value.style === style.id
                        ? "bg-primary/20 border-primary/60 shadow-[0_0_15px_rgba(255,138,0,0.2)]"
                        : "bg-zinc-800/50 border-zinc-700/50 hover:border-zinc-600"
                    )}
                  >
                    <div className="text-lg mb-0.5">{style.icon}</div>
                    <div className={cn(
                      "text-[10px] font-medium",
                      value.style === style.id ? "text-primary" : "text-zinc-400"
                    )}>
                      {style.label}
                    </div>
                    {value.style === style.id && (
                      <motion.div
                        layoutId="style-check"
                        className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full flex items-center justify-center"
                      >
                        <Check className="w-2.5 h-2.5 text-zinc-900" />
                      </motion.div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Aspect Ratio Section */}
            <div className="space-y-3">
              <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                <span className="w-4 h-[1px] bg-zinc-600" />
                Aspect Ratio
              </label>
              <div className="flex flex-wrap gap-2">
                {ASPECT_RATIOS.map((ratio) => (
                  <button
                    key={ratio.id}
                    onClick={() => handleRatioChange(ratio.id)}
                    className={cn(
                      "px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200",
                      "border",
                      value.aspectRatio === ratio.id
                        ? "bg-primary text-zinc-900 border-primary shadow-[0_0_15px_rgba(255,138,0,0.3)]"
                        : "bg-zinc-800/50 text-zinc-300 border-zinc-700/50 hover:border-zinc-600 hover:bg-zinc-800"
                    )}
                  >
                    {ratio.label}
                  </button>
                ))}
              </div>

              {/* Custom Ratio Input */}
              <div className="flex items-center gap-2 mt-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    placeholder="Custom (e.g., 5:4)"
                    value={value.customRatio || ''}
                    onChange={(e) => handleCustomRatioChange(e.target.value)}
                    onFocus={() => setIsCustomRatio(true)}
                    className={cn(
                      "w-full px-3 py-2 pr-8 rounded-lg text-xs",
                      "bg-zinc-800/50 border border-zinc-700/50",
                      "text-zinc-200 placeholder:text-zinc-500",
                      "focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20",
                      "transition-all duration-200"
                    )}
                  />
                  <button
                    onClick={() => setIsCustomRatio(!isCustomRatio)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                  >
                    {isCustomRatio ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Image Count Section */}
            <div className="space-y-3">
              <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                <span className="w-4 h-[1px] bg-zinc-600" />
                Number of Images
              </label>
              <div className="flex gap-2">
                {IMAGE_COUNTS.map((count) => (
                  <button
                    key={count}
                    onClick={() => handleCountChange(count)}
                    className={cn(
                      "flex-1 py-2.5 rounded-lg text-sm font-bold transition-all duration-200",
                      "border",
                      value.imageCount === count
                        ? "bg-primary text-zinc-900 border-primary shadow-[0_0_15px_rgba(255,138,0,0.3)]"
                        : "bg-zinc-800/50 text-zinc-300 border-zinc-700/50 hover:border-zinc-600 hover:bg-zinc-800"
                    )}
                  >
                    {count}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-zinc-500 text-center">
                Generate up to 4 variations at once
              </p>
            </div>

            {/* Close hint */}
            <div className="pt-2 border-t border-zinc-700/30 text-center">
              <p className="text-[10px] text-zinc-500">Click outside or button to close</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ImageCustomizationPanel;
