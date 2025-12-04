import { useState, useRef, useCallback, useEffect } from 'react';

interface StreamProgress {
  percent: number;
  tokensStreamed: number;
  estimatedRemainingMs: number;
}

interface UseIncrementalStreamOptions {
  maxBufferSize?: number;
  chunkSize?: number;
  onError?: (error: Error, telemetryId: string) => void;
}

/**
 * Hook for handling streaming responses with incremental rendering
 * Uses requestAnimationFrame to prevent UI blocking on mobile
 */
export const useIncrementalStream = (options: UseIncrementalStreamOptions = {}) => {
  const { maxBufferSize = 50000, chunkSize = 200, onError } = options;

  const [content, setContent] = useState('');
  const [progress, setProgress] = useState<StreamProgress>({
    percent: 0,
    tokensStreamed: 0,
    estimatedRemainingMs: 0,
  });
  const [isStreaming, setIsStreaming] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [telemetryId, setTelemetryId] = useState('');

  const abortControllerRef = useRef<AbortController | null>(null);
  const contentBufferRef = useRef('');
  const pendingChunksRef = useRef<string[]>([]);
  const renderFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef(0);
  const tokenCountRef = useRef(0);
  const isRenderingRef = useRef(false);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (renderFrameRef.current) {
        cancelAnimationFrame(renderFrameRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Process pending chunks using requestAnimationFrame
  const processChunks = useCallback(() => {
    if (isRenderingRef.current || pendingChunksRef.current.length === 0) return;

    isRenderingRef.current = true;

    renderFrameRef.current = requestAnimationFrame(() => {
      // Process a batch of chunks
      const batch = pendingChunksRef.current.splice(0, 5).join('');
      
      if (batch) {
        contentBufferRef.current += batch;
        
        // Apply memory cap - keep last portion if too large
        if (contentBufferRef.current.length > maxBufferSize) {
          contentBufferRef.current = contentBufferRef.current.slice(-maxBufferSize);
        }

        setContent(contentBufferRef.current);

        // Update progress
        const elapsed = Date.now() - startTimeRef.current;
        const tokensPerMs = tokenCountRef.current / Math.max(elapsed, 1);
        const estimatedTotal = 500;
        const percent = Math.min(95, (tokenCountRef.current / estimatedTotal) * 100);
        const estimatedRemainingMs = Math.max(0, (estimatedTotal - tokenCountRef.current) / tokensPerMs);

        setProgress({
          percent,
          tokensStreamed: tokenCountRef.current,
          estimatedRemainingMs,
        });
      }

      isRenderingRef.current = false;

      // Continue processing if more chunks exist
      if (pendingChunksRef.current.length > 0) {
        processChunks();
      }
    });
  }, [maxBufferSize]);

  // Add chunk to pending queue
  const addChunk = useCallback((chunk: string) => {
    tokenCountRef.current++;
    
    // Split large chunks for smoother rendering
    if (chunk.length > chunkSize) {
      for (let i = 0; i < chunk.length; i += chunkSize) {
        pendingChunksRef.current.push(chunk.slice(i, i + chunkSize));
      }
    } else {
      pendingChunksRef.current.push(chunk);
    }

    processChunks();
  }, [chunkSize, processChunks]);

  const stream = useCallback(async (
    url: string,
    body: Record<string, unknown>,
    headers: Record<string, string> = {}
  ) => {
    // Cancel any existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const newTelemetryId = `stream_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    setTelemetryId(newTelemetryId);
    setIsStreaming(true);
    setHasError(false);
    setErrorMessage('');
    setContent('');
    setProgress({ percent: 0, tokensStreamed: 0, estimatedRemainingMs: 0 });

    contentBufferRef.current = '';
    pendingChunksRef.current = [];
    tokenCountRef.current = 0;
    startTimeRef.current = Date.now();

    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: JSON.stringify({ ...body, telemetry_id: newTelemetryId }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        let errorMsg = `HTTP ${response.status}`;
        try {
          const errorData = await response.json();
          errorMsg = errorData.error || errorMsg;
        } catch { }

        if (response.status === 429) {
          errorMsg = 'Rate limit exceeded. Please wait and try again.';
        } else if (response.status === 402) {
          errorMsg = 'AI credits exhausted. Please add credits to continue.';
        }

        throw new Error(errorMsg);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (let line of lines) {
          line = line.trim();
          if (!line || line.startsWith(':')) continue;
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6);
          if (jsonStr === '[DONE]') continue;

          try {
            const parsed = JSON.parse(jsonStr);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              addChunk(delta);
            }
          } catch (e) {
            // Ignore parsing errors for partial chunks
          }
        }
      }

      // Wait for all pending chunks to render
      await new Promise<void>((resolve) => {
        const checkPending = () => {
          if (pendingChunksRef.current.length === 0 && !isRenderingRef.current) {
            resolve();
          } else {
            setTimeout(checkPending, 16);
          }
        };
        checkPending();
      });

      setProgress({ percent: 100, tokensStreamed: tokenCountRef.current, estimatedRemainingMs: 0 });

      return {
        content: contentBufferRef.current,
        telemetryId: newTelemetryId,
      };

    } catch (error: any) {
      if (error.name === 'AbortError') {
        return { content: contentBufferRef.current, telemetryId: newTelemetryId, aborted: true };
      }

      setHasError(true);
      setErrorMessage(error.message || 'An unexpected error occurred');
      onError?.(error, newTelemetryId);

      return {
        content: contentBufferRef.current,
        telemetryId: newTelemetryId,
        error: error.message,
      };

    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  }, [addChunk, onError]);

  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    if (renderFrameRef.current) {
      cancelAnimationFrame(renderFrameRef.current);
    }
    setIsStreaming(false);
  }, []);

  const reset = useCallback(() => {
    cancel();
    setContent('');
    setProgress({ percent: 0, tokensStreamed: 0, estimatedRemainingMs: 0 });
    setHasError(false);
    setErrorMessage('');
    setTelemetryId('');
    contentBufferRef.current = '';
    pendingChunksRef.current = [];
  }, [cancel]);

  return {
    stream,
    cancel,
    reset,
    content,
    progress,
    isStreaming,
    hasError,
    errorMessage,
    telemetryId,
  };
};

export default useIncrementalStream;
