import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Send, Mic, MicOff, Languages, Bot, Loader2, User, UserCircle,
  Copy, Check, Zap, BookOpen, Upload, X, FileText
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
  const [responseMode, setResponseMode] = useState<'short' | 'deep'>('deep');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(conversationId);
  const [streamingContent, setStreamingContent] = useState<string>('');
  const [streamProgress, setStreamProgress] = useState(0);
  const [isStreaming, setIsStreaming] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

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
        setResponseMode(data.response_mode as 'short' | 'deep');
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
    
    // Create preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => setFilePreview(e.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setFilePreview(null);
    }
    
    toast({ title: "File attached", description: `${file.name} ready for analysis.` });
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
    // For text files, extract content
    if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
      return await file.text();
    }
    
    // For PDFs and other documents, provide file info
    const fileInfo = `File: ${file.name}\nType: ${file.type}\nSize: ${(file.size / 1024).toFixed(2)} KB`;
    
    if (file.type === 'application/pdf') {
      return `${fileInfo}\n\n[PDF document uploaded for analysis. Please analyze this legal document and provide insights.]`;
    }
    
    if (file.type.startsWith('image/')) {
      return `${fileInfo}\n\n[Image uploaded. Please describe what you can help with regarding this image.]`;
    }
    
    return `${fileInfo}\n\n[Document uploaded for analysis.]`;
  };

  const handleSend = async () => {
    if (!input.trim() && !uploadedFile) return;
    if (isLoading || isStreaming) return;

    let userMessage = input.trim();
    setInput('');
    setIsLoading(true);
    setStreamingContent('');
    setStreamProgress(0);

    try {
      let fileContext = '';
      
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
        setIsUploading(false);
      }

      const fullMessage = fileContext 
        ? `${fileContext}\n\nUser Query: ${userMessage || 'Please analyze this file.'}`
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

      // Use streaming for responses
      setIsStreaming(true);
      setIsLoading(false);
      abortControllerRef.current = new AbortController();

      const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/legal-chat`;
      const response = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: [...messages, { role: 'user', content: `${responseModeInstruction}\n\n${fullMessage}` }],
          personality,
          language,
          responseMode,
          userId,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('Rate limit exceeded. Please try again later.');
        }
        if (response.status === 402) {
          throw new Error('AI credits exhausted. Please contact support.');
        }
        throw new Error('Failed to get response');
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let buffer = '';
      let accumulatedContent = '';
      let tokenCount = 0;
      const startTime = Date.now();

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
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              accumulatedContent += content;
              tokenCount++;
              setStreamingContent(accumulatedContent);
              
              // Update progress (estimate)
              const elapsed = Date.now() - startTime;
              const tokensPerMs = tokenCount / elapsed;
              const estimatedTotal = responseMode === 'deep' ? 500 : 100;
              const progress = Math.min(95, (tokenCount / estimatedTotal) * 100);
              setStreamProgress(progress);

              // Yield to UI every 20 tokens to prevent blocking
              if (tokenCount % 20 === 0) {
                await new Promise(resolve => setTimeout(resolve, 0));
              }
            }
          } catch (e) {
            console.warn('Failed to parse SSE chunk:', e);
          }
        }
      }

      setStreamProgress(100);
      
      // Save the complete response
      const assistantMsg = await saveMessage(convId, 'assistant', accumulatedContent);
      if (assistantMsg) {
        setMessages(prev => [...prev, { 
          id: assistantMsg.id, 
          role: 'assistant', 
          content: assistantMsg.content, 
          created_at: assistantMsg.created_at 
        }]);
      }

      setStreamingContent('');
    } catch (error: any) {
      if (error.name === 'AbortError') {
        toast({ title: "Cancelled", description: "Response generation cancelled." });
      } else {
        toast({ title: "Error", description: error.message || "Failed to send message.", variant: "destructive" });
      }
      setStreamingContent('');
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
      setStreamProgress(0);
      abortControllerRef.current = null;
    }
  };

  const cancelStreaming = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsStreaming(false);
      setStreamingContent('');
      setStreamProgress(0);
      toast({ title: "Cancelled", description: "Stopped generating response." });
    }
  };

  const handleCopy = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    toast({ title: "Copied", description: "Text copied to clipboard." });
  };

  const toggleResponseMode = async () => {
    const newMode = responseMode === 'short' ? 'deep' : 'short';
    setResponseMode(newMode);
    await supabase.from('profiles').update({ response_mode: newMode }).eq('id', userId);
    toast({
      title: newMode === 'short' ? "Short Answer Mode" : "Deep Answer Mode",
      description: newMode === 'short' ? "Responses will be brief (1-7 lines)." : "Responses will be detailed and comprehensive.",
    });
  };

  const clearFile = () => {
    setUploadedFile(null);
    setFilePreview(null);
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
              {messages.map((message, index) => (
                <motion.div key={message.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }} className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {message.role === 'assistant' && (
                    <div className="p-2 rounded-lg bg-primary/20 h-fit shrink-0"><Bot className="w-5 h-5 text-primary" /></div>
                  )}

                  <Card className={`max-w-[80%] p-4 relative group ${message.role === 'user' ? 'bg-gradient-to-br from-primary to-primary-glow text-primary-foreground' : 'glass-panel'}`}>
                    <p className="text-sm whitespace-pre-wrap pr-8">{message.content}</p>
                    <p className="text-xs opacity-70 mt-2">{new Date(message.created_at).toLocaleTimeString()}</p>
                    
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button size="icon" variant="ghost" className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleCopy(message.content, message.id)}>
                            {copiedId === message.id ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Copy</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </Card>

                  {message.role === 'user' && (
                    <div className="p-2 rounded-lg bg-primary/20 h-fit shrink-0"><User className="w-5 h-5 text-primary" /></div>
                  )}
                </motion.div>
              ))}

              {/* Streaming message */}
              {isStreaming && streamingContent && (
                <motion.div className="flex gap-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <div className="p-2 rounded-lg bg-primary/20 h-fit"><Bot className="w-5 h-5 text-primary" /></div>
                  <Card className="glass-panel p-4 relative group max-w-[85%]">
                    <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">{streamingContent}</p>
                    <div className="flex items-center gap-2 mt-3">
                      <div className="h-1.5 flex-1 bg-muted rounded-full overflow-hidden">
                        <motion.div 
                          className="h-full bg-primary"
                          initial={{ width: 0 }}
                          animate={{ width: `${streamProgress}%` }}
                          transition={{ duration: 0.3 }}
                        />
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2"
                        onClick={cancelStreaming}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </Card>
                </motion.div>
              )}

              {isLoading && (
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
        {/* File Preview */}
        {uploadedFile && (
          <div className="flex items-center gap-3 mb-3 p-3 bg-secondary/50 rounded-lg">
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
                  <Button variant="outline" size="icon" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
                    {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Upload File (PDF, Image, Doc)</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload} accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.xlsx,.xls,.zip,.webp" />

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="icon" 
                    onClick={toggleResponseMode} 
                    className={`transition-all ${responseMode === 'deep' ? 'bg-primary/20 border-primary shadow-lg shadow-primary/20' : 'opacity-60'}`}
                  >
                    {responseMode === 'short' ? <Zap className="h-4 w-4" /> : <BookOpen className="h-4 w-4" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{responseMode === 'short' ? 'Short Answers (1-7 lines)' : 'Detailed Answers'}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          <Textarea 
            placeholder="Type your legal question here..." 
            value={input} 
            onChange={(e) => setInput(e.target.value)} 
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }}} 
            className="min-h-[60px] max-h-[120px] resize-none" 
            disabled={isLoading} 
          />

          <div className="flex flex-col gap-2">
            <Button variant="outline" size="icon" onClick={() => toast({ title: "Voice input", description: "Coming soon!" })} className={isListening ? 'bg-primary text-primary-foreground' : ''}>
              {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </Button>
            <Button size="icon" onClick={handleSend} disabled={(!input.trim() && !uploadedFile) || isLoading} className="glow-button bg-gradient-to-r from-primary to-primary-glow">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
