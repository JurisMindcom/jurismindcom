import { memo } from 'react';
import { motion } from 'framer-motion';
import { Bot, User, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
  if (role === 'assistant') {
    // ChatGPT-style: Full width, no box, clean paragraph
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: Math.min(index * 0.02, 0.2) }}
        className="w-full group"
      >
        <div className="flex items-start gap-3 w-full">
          <div className="p-2 rounded-full bg-primary/20 shrink-0 mt-1">
            <Bot className="w-5 h-5 text-primary" />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <p className="text-foreground whitespace-pre-wrap break-words leading-relaxed m-0">
                {content}
              </p>
            </div>
            
            <div className="flex items-center gap-3 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="text-xs text-muted-foreground">
                {new Date(created_at).toLocaleTimeString()}
              </span>
              
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      className="h-7 w-7"
                      onClick={() => onCopy(content, id)}
                    >
                      {copiedId === id ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Copy</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  // User message: Right-aligned bubble style
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.02, 0.2) }}
      className="flex justify-end gap-3"
    >
      <div className="max-w-[80%] p-4 rounded-2xl bg-gradient-to-br from-primary to-primary-glow text-primary-foreground">
        <p className="text-sm whitespace-pre-wrap break-words">{content}</p>
        <p className="text-xs opacity-70 mt-2">
          {new Date(created_at).toLocaleTimeString()}
        </p>
      </div>
      
      <div className="p-2 rounded-full bg-primary/20 h-fit shrink-0">
        <User className="w-5 h-5 text-primary" />
      </div>
    </motion.div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.id === nextProps.id &&
    prevProps.content === nextProps.content &&
    prevProps.copiedId === nextProps.copiedId
  );
});

MessageItem.displayName = 'MessageItem';

export default MessageItem;
