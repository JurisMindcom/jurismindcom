import { memo } from 'react';
import { motion } from 'framer-motion';
import { Bot, User, Copy, Check, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import ImageProcessingPlaceholder from './ImageProcessingPlaceholder';

interface MessageItemProps {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
  index: number;
  copiedId: string | null;
  onCopy: (text: string, id: string) => void;
  imageUrl?: string;
  pending?: boolean;
  pendingMode?: 'generate' | 'analyze' | 'edit';
  pendingAspectRatio?: string;
  pendingOriginalImage?: string;
}

type ParsedImage = {
  url: string;
  alt?: string;
  rest: string;
} | null;

const parseFirstMarkdownImage = (content: string): ParsedImage => {
  // Matches: ![alt](url)
  const match = content.match(/!\[([^\]]*)\]\(([^\)]+)\)/);
  if (!match) return null;
  const alt = match[1] || undefined;
  const url = match[2];
  const rest = content.replace(match[0], '').trim();
  return { url, alt, rest };
};

// Memoized message component to prevent unnecessary re-renders
const MessageItem = memo(({ id, role, content, created_at, index, copiedId, onCopy, imageUrl, pending, pendingMode, pendingAspectRatio, pendingOriginalImage }: MessageItemProps) => {
  const parsed = role === 'assistant' ? parseFirstMarkdownImage(content) : null;
  const resolvedImageUrl = imageUrl || parsed?.url;
  const resolvedText = parsed ? parsed.rest : content;

  if (role === 'assistant') {
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
            {pending && pendingMode ? (
              <ImageProcessingPlaceholder 
                mode={pendingMode}
                aspectRatio={pendingAspectRatio}
                originalImage={pendingOriginalImage}
              />
            ) : pending ? (
              <ImageProcessingPlaceholder mode="analyze" />
            ) : (
              <>
                {resolvedImageUrl && (
                  <div className="mt-1 w-full max-w-[720px]">
                    <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
                      <img
                        src={resolvedImageUrl}
                        alt={parsed?.alt || 'Generated image'}
                        loading="eager"
                        className="w-full h-auto block"
                      />
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <Button asChild size="sm" variant="secondary">
                        <a href={resolvedImageUrl} download={`jurismind-image-${id}.png`}>
                          <Download className="h-4 w-4 mr-1" />
                          Download
                        </a>
                      </Button>
                    </div>
                  </div>
                )}

                {resolvedText && (
                  <div className="prose prose-sm dark:prose-invert max-w-none mt-3">
                    <p className="text-foreground whitespace-pre-wrap break-words leading-relaxed m-0">
                      {resolvedText}
                    </p>
                  </div>
                )}
              </>
            )}

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

  // User message: Right-aligned bubble style with copy button and optional image
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.02, 0.2) }}
      className="flex justify-end gap-3 group"
    >
      <div className="max-w-[80%]">
        {/* Show uploaded image immediately if present */}
        {imageUrl && (
          <div className="mb-2 rounded-xl border border-border bg-card overflow-hidden shadow-sm max-w-[280px] ml-auto">
            <img
              src={imageUrl}
              alt="Uploaded image"
              loading="eager"
              className="w-full h-auto block"
            />
          </div>
        )}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-primary to-primary-glow text-primary-foreground">
          <p className="text-sm whitespace-pre-wrap break-words">{content}</p>
        </div>
        <div className="flex items-center justify-end gap-3 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
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

      <div className="p-2 rounded-full bg-primary/20 h-fit shrink-0">
        <User className="w-5 h-5 text-primary" />
      </div>
    </motion.div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.id === nextProps.id &&
    prevProps.content === nextProps.content &&
    prevProps.copiedId === nextProps.copiedId &&
    prevProps.imageUrl === nextProps.imageUrl &&
    prevProps.pending === nextProps.pending &&
    prevProps.pendingMode === nextProps.pendingMode &&
    prevProps.pendingAspectRatio === nextProps.pendingAspectRatio &&
    prevProps.pendingOriginalImage === nextProps.pendingOriginalImage
  );
});

MessageItem.displayName = 'MessageItem';

export default MessageItem;

