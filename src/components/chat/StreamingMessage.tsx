import { memo } from 'react';
import { motion } from 'framer-motion';
import { Bot, X, AlertTriangle, RefreshCw, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
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
        className="flex gap-3" 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }}
      >
        <div className="p-2 rounded-lg bg-destructive/20 h-fit">
          <AlertTriangle className="w-5 h-5 text-destructive" />
        </div>
        <Card className="glass-panel p-4 max-w-[85%] border-destructive/30">
          <div className="space-y-3">
            <p className="text-sm text-destructive font-medium">
              {errorMessage || 'Deep Mode encountered an issue'}
            </p>
            
            {content && (
              <div className="pt-2 border-t border-border">
                <p className="text-xs text-muted-foreground mb-1">Partial response:</p>
                <p className="text-sm whitespace-pre-wrap break-words">{content}</p>
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
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div 
      className="flex gap-3" 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }}
    >
      <div className="p-2 rounded-lg bg-primary/20 h-fit">
        <Bot className="w-5 h-5 text-primary" />
      </div>
      <Card className="glass-panel p-4 relative max-w-[85%]">
        {/* Content area with word-break for long responses */}
        <div className="text-sm whitespace-pre-wrap break-words leading-relaxed max-h-[60vh] overflow-y-auto">
          {content || (
            <span className="text-muted-foreground animate-pulse">
              {isDeepMode ? 'Generating detailed response...' : 'Thinking...'}
            </span>
          )}
        </div>

        {/* Progress section */}
        <div className="mt-3 pt-2 border-t border-border/50 space-y-2">
          <div className="flex items-center gap-2">
            <Progress value={progress.percent} className="h-1.5 flex-1" />
            <span className="text-xs text-muted-foreground min-w-[40px] text-right">
              {Math.round(progress.percent)}%
            </span>
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground">
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
      </Card>
    </motion.div>
  );
});

StreamingMessage.displayName = 'StreamingMessage';

export default StreamingMessage;
