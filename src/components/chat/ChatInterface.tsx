import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Send, Mic, MicOff, Languages, Bot, Loader2, UserCircle,
  Zap, BookOpen, Upload, X, FileText, AlertCircle, Globe, Scan, Flame, ChevronDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { analyzeFileContent, formatAnalysisForChat, type FileAnalysis } from '@/lib/fileAnalysis';
import MessageItem from './MessageItem';
import StreamingMessage from './StreamingMessage';
import useIncrementalStream from '@/hooks/useIncrementalStream';

// Memory cap: keep only last N messages in state
const MAX_MESSAGES_IN_MEMORY = 100;

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

interface ChatInterfaceProps {
  userId: string;
  conversationId: string | null;
  onNewConversation: (id: string) => void;
}

const ChatInterface = ({ userId, conversationId, onNewConversation }: ChatInterfaceProps) => {
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [personality, setPersonality] = useState<'lawyer' | 'judge' | 'researcher' | 'student'>('lawyer');
  const [language, setLanguage] = useState<'bangla' | 'english' | 'mixed'>('english');
  const [isListening, setIsListening] = useState(false);
  const [responseMode, setResponseMode] = useState<'short' | 'deep' | 'extreme'>('deep');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [fileAnalysis, setFileAnalysis] = useState<FileAnalysis | null>(null);
  const [isOcrProcessing, setIsOcrProcessing] = useState(false);
  const [ocrResult, setOcrResult] = useState<any>(null);
  const [scrapedContent, setScrapedContent] = useState<any>(null);
  const [isScrapingUrl, setIsScrapingUrl] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(conversationId);
  const lastMessageRef = useRef<string>('');
  
  // Use the incremental streaming hook for Deep Mode stability
  const {
    stream,
    cancel: cancelStreaming,
    reset: resetStream,
    content: streamingContent,
    progress: streamProgress,
    isStreaming,
    hasError: streamHasError,
    errorMessage: streamErrorMessage,
    telemetryId,
  } = useIncrementalStream({
    maxBufferSize: responseMode === 'extreme' ? 500000 : responseMode === 'deep' ? 100000 : 20000,
    chunkSize: responseMode === 'extreme' ? 200 : 150,
    onError: (error, tid) => {
      console.error('Stream error:', { error: error.message, telemetryId: tid });
    },
  });

  useEffect(() => {
    if (conversationId) {
      setCurrentConversationId(conversationId);
      loadMessages(conversationId);
    } else {
      setMessages([]);
      setCurrentConversationId(null);
    }
  }, [conversationId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const loadPreferences = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('response_mode, personality_mode')
        .eq('id', userId)
        .single();
      
      if (data?.response_mode) {
        setResponseMode(data.response_mode as 'short' | 'deep' | 'extreme');
      }
    };
    loadPreferences();
  }, [userId]);

  const loadMessages = async (convId: string) => {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: true });

    if (data) {
      setMessages(data.map(msg => ({
        id: msg.id,
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
        created_at: msg.created_at,
      })));
    }
  };

  const createConversation = async () => {
    const { data } = await supabase
      .from('conversations')
      .insert({
        user_id: userId,
        title: input.slice(0, 50) || 'New Conversation',
        personality_mode: personality,
        language: language,
      })
      .select()
      .single();

    if (data) {
      setCurrentConversationId(data.id);
      onNewConversation(data.id);
      return data.id;
    }
    return null;
  };

  const saveMessage = async (convId: string, role: 'user' | 'assistant', content: string) => {
    const { data } = await supabase
      .from('messages')
      .insert({ conversation_id: convId, role, content })
      .select()
      .single();
    return data;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 20 * 1024 * 1024) {
      toast({ title: "File too large", description: "Maximum file size is 20MB.", variant: "destructive" });
      return;
    }
    
    setUploadedFile(file);
    setFileAnalysis(null);
    setOcrResult(null);
    
    // Create preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => setFilePreview(e.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setFilePreview(null);
    }
    
    // Auto-analyze the file immediately
    try {
      let extractedText = '';
      if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
        extractedText = await file.text();
      }
      
      const analysis = await analyzeFileContent(file, extractedText);
      setFileAnalysis(analysis);
      
      // For images and PDFs, trigger advanced OCR automatically
      if (file.type.startsWith('image/') || file.type === 'application/pdf') {
        await runAdvancedOcr(file);
      }
      
      toast({ 
        title: "File Analyzed", 
        description: `${file.name} - ${analysis.language_detected.join('/')} detected. ${analysis.entities?.length || 0} entities found.` 
      });
    } catch (err) {
      toast({ title: "File attached", description: `${file.name} ready for analysis.` });
    }
  };

  // Advanced OCR using Gemini Vision
  const runAdvancedOcr = async (file: File) => {
    setIsOcrProcessing(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('filename', file.name);
      formData.append('mimeType', file.type);

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-document-ocr`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('OCR analysis failed');
      }

      const result = await response.json();
      
      if (result.success) {
        setOcrResult(result);
        toast({
          title: "OCR Complete",
          description: `Document type: ${result.documentType}. ${result.entities?.length || 0} entities extracted.`,
        });
      }
    } catch (err) {
      console.error('OCR error:', err);
      toast({
        title: "OCR Notice",
        description: "Advanced OCR will be done when you send the message.",
      });
    } finally {
      setIsOcrProcessing(false);
    }
  };

  // Web scraping function
  const scrapeWebsite = async (url: string) => {
    setIsScrapingUrl(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/scrape-website`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        throw new Error('Failed to scrape website');
      }

      const result = await response.json();
      
      if (result.success) {
        setScrapedContent(result);
        toast({
          title: "Website Scraped",
          description: `Loaded: ${result.title} (${result.content?.length || 0} chars)`,
        });
        return result;
      } else {
        throw new Error(result.error || 'Scraping failed');
      }
    } catch (err: any) {
      console.error('Scraping error:', err);
      toast({
        title: "Scraping Failed",
        description: err.message || "Could not fetch website content.",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsScrapingUrl(false);
    }
  };

  // Detect URLs in input
  const detectUrl = (text: string): string | null => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const match = text.match(urlRegex);
    return match ? match[0] : null;
  };

  const uploadFileToStorage = async (file: File) => {
    const fileName = `${Date.now()}-${file.name}`;
    const filePath = `${userId}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('user-documents')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    await supabase.from('documents').insert({
      user_id: userId,
      filename: file.name,
      file_type: file.type || 'application/octet-stream',
      file_size: file.size,
      storage_path: filePath,
    });

    return filePath;
  };

  const extractFileContent = async (file: File): Promise<string> => {
    // Use OCR result if available (most accurate)
    if (ocrResult && ocrResult.success) {
      return `📄 **File**: ${file.name}
**Document Type**: ${ocrResult.documentType}
**Language**: ${ocrResult.language}
**Size**: ${(file.size / 1024).toFixed(2)} KB

---OCR EXTRACTED TEXT---
${ocrResult.extractedText}

---KEY ENTITIES DETECTED---
${ocrResult.entities?.map((e: any) => `• ${e.type}: ${e.value}`).join('\n') || 'None detected'}

---DOCUMENT SUMMARY---
${ocrResult.summary}

[Telemetry ID: ${ocrResult.telemetryId}]`;
    }
    
    // Use file analysis if available
    if (fileAnalysis) {
      return formatAnalysisForChat(fileAnalysis);
    }
    
    // For text files, extract content
    if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
      const text = await file.text();
      return `📄 **File**: ${file.name}\n**Size**: ${(file.size / 1024).toFixed(2)} KB\n\n**Content**:\n${text}`;
    }
    
    // For PDFs and other documents, provide file info with analysis prompt
    const fileInfo = `📄 **File**: ${file.name}\n**Type**: ${file.type}\n**Size**: ${(file.size / 1024).toFixed(2)} KB`;
    
    if (file.type === 'application/pdf') {
      return `${fileInfo}\n\n[PDF document uploaded for analysis. Please analyze this legal document, identify key sections, parties involved, and provide insights.]`;
    }
    
    if (file.type.startsWith('image/')) {
      return `${fileInfo}\n\n[Image uploaded for analysis. Please extract any visible text (OCR), identify document type, and provide relevant legal insights.]`;
    }
    
    return `${fileInfo}\n\n[Document uploaded for analysis. Please extract and analyze the content.]`;
  };

  const handleSend = async () => {
    if (!input.trim() && !uploadedFile) return;
    if (isLoading || isStreaming) return;

    let userMessage = input.trim();
    lastMessageRef.current = userMessage; // Store for retry
    setInput('');
    setIsLoading(true);

    try {
      let fileContext = '';
      let webContext = '';
      
      // Check for URL in message and scrape if found
      const detectedUrl = detectUrl(userMessage);
      if (detectedUrl && !scrapedContent) {
        const scraped = await scrapeWebsite(detectedUrl);
        if (scraped && scraped.success) {
          webContext = `
---WEB CONTENT FROM: ${scraped.url}---
**Title**: ${scraped.title}
**Description**: ${scraped.description}

**Headings**:
${scraped.headings?.slice(0, 15).join('\n') || 'None'}

**Content**:
${scraped.content?.substring(0, 15000) || 'No content extracted'}

---END OF WEB CONTENT---

`;
        }
      } else if (scrapedContent && scrapedContent.success) {
        webContext = `
---WEB CONTENT FROM: ${scrapedContent.url}---
**Title**: ${scrapedContent.title}
**Description**: ${scrapedContent.description}

**Content**:
${scrapedContent.content?.substring(0, 15000) || 'No content extracted'}

---END OF WEB CONTENT---

`;
      }
      
      if (uploadedFile) {
        setIsUploading(true);
        try {
          await uploadFileToStorage(uploadedFile);
          fileContext = await extractFileContent(uploadedFile);
          toast({ title: "File uploaded", description: "File saved and ready for analysis." });
        } catch (err) {
          toast({ title: "Upload failed", description: "Could not upload file.", variant: "destructive" });
        }
        setUploadedFile(null);
        setFilePreview(null);
        setFileAnalysis(null);
        setOcrResult(null);
        setIsUploading(false);
      }
      
      // Clear scraped content after use
      setScrapedContent(null);

      const contextParts = [webContext, fileContext].filter(Boolean).join('\n');
      const fullMessage = contextParts 
        ? `${contextParts}\n\nUser Query: ${userMessage || 'Please analyze this content.'}`
        : userMessage;

      let convId = currentConversationId;
      if (!convId) {
        convId = await createConversation();
        if (!convId) throw new Error('Failed to create conversation');
      }

      const userMsg = await saveMessage(convId, 'user', userMessage || 'Analyze attached file');
      if (userMsg) {
        setMessages(prev => [...prev, { id: userMsg.id, role: 'user', content: userMsg.content, created_at: userMsg.created_at }]);
      }

      const responseModeInstruction = responseMode === 'short' 
        ? 'RESPONSE MODE: SHORT - Give a brief, direct answer in 1-7 lines. No lengthy explanations.'
        : 'RESPONSE MODE: DEEP - Provide a detailed, comprehensive answer with analysis, examples, and relevant laws.';

      setIsLoading(false);

      // Use the incremental streaming hook
      const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/legal-chat`;
      const result = await stream(
        CHAT_URL,
        {
          messages: [...messages, { role: 'user', content: `${responseModeInstruction}\n\n${fullMessage}` }],
          personality,
          language,
          responseMode,
          userId,
        },
        {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        }
      );

      // Only save if we have content and it wasn't aborted with error
      if (result.content && !result.error) {
        const assistantMsg = await saveMessage(convId, 'assistant', result.content);
        if (assistantMsg) {
          setMessages(prev => [...prev, { 
            id: assistantMsg.id, 
            role: 'assistant', 
            content: assistantMsg.content, 
            created_at: assistantMsg.created_at 
          }]);
        }
        resetStream();
      } else if (result.error) {
        toast({ title: "Error", description: result.error, variant: "destructive" });
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to send message.", variant: "destructive" });
      resetStream();
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    toast({ title: "Copied", description: "Text copied to clipboard." });
  };

  const handleResponseModeChange = async (newMode: 'short' | 'deep' | 'extreme') => {
    setResponseMode(newMode);
    await supabase.from('profiles').update({ response_mode: newMode }).eq('id', userId);
    const modeDescriptions = {
      short: { title: "Short Answer Mode", description: "Responses will be brief (1-7 lines)." },
      deep: { title: "Deep Answer Mode", description: "Responses will be detailed and comprehensive." },
      extreme: { title: "Extreme Deep Mode Activated", description: "Responses will be 3,500-4,500 words with 12 structured sections." },
    };
    toast(modeDescriptions[newMode]);
  };

  const clearFile = () => {
    setUploadedFile(null);
    setFilePreview(null);
    setFileAnalysis(null);
    setOcrResult(null);
    setScrapedContent(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const personalityIcons = { lawyer: '⚖️', judge: '👨‍⚖️', researcher: '🔍', student: '📚' };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
        <AnimatePresence>
          {messages.length === 0 ? (
            <motion.div className="h-full flex flex-col items-center justify-center text-center space-y-6 px-4 pt-12" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className="p-6 rounded-2xl bg-gradient-to-br from-primary/20 to-primary-glow/20 backdrop-blur-sm animate-glow">
                <Bot className="w-16 h-16 text-primary" />
              </div>
              <h3 className="text-2xl font-bold">Welcome to JurisMind</h3>
              <p className="text-muted-foreground max-w-md">Ask me anything about law, upload documents for analysis, or search case laws. I speak both English and বাংলা fluently.</p>
              
              <div className="flex flex-wrap gap-2 justify-center max-w-2xl">
                {["What is the Limitation Act 1908?", "তালাকের নিয়ম কি?", "How to file an FIR?", "Explain Section 420 Penal Code", "Land registration process", "চুক্তির আবশ্যক উপাদান"].map((suggestion) => (
                  <Button key={suggestion} variant="outline" size="sm" className="text-xs hover:bg-primary/10 hover:border-primary" onClick={() => setInput(suggestion)}>
                    {suggestion}
                  </Button>
                ))}
              </div>

              <div className="flex flex-wrap gap-2 justify-center pt-4">
                <Badge variant="secondary">Document Analysis</Badge>
                <Badge variant="secondary">Case Law Search</Badge>
                <Badge variant="secondary">Legal Drafting</Badge>
              </div>
            </motion.div>
          ) : (
            <div className="space-y-4 pb-4">
              {/* Render only last N messages for memory efficiency */}
              {messages.slice(-MAX_MESSAGES_IN_MEMORY).map((message, index) => (
                <MessageItem
                  key={message.id}
                  id={message.id}
                  role={message.role}
                  content={message.content}
                  created_at={message.created_at}
                  index={index}
                  copiedId={copiedId}
                  onCopy={handleCopy}
                />
              ))}

              {/* Streaming message with Deep Mode fallback UI */}
              {(isStreaming || streamHasError) && (
                <StreamingMessage
                  content={streamingContent}
                  progress={streamProgress}
                  isDeepMode={responseMode === 'deep' || responseMode === 'extreme'}
                  isExtremeMode={responseMode === 'extreme'}
                  hasError={streamHasError}
                  errorMessage={streamErrorMessage}
                  telemetryId={telemetryId}
                  onCancel={cancelStreaming}
                  onRetry={() => {
                    resetStream();
                    // Re-send the last message
                    if (lastMessageRef.current) {
                      setInput(lastMessageRef.current);
                    }
                  }}
                  onSwitchToShort={() => {
                    setResponseMode('short');
                    resetStream();
                    toast({
                      title: "Switched to Short Mode",
                      description: "Try sending your message again.",
                    });
                  }}
                />
              )}

              {isLoading && !isStreaming && (
                <motion.div className="flex gap-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <div className="p-2 rounded-lg bg-primary/20 h-fit"><Bot className="w-5 h-5 text-primary" /></div>
                  <Card className="glass-panel p-4">
                    <div className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /><p className="text-sm">Thinking...</p></div>
                  </Card>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </AnimatePresence>
      </ScrollArea>

      <div className="p-4 border-t border-border glass-panel">
        {/* File Preview with Analysis */}
        {/* URL Scraping Indicator */}
        {isScrapingUrl && (
          <div className="mb-3 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-500/20 rounded flex items-center justify-center">
                <Globe className="h-5 w-5 text-blue-500 animate-pulse" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-400">Scraping Website...</p>
                <p className="text-xs text-muted-foreground">Fetching and analyzing content</p>
              </div>
              <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
            </div>
          </div>
        )}

        {/* Scraped Content Preview */}
        {scrapedContent && scrapedContent.success && (
          <div className="mb-3 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-500/20 rounded flex items-center justify-center">
                <Globe className="h-5 w-5 text-green-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{scrapedContent.title}</p>
                <p className="text-xs text-muted-foreground truncate">{scrapedContent.url}</p>
              </div>
              <Badge variant="secondary" className="text-xs">
                {(scrapedContent.content?.length / 1000).toFixed(1)}K chars
              </Badge>
              <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={() => setScrapedContent(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {uploadedFile && (
          <div className="mb-3 p-3 bg-secondary/50 rounded-lg">
            <div className="flex items-center gap-3">
              {filePreview ? (
                <img src={filePreview} alt="Preview" className="w-12 h-12 object-cover rounded" />
              ) : (
                <div className="w-12 h-12 bg-primary/20 rounded flex items-center justify-center">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{uploadedFile.name}</p>
                <p className="text-xs text-muted-foreground">{(uploadedFile.size / 1024).toFixed(1)} KB</p>
              </div>
              <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={clearFile}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            {/* File Analysis & OCR Results */}
            <div className="mt-2 pt-2 border-t border-border/50">
              <div className="flex flex-wrap gap-1 text-xs">
                {fileAnalysis && (
                  <>
                    <Badge variant="outline" className="text-xs">
                      {fileAnalysis.language_detected.join('/')}
                    </Badge>
                    {fileAnalysis.entities && fileAnalysis.entities.length > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {fileAnalysis.entities.length} entities
                      </Badge>
                    )}
                  </>
                )}
                
                {isOcrProcessing && (
                  <Badge variant="outline" className="text-xs text-blue-400 border-blue-400/50">
                    <Scan className="w-3 h-3 mr-1 animate-pulse" />
                    OCR Processing...
                  </Badge>
                )}
                
                {ocrResult && ocrResult.success && (
                  <>
                    <Badge variant="outline" className="text-xs text-green-400 border-green-400/50">
                      <Scan className="w-3 h-3 mr-1" />
                      OCR Complete
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      {ocrResult.documentType}
                    </Badge>
                    {ocrResult.entities?.length > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {ocrResult.entities.length} extracted
                      </Badge>
                    )}
                  </>
                )}
                
                {!ocrResult && fileAnalysis?.checks.includes('ocr_may_be_required') && !isOcrProcessing && (
                  <Badge variant="outline" className="text-xs text-amber-500 border-amber-500/50">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    OCR pending
                  </Badge>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Selectors */}
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <Select value={personality} onValueChange={(v: any) => setPersonality(v)}>
            <SelectTrigger className="w-auto min-w-[130px] h-8 text-xs">
              <UserCircle className="mr-1 h-3 w-3" /><SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="lawyer">{personalityIcons.lawyer} Lawyer</SelectItem>
              <SelectItem value="judge">{personalityIcons.judge} Judge</SelectItem>
              <SelectItem value="researcher">{personalityIcons.researcher} Researcher</SelectItem>
              <SelectItem value="student">{personalityIcons.student} Student</SelectItem>
            </SelectContent>
          </Select>

          <Select value={language} onValueChange={(v: any) => setLanguage(v)}>
            <SelectTrigger className="w-auto min-w-[110px] h-8 text-xs">
              <Languages className="mr-1 h-3 w-3" /><SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="english">🇬🇧 English</SelectItem>
              <SelectItem value="bangla">🇧🇩 বাংলা</SelectItem>
              <SelectItem value="mixed">🌐 Mixed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Input Area */}
        <div className="flex gap-2">
          <div className="flex flex-col gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon" onClick={() => fileInputRef.current?.click()} disabled={isUploading || isOcrProcessing}>
                    {isUploading || isOcrProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Upload File (PDF, Image, Doc)</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload} accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.xlsx,.xls,.zip,.webp,.bmp,.tiff,.gif" />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="outline" 
                  size="icon" 
                  className={`transition-all relative ${
                    responseMode === 'extreme' 
                      ? 'bg-orange-500/20 border-orange-500 shadow-lg shadow-orange-500/30' 
                      : responseMode === 'deep' 
                        ? 'bg-primary/20 border-primary shadow-lg shadow-primary/20' 
                        : 'opacity-60'
                  }`}
                >
                  {responseMode === 'short' && <Zap className="h-4 w-4" />}
                  {responseMode === 'deep' && <BookOpen className="h-4 w-4" />}
                  {responseMode === 'extreme' && <Flame className="h-4 w-4 text-orange-500" />}
                  <ChevronDown className="h-2.5 w-2.5 absolute -bottom-0.5 -right-0.5 opacity-70" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                <DropdownMenuItem 
                  onClick={() => handleResponseModeChange('short')}
                  className={`gap-3 ${responseMode === 'short' ? 'bg-primary/10' : ''}`}
                >
                  <Zap className="h-4 w-4" />
                  <div className="flex flex-col">
                    <span className="font-medium">Short Mode</span>
                    <span className="text-xs text-muted-foreground">Brief answers (1-7 lines)</span>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => handleResponseModeChange('deep')}
                  className={`gap-3 ${responseMode === 'deep' ? 'bg-primary/10' : ''}`}
                >
                  <BookOpen className="h-4 w-4" />
                  <div className="flex flex-col">
                    <span className="font-medium">Deep Mode</span>
                    <span className="text-xs text-muted-foreground">Detailed & comprehensive</span>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => handleResponseModeChange('extreme')}
                  className={`gap-3 ${responseMode === 'extreme' ? 'bg-orange-500/10' : ''}`}
                >
                  <Flame className="h-4 w-4 text-orange-500" />
                  <div className="flex flex-col">
                    <span className="font-medium text-orange-500">Extreme Deep Mode</span>
                    <span className="text-xs text-muted-foreground">3,500-4,500 words, 12 sections</span>
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <Textarea 
            placeholder="Type your question or paste a URL to analyze..." 
            value={input} 
            onChange={(e) => setInput(e.target.value)} 
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }}} 
            className="min-h-[60px] max-h-[120px] resize-none" 
            disabled={isLoading || isScrapingUrl} 
          />

          <div className="flex flex-col gap-2">
            <Button variant="outline" size="icon" onClick={() => toast({ title: "Voice input", description: "Coming soon!" })} className={isListening ? 'bg-primary text-primary-foreground' : ''}>
              {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </Button>
            <Button size="icon" onClick={handleSend} disabled={(!input.trim() && !uploadedFile) || isLoading || isScrapingUrl} className="glow-button bg-gradient-to-r from-primary to-primary-glow">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
