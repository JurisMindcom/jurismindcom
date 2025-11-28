import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Mic, MicOff, Paperclip, Languages, Bot, Loader2, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

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
  const messagesEndRef = useRef<HTMLDivElement>(null);
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

  const loadMessages = async (convId: string) => {
    const { data, error } = await supabase
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
    const { data, error } = await supabase
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
    const { data, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: convId,
        role,
        content,
      })
      .select()
      .single();

    return data;
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setIsLoading(true);

    try {
      // Create conversation if needed
      let convId = currentConversationId;
      if (!convId) {
        convId = await createConversation();
        if (!convId) throw new Error('Failed to create conversation');
      }

      // Add user message
      const userMsg = await saveMessage(convId, 'user', userMessage);
      if (userMsg) {
        setMessages(prev => [...prev, {
          id: userMsg.id,
          role: 'user' as const,
          content: userMsg.content,
          created_at: userMsg.created_at,
        }]);
      }

      // Call AI edge function
      const { data, error } = await supabase.functions.invoke('legal-chat', {
        body: {
          messages: [...messages, { role: 'user', content: userMessage }],
          personality,
          language,
        },
      });

      if (error) throw error;

      // Add assistant response
      const assistantMsg = await saveMessage(convId, 'assistant', data.response);
      if (assistantMsg) {
        setMessages(prev => [...prev, {
          id: assistantMsg.id,
          role: 'assistant' as const,
          content: assistantMsg.content,
          created_at: assistantMsg.created_at,
        }]);
      }
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to send message. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVoiceInput = () => {
    toast({
      title: "Voice input",
      description: "Voice recognition feature coming soon!",
    });
  };

  const personalityIcons = {
    lawyer: '⚖️',
    judge: '👨‍⚖️',
    researcher: '🔍',
    student: '📚',
  };

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-border glass-panel flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Ask JurisMind</h2>
          <p className="text-sm text-muted-foreground">Your AI legal assistant is ready to help</p>
        </div>

        <div className="flex items-center gap-2">
          <Select value={personality} onValueChange={(v: any) => setPersonality(v)}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="lawyer">{personalityIcons.lawyer} Lawyer Mode</SelectItem>
              <SelectItem value="judge">{personalityIcons.judge} Judge Mode</SelectItem>
              <SelectItem value="researcher">{personalityIcons.researcher} Researcher</SelectItem>
              <SelectItem value="student">{personalityIcons.student} Student Mode</SelectItem>
            </SelectContent>
          </Select>

          <Select value={language} onValueChange={(v: any) => setLanguage(v)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="english">🇬🇧 English</SelectItem>
              <SelectItem value="bangla">🇧🇩 বাংলা</SelectItem>
              <SelectItem value="mixed">🌐 Mixed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <AnimatePresence>
          {messages.length === 0 ? (
            <motion.div
              className="h-full flex flex-col items-center justify-center text-center space-y-6 px-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <div className="p-6 rounded-2xl bg-gradient-to-br from-primary/20 to-primary-glow/20 backdrop-blur-sm animate-glow">
                <Bot className="w-16 h-16 text-primary" />
              </div>
              <h3 className="text-2xl font-bold">Welcome to JurisMind</h3>
              <p className="text-muted-foreground max-w-md">
                Ask me anything about law, upload documents for analysis, or search case laws.
                I speak both English and বাংলা fluently.
              </p>
              
              {/* Quick Action Suggestions */}
              <div className="flex flex-wrap gap-2 justify-center max-w-2xl">
                {[
                  "What is the Limitation Act 1908?",
                  "তালাকের নিয়ম কি?",
                  "How to file an FIR?",
                  "Explain Section 420 Penal Code",
                  "Land registration process",
                  "চুক্তির আবশ্যক উপাদান",
                ].map((suggestion) => (
                  <Button
                    key={suggestion}
                    variant="outline"
                    size="sm"
                    className="text-xs hover:bg-primary/10 hover:border-primary transition-all"
                    onClick={() => setInput(suggestion)}
                  >
                    {suggestion}
                  </Button>
                ))}
              </div>

              <div className="flex flex-wrap gap-2 justify-center pt-4">
                <Badge variant="secondary">Document Analysis</Badge>
                <Badge variant="secondary">Case Law Search</Badge>
                <Badge variant="secondary">Legal Drafting</Badge>
                <Badge variant="secondary">Voice Support</Badge>
              </div>
            </motion.div>
          ) : (
            <div className="space-y-4 pb-4">
              {messages.map((message, index) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {message.role === 'assistant' && (
                    <div className="p-2 rounded-lg bg-primary/20 h-fit">
                      <Bot className="w-5 h-5 text-primary" />
                    </div>
                  )}

                  <Card className={`max-w-[80%] p-4 ${
                    message.role === 'user'
                      ? 'bg-gradient-to-br from-primary to-primary-glow text-primary-foreground'
                      : 'glass-panel'
                  }`}>
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    <p className="text-xs opacity-70 mt-2">
                      {new Date(message.created_at).toLocaleTimeString()}
                    </p>
                  </Card>

                  {message.role === 'user' && (
                    <div className="p-2 rounded-lg bg-primary/20 h-fit">
                      <User className="w-5 h-5 text-primary" />
                    </div>
                  )}
                </motion.div>
              ))}

              {isLoading && (
                <motion.div
                  className="flex gap-3"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <div className="p-2 rounded-lg bg-primary/20 h-fit">
                    <Bot className="w-5 h-5 text-primary" />
                  </div>
                  <Card className="glass-panel p-4">
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <p className="text-sm">Thinking...</p>
                    </div>
                  </Card>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </AnimatePresence>
      </ScrollArea>

      {/* Input */}
      <div className="p-4 border-t border-border glass-panel">
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => toast({ title: 'File upload', description: 'Coming soon!' })}
          >
            <Paperclip className="h-4 w-4" />
          </Button>

          <Textarea
            placeholder="Ask about law, request document analysis, or search case laws..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            className="min-h-[60px] max-h-[120px]"
            disabled={isLoading}
          />

          <div className="flex flex-col gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={handleVoiceInput}
              className={isListening ? 'bg-primary text-primary-foreground' : ''}
            >
              {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </Button>

            <Button
              size="icon"
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="glow-button bg-gradient-to-r from-primary to-primary-glow"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
