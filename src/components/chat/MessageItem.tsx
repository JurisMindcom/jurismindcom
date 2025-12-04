import { memo } from 'react';
import { motion } from 'framer-motion';
import { Bot, User, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface MessageItemProps {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
  index: number;
  copiedId: string | null;
  onCopy: (text: string, id: string) => void;
}

// Memoized message component to prevent unnecessary re-renders
const MessageItem = memo(({ id, role, content, created_at, index, copiedId, onCopy }: MessageItemProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.02, 0.2) }} // Cap animation delay
      className={`flex gap-3 ${role === 'user' ? 'justify-end' : 'justify-start'}`}
    >
      {role === 'assistant' && (
        <div className="p-2 rounded-lg bg-primary/20 h-fit shrink-0">
          <Bot className="w-5 h-5 text-primary" />
        </div>
      )}

      <Card className={`max-w-[80%] p-4 relative group ${
        role === 'user' 
          ? 'bg-gradient-to-br from-primary to-primary-glow text-primary-foreground' 
          : 'glass-panel'
      }`}>
        <p className="text-sm whitespace-pre-wrap pr-8 break-words">{content}</p>
        <p className="text-xs opacity-70 mt-2">
          {new Date(created_at).toLocaleTimeString()}
        </p>
        
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                size="icon" 
                variant="ghost" 
                className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity" 
                onClick={() => onCopy(content, id)}
              >
                {copiedId === id ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>Copy</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </Card>

      {role === 'user' && (
        <div className="p-2 rounded-lg bg-primary/20 h-fit shrink-0">
          <User className="w-5 h-5 text-primary" />
        </div>
      )}
    </motion.div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison - only re-render if these specific props change
  return (
    prevProps.id === nextProps.id &&
    prevProps.content === nextProps.content &&
    prevProps.copiedId === nextProps.copiedId
  );
});

MessageItem.displayName = 'MessageItem';

export default MessageItem;
