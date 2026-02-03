import { Plus, X, Scale, Gavel, Search, GraduationCap, Sparkles, Scan, ImageIcon, Zap, BookOpen, Flame } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface PlusButtonMenuProps {
  personality: 'lawyer' | 'judge' | 'researcher' | 'student';
  responseMode: 'short' | 'deep' | 'extreme';
  imageMode: 'off' | 'generate' | 'analyze' | 'edit';
  onPersonalityChange: (mode: 'lawyer' | 'judge' | 'researcher' | 'student') => void;
  onResponseModeChange: (mode: 'short' | 'deep' | 'extreme') => void;
  onImageModeChange: (mode: 'off' | 'generate' | 'analyze' | 'edit') => void;
  disabled?: boolean;
}

const PlusButtonMenu = ({
  personality,
  responseMode,
  imageMode,
  onPersonalityChange,
  onResponseModeChange,
  onImageModeChange,
  disabled = false,
}: PlusButtonMenuProps) => {
  const personalityItems = [
    { value: 'lawyer' as const, icon: Scale, label: 'Lawyer Mode', emoji: '⚖️' },
    { value: 'judge' as const, icon: Gavel, label: 'Judge Mode', emoji: '👨‍⚖️' },
    { value: 'researcher' as const, icon: Search, label: 'Researcher Mode', emoji: '🔍' },
    { value: 'student' as const, icon: GraduationCap, label: 'Student Mode', emoji: '📚' },
  ];

  const responseModeItems = [
    { value: 'short' as const, icon: Zap, label: 'Short Answer', desc: 'Brief (1-7 lines)' },
    { value: 'deep' as const, icon: BookOpen, label: 'Deep Answer', desc: 'Comprehensive' },
    { value: 'extreme' as const, icon: Flame, label: 'Extreme Deep', desc: '3500-4500 words', color: 'text-orange-500' },
  ];

  const imageItems = [
    { value: 'generate' as const, icon: Sparkles, label: 'Generate Image', desc: 'Create from text', color: 'text-pink-500' },
    { value: 'analyze' as const, icon: Scan, label: 'Analyze Image', desc: 'Extract insights', color: 'text-blue-500' },
    { value: 'edit' as const, icon: ImageIcon, label: 'Edit Image', desc: 'Modify with AI', color: 'text-purple-500' },
  ];

  const hasActiveMode = imageMode !== 'off';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          disabled={disabled}
          className={`h-10 w-10 rounded-full border transition-all duration-200 ${
            hasActiveMode 
              ? 'bg-gradient-to-r from-pink-500/20 to-purple-500/20 border-pink-500/50' 
              : 'border-border/50 hover:bg-muted'
          }`}
        >
          {hasActiveMode ? <X className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {/* Personality Modes */}
        <DropdownMenuLabel className="text-xs text-muted-foreground">Personality Mode</DropdownMenuLabel>
        {personalityItems.map((item) => (
          <DropdownMenuItem
            key={item.value}
            onClick={() => onPersonalityChange(item.value)}
            className={`gap-2 cursor-pointer ${personality === item.value ? 'bg-primary/10' : ''}`}
          >
            <span className="text-base">{item.emoji}</span>
            <span className="font-medium">{item.label}</span>
            {personality === item.value && <span className="ml-auto text-xs text-primary">Active</span>}
          </DropdownMenuItem>
        ))}

        <DropdownMenuSeparator />

        {/* Image AI */}
        <DropdownMenuLabel className="text-xs text-muted-foreground">🖼 Image AI</DropdownMenuLabel>
        {imageItems.map((item) => {
          const Icon = item.icon;
          return (
            <DropdownMenuItem
              key={item.value}
              onClick={() => onImageModeChange(item.value)}
              className={`gap-2 cursor-pointer ${imageMode === item.value ? 'bg-primary/10' : ''}`}
            >
              <Icon className={`h-4 w-4 ${item.color}`} />
              <div className="flex flex-col">
                <span className="font-medium">{item.label}</span>
                <span className="text-xs text-muted-foreground">{item.desc}</span>
              </div>
              {imageMode === item.value && <span className="ml-auto text-xs text-primary">Active</span>}
            </DropdownMenuItem>
          );
        })}
        {imageMode !== 'off' && (
          <DropdownMenuItem
            onClick={() => onImageModeChange('off')}
            className="gap-2 cursor-pointer text-destructive"
          >
            <X className="h-4 w-4" />
            <span>Exit Image Mode</span>
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator />

        {/* Answer Mode */}
        <DropdownMenuLabel className="text-xs text-muted-foreground">📘 Answer Mode</DropdownMenuLabel>
        {responseModeItems.map((item) => {
          const Icon = item.icon;
          return (
            <DropdownMenuItem
              key={item.value}
              onClick={() => onResponseModeChange(item.value)}
              className={`gap-2 cursor-pointer ${responseMode === item.value ? 'bg-primary/10' : ''}`}
            >
              <Icon className={`h-4 w-4 ${item.color || ''}`} />
              <div className="flex flex-col">
                <span className={`font-medium ${item.color || ''}`}>{item.label}</span>
                <span className="text-xs text-muted-foreground">{item.desc}</span>
              </div>
              {responseMode === item.value && <span className="ml-auto text-xs text-primary">Active</span>}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default PlusButtonMenu;
