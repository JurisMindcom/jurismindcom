import { useState, useRef, useCallback } from 'react';

interface StreamProgress {
  percent: number;
  tokensStreamed: number;
  estimatedRemainingMs: number;
}

interface StreamResult {
  content: string;
  telemetryId: string;
  sourceReferences?: SourceReference[];
}

interface SourceReference {
  type: 'file' | 'memory' | 'web' | 'law';
  id: string;
  page?: number;
  location?: [number, number];
  title?: string;
}

interface UseStreamingChatOptions {
  onProgress?: (progress: StreamProgress) => void;
  onDelta?: (delta: string) => void;
  onComplete?: (result: StreamResult) => void;
  onError?: (error: Error, telemetryId: string) => void;
  maxBufferSize?: number;
}

export const useStreamingChat = (options: UseStreamingChatOptions = {}) => {
  const [isStreaming, setIsStreaming] = useState(false);
  const [content, setContent] = useState('');
  const [progress, setProgress] = useState<StreamProgress>({ percent: 0, tokensStreamed: 0, estimatedRemainingMs: 0 });
  const [telemetryId, setTelemetryId] = useState('');
  
  const abortControllerRef = useRef<AbortController | null>(null);
  const startTimeRef = useRef<number>(0);
  const bufferRef = useRef<string[]>([]);
  
  const generateTelemetryId = () => `chat_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  const stream = useCallback(async (
    url: string,
    body: Record<string, unknown>,
    headers: Record<string, string> = {}
  ): Promise<StreamResult> => {
    const newTelemetryId = generateTelemetryId();
    setTelemetryId(newTelemetryId);
    setIsStreaming(true);
    setContent('');
    setProgress({ percent: 0, tokensStreamed: 0, estimatedRemainingMs: 0 });
    startTimeRef.current = Date.now();
    bufferRef.current = [];

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
        const errorData = await response.json().catch(() => ({}));
        const error = new Error(errorData.error || `HTTP ${response.status}`);
        options.onError?.(error, newTelemetryId);
        throw error;
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let buffer = '';
      let accumulatedContent = '';
      let tokenCount = 0;
      const maxBuffer = options.maxBufferSize || 2000;

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
              accumulatedContent += delta;
              tokenCount++;
              
              // Apply backpressure if buffer exceeds limit
              if (accumulatedContent.length > maxBuffer) {
                bufferRef.current.push(accumulatedContent);
                accumulatedContent = accumulatedContent.slice(-1000);
              }

              setContent(accumulatedContent);
              options.onDelta?.(delta);

              // Update progress
              const elapsed = Date.now() - startTimeRef.current;
              const tokensPerMs = tokenCount / elapsed;
              const estimatedTotal = 500; // Configurable estimate
              const percent = Math.min(95, (tokenCount / estimatedTotal) * 100);
              const estimatedRemainingMs = Math.max(0, ((estimatedTotal - tokenCount) / tokensPerMs));
              
              const newProgress = { percent, tokensStreamed: tokenCount, estimatedRemainingMs };
              setProgress(newProgress);
              options.onProgress?.(newProgress);

              // Yield to UI every 20 tokens
              if (tokenCount % 20 === 0) {
                await new Promise(resolve => setTimeout(resolve, 0));
              }
            }
          } catch (e) {
            console.warn('Failed to parse SSE chunk:', e);
          }
        }
      }

      setProgress({ percent: 100, tokensStreamed: tokenCount, estimatedRemainingMs: 0 });
      
      const result: StreamResult = {
        content: accumulatedContent,
        telemetryId: newTelemetryId,
      };
      
      options.onComplete?.(result);
      return result;

    } catch (error: any) {
      if (error.name === 'AbortError') {
        return { content, telemetryId: newTelemetryId };
      }
      options.onError?.(error, newTelemetryId);
      throw error;
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  }, [options, content]);

  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsStreaming(false);
    }
  }, []);

  const reset = useCallback(() => {
    setContent('');
    setProgress({ percent: 0, tokensStreamed: 0, estimatedRemainingMs: 0 });
    setTelemetryId('');
  }, []);

  return {
    stream,
    cancel,
    reset,
    isStreaming,
    content,
    progress,
    telemetryId,
  };
};

export default useStreamingChat;
