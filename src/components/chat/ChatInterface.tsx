import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Send, Mic, MicOff, Languages, Bot, Loader2, User, UserCircle,
  Copy, Check, Zap, BookOpen, Upload, X
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(conversationId);

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
        .select('response_mode')
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
    toast({ title: "File attached", description: `${file.name} ready to upload.` });
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

  const handleSend = async () => {
    if (!input.trim() && !uploadedFile) return;
    if (isLoading) return;

    let userMessage = input.trim();
    setInput('');
    setIsLoading(true);

    try {
      if (uploadedFile) {
        setIsUploading(true);
        try {
          await uploadFileToStorage(uploadedFile);
          userMessage = `[Uploaded file: ${uploadedFile.name}]\n\n${userMessage || 'Please analyze this file.'}`;
          toast({ title: "File uploaded", description: "File saved to your documents." });
        } catch {
          toast({ title: "Upload failed", description: "Could not upload file.", variant: "destructive" });
        }
        setUploadedFile(null);
        setIsUploading(false);
      }

      let convId = currentConversationId;
      if (!convId) {
        convId = await createConversation();
        if (!convId) throw new Error('Failed to create conversation');
      }

      const userMsg = await saveMessage(convId, 'user', userMessage);
      if (userMsg) {
        setMessages(prev => [...prev, { id: userMsg.id, role: 'user', content: userMsg.content, created_at: userMsg.created_at }]);
      }

      const { data, error } = await supabase.functions.invoke('legal-chat', {
        body: { messages: [...messages, { role: 'user', content: userMessage }], personality, language, responseMode },
      });

      if (error) throw error;

      const assistantMsg = await saveMessage(convId, 'assistant', data.response);
      if (assistantMsg) {
        setMessages(prev => [...prev, { id: assistantMsg.id, role: 'assistant', content: assistantMsg.content, created_at: assistantMsg.created_at }]);
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to send message.", variant: "destructive" });
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

  const toggleResponseMode = () => {
    const newMode = responseMode === 'short' ? 'deep' : 'short';
    setResponseMode(newMode);
    supabase.from('profiles').update({ response_mode: newMode }).eq('id', userId);
    toast({
      title: newMode === 'short' ? "Short Answer Mode" : "Deep Answer Mode",
      description: newMode === 'short' ? "Responses will be brief." : "Responses will be detailed.",
    });
  };

  const personalityIcons = { lawyer: '⚖️', judge: '👨‍⚖️', researcher: '🔍', student: '📚' };

  return (
    <div className="flex-1 flex flex-col h-full">
      <ScrollArea className="flex-1 p-4">
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
                    <div className="p-2 rounded-lg bg-primary/20 h-fit"><Bot className="w-5 h-5 text-primary" /></div>
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
                    <div className="p-2 rounded-lg bg-primary/20 h-fit"><User className="w-5 h-5 text-primary" /></div>
                  )}
                </motion.div>
              ))}

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
        {uploadedFile && (
          <div className="flex items-center gap-2 mb-3 p-2 bg-secondary/50 rounded-lg">
            <Upload className="h-4 w-4 text-primary" />
            <span className="text-sm flex-1 truncate">{uploadedFile.name}</span>
            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setUploadedFile(null)}><X className="h-3 w-3" /></Button>
          </div>
        )}

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

        <div className="flex gap-2">
          <div className="flex flex-col gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
                    {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Upload File</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload} accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.xlsx,.xls,.zip" />

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon" onClick={toggleResponseMode} className={responseMode === 'deep' ? 'bg-primary/20 border-primary' : 'opacity-60'}>
                    {responseMode === 'short' ? <Zap className="h-4 w-4" /> : <BookOpen className="h-4 w-4" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{responseMode === 'short' ? 'Short Answers' : 'Detailed Answers'}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          <Textarea placeholder="Type your legal question here..." value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }}} className="min-h-[60px] max-h-[120px]" disabled={isLoading} />

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
