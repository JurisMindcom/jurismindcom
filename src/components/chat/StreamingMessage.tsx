import { memo } from 'react';
import { motion } from 'framer-motion';
import { Bot, X, AlertTriangle, RefreshCw, Zap, Flame } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

interface StreamProgress {
  percent: number;
  tokensStreamed: number;
  estimatedRemainingMs: number;
}

interface StreamingMessageProps {
  content: string;
  progress: StreamProgress;
  isDeepMode: boolean;
  isExtremeMode?: boolean;
  hasError: boolean;
  errorMessage?: string;
  telemetryId?: string;
  onCancel: () => void;
  onRetry?: () => void;
  onSwitchToShort?: () => void;
}

const StreamingMessage = memo(({
  content,
  progress,
  isDeepMode,
  isExtremeMode,
  hasError,
  errorMessage,
  telemetryId,
  onCancel,
  onRetry,
  onSwitchToShort,
}: StreamingMessageProps) => {
  const formatTime = (ms: number) => {
    if (ms < 1000) return '<1s';
    return `~${Math.ceil(ms / 1000)}s`;
  };

  // Error/Fallback state
  if (hasError) {
    return (
      <motion.div 
        className="w-full" 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }}
      >
        <div className="flex items-start gap-3 w-full">
          <div className="p-2 rounded-full bg-destructive/20 shrink-0 mt-1">
            <AlertTriangle className="w-5 h-5 text-destructive" />
          </div>
          
          <div className="flex-1 min-w-0 space-y-3">
            <p className="text-sm text-destructive font-medium">
              {errorMessage || 'Deep Mode encountered an issue'}
            </p>
            
            {content && (
              <div className="pt-2 border-t border-border/50">
                <p className="text-xs text-muted-foreground mb-1">Partial response:</p>
                <p className="text-foreground whitespace-pre-wrap break-words leading-relaxed">{content}</p>
              </div>
            )}

            {telemetryId && (
              <p className="text-xs text-muted-foreground font-mono">
                ID: {telemetryId}
              </p>
            )}

            <div className="flex flex-wrap gap-2 pt-2">
              {onRetry && (
                <Button size="sm" variant="outline" onClick={onRetry}>
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Retry
                </Button>
              )}
              {onSwitchToShort && isDeepMode && (
                <Button size="sm" variant="secondary" onClick={onSwitchToShort}>
                  <Zap className="h-3 w-3 mr-1" />
                  Try Short Mode
                </Button>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  // ChatGPT-style: Full width streaming response
  return (
    <motion.div 
      className="w-full group" 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }}
    >
      <div className="flex items-start gap-3 w-full">
        <div className={`p-2 rounded-full shrink-0 mt-1 ${isExtremeMode ? 'bg-orange-500/20' : 'bg-primary/20'}`}>
          {isExtremeMode ? (
            <Flame className="w-5 h-5 text-orange-500" />
          ) : (
            <Bot className="w-5 h-5 text-primary" />
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          {/* Content area - ChatGPT style */}
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <p className="text-foreground whitespace-pre-wrap break-words leading-relaxed m-0">
              {content || (
                <span className="text-muted-foreground animate-pulse">
                  {isExtremeMode 
                    ? 'Generating extreme detailed response (3,500-4,500 words)...' 
                    : isDeepMode 
                      ? 'Generating detailed response...' 
                      : 'Thinking...'}
                </span>
              )}
            </p>
          </div>

          {/* Progress section - minimal style */}
          <div className="mt-3 pt-2 space-y-2">
            <div className="flex items-center gap-2">
              <Progress value={progress.percent} className="h-1 flex-1 max-w-[200px]" />
              <span className="text-xs text-muted-foreground">
                {Math.round(progress.percent)}%
              </span>
            </div>

            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span>
                {progress.tokensStreamed} tokens
                {progress.estimatedRemainingMs > 0 && (
                  <> • {formatTime(progress.estimatedRemainingMs)} remaining</>
                )}
              </span>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 px-2 text-xs"
                onClick={onCancel}
              >
                <X className="h-3 w-3 mr-1" />
                Cancel
              </Button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
});

StreamingMessage.displayName = 'StreamingMessage';

export default StreamingMessage;
