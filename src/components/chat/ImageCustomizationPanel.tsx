import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Unlock, Check, Sparkles } from 'lucide-react';
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
      {/* Customization Button - Matches system theme and other buttons */}
      <button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200",
          "text-sm font-medium",
          "bg-secondary hover:bg-secondary/80",
          "border border-border",
          "text-secondary-foreground",
          "shadow-sm hover:shadow-md",
          "active:scale-[0.98]",
          disabled && "opacity-50 cursor-not-allowed",
          isOpen && "ring-2 ring-primary/50 border-primary/60"
        )}
      >
        <Sparkles className="w-4 h-4" />
        <span>Customize</span>
        {displayText && (
          <span className="text-[10px] text-primary font-medium ml-1 truncate max-w-[60px]">
            {displayText}
          </span>
        )}
      </button>

      {/* Animated Flyout Panel - Opens ABOVE the button */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            transition={{ 
              type: "spring", 
              stiffness: 400, 
              damping: 25,
              duration: 0.3
            }}
            className={cn(
              "absolute left-0 bottom-full mb-2 z-50",
              "w-[300px] sm:w-[320px] max-h-[60vh] overflow-y-auto",
              "rounded-xl border border-border",
              "bg-popover backdrop-blur-xl",
              "shadow-lg",
              "p-4 space-y-4"
            )}
            style={{
              transformOrigin: 'bottom left'
            }}
          >
            {/* Panel Header */}
            <div className="flex items-center gap-2 pb-2 border-b border-border">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <h3 className="text-sm font-semibold text-foreground">Image Customization</h3>
            </div>

            {/* Style Presets Section */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <span className="w-4 h-[1px] bg-border" />
                Style
              </label>
              <div className="grid grid-cols-3 gap-2">
                {STYLE_PRESETS.map((style) => (
                  <button
                    key={style.id}
                    onClick={() => handleStyleChange(style.id)}
                    className={cn(
                      "relative px-2 py-2 rounded-lg transition-all duration-200",
                      "border text-center",
                      "hover:scale-[1.02] active:scale-[0.98]",
                      value.style === style.id
                        ? "bg-primary/20 border-primary/60 shadow-sm"
                        : "bg-muted/50 border-border hover:border-muted-foreground/50"
                    )}
                  >
                    <div className="text-base mb-0.5">{style.icon}</div>
                    <div className={cn(
                      "text-[10px] font-medium",
                      value.style === style.id ? "text-primary" : "text-muted-foreground"
                    )}>
                      {style.label}
                    </div>
                    {value.style === style.id && (
                      <motion.div
                        layoutId="style-check"
                        className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full flex items-center justify-center"
                      >
                        <Check className="w-2.5 h-2.5 text-primary-foreground" />
                      </motion.div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Aspect Ratio Section */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <span className="w-4 h-[1px] bg-border" />
                Aspect Ratio
              </label>
              <div className="flex flex-wrap gap-1.5">
                {ASPECT_RATIOS.map((ratio) => (
                  <button
                    key={ratio.id}
                    onClick={() => handleRatioChange(ratio.id)}
                    className={cn(
                      "px-2.5 py-1 rounded-full text-xs font-medium transition-all duration-200",
                      "border",
                      value.aspectRatio === ratio.id
                        ? "bg-primary text-primary-foreground border-primary shadow-sm"
                        : "bg-muted/50 text-muted-foreground border-border hover:border-muted-foreground/50 hover:bg-muted"
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
                      "bg-muted/50 border border-border",
                      "text-foreground placeholder:text-muted-foreground",
                      "focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20",
                      "transition-all duration-200"
                    )}
                  />
                  <button
                    onClick={() => setIsCustomRatio(!isCustomRatio)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {isCustomRatio ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Image Count Section */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <span className="w-4 h-[1px] bg-border" />
                Number of Images
              </label>
              <div className="flex gap-2">
                {IMAGE_COUNTS.map((count) => (
                  <button
                    key={count}
                    onClick={() => handleCountChange(count)}
                    className={cn(
                      "flex-1 py-2 rounded-lg text-sm font-bold transition-all duration-200",
                      "border",
                      value.imageCount === count
                        ? "bg-primary text-primary-foreground border-primary shadow-sm"
                        : "bg-muted/50 text-muted-foreground border-border hover:border-muted-foreground/50 hover:bg-muted"
                    )}
                  >
                    {count}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground text-center">
                Generate up to 4 variations at once
              </p>
            </div>

            {/* Close hint */}
            <div className="pt-2 border-t border-border text-center">
              <p className="text-[10px] text-muted-foreground">Tap outside or button to close</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ImageCustomizationPanel;