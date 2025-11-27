import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Scale, MessageSquare, Plus, LogOut, Settings, FileText, Gavel, BookMarked, Menu, X, Sun, Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useTheme } from 'next-themes';

interface ChatSidebarProps {
  userId: string;
  onSelectConversation: (id: string | null) => void;
  selectedConversationId: string | null;
}

interface Conversation {
  id: string;
  title: string;
  created_at: string;
  tags: string[];
}

const ChatSidebar = ({ userId, onSelectConversation, selectedConversationId }: ChatSidebarProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isOpen, setIsOpen] = useState(true);
  const [userEmail, setUserEmail] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    fetchConversations();
    fetchUserInfo();
    checkAdminStatus();
  }, [userId]);

  const fetchUserInfo = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', userId)
      .single();

    if (data) setUserEmail(data.email || '');
  };

  const checkAdminStatus = async () => {
    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'admin')
      .single();

    setIsAdmin(!!data);
  };

  const fetchConversations = async () => {
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(20);

    if (data) setConversations(data);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Logged out",
      description: "You've been logged out successfully.",
    });
    navigate('/auth');
  };

  const handleNewChat = () => {
    onSelectConversation(null);
  };

  return (
    <>
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden fixed top-4 left-4 z-50"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X /> : <Menu />}
      </Button>

      {/* Sidebar */}
      <motion.aside
        className={`${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0 fixed md:relative z-40 h-full w-80 border-r border-border bg-card glass-panel flex flex-col transition-transform duration-300`}
        initial={false}
      >
        {/* Header */}
        <div className="p-6 border-b border-border">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-gradient-to-br from-primary to-primary-glow">
              <Scale className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-legal-gold bg-clip-text text-transparent">
                JurisMind
              </h1>
              <p className="text-xs text-muted-foreground">Legal AI Assistant</p>
            </div>
          </div>

          <Button
            onClick={handleNewChat}
            className="w-full glow-button bg-gradient-to-r from-primary to-primary-glow"
          >
            <Plus className="mr-2 h-4 w-4" />
            New Conversation
          </Button>
        </div>

        {/* Navigation */}
        <div className="px-4 py-4 space-y-2">
          <Button
            variant="ghost"
            className="w-full justify-start"
            onClick={() => navigate('/documents')}
          >
            <FileText className="mr-2 h-4 w-4" />
            Documents
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start"
            onClick={() => navigate('/case-law')}
          >
            <Gavel className="mr-2 h-4 w-4" />
            Case Law Search
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start"
            onClick={() => navigate('/templates')}
          >
            <BookMarked className="mr-2 h-4 w-4" />
            Legal Templates
          </Button>
          {isAdmin && (
            <Button
              variant="ghost"
              className="w-full justify-start text-legal-gold"
              onClick={() => navigate('/admin')}
            >
              <Settings className="mr-2 h-4 w-4" />
              Admin Panel
            </Button>
          )}
        </div>

        {/* Conversations list */}
        <ScrollArea className="flex-1 px-4">
          <div className="space-y-2 pb-4">
            <h3 className="text-sm font-semibold text-muted-foreground mb-2">Recent Conversations</h3>
            {conversations.map((conv) => (
              <Button
                key={conv.id}
                variant={selectedConversationId === conv.id ? 'secondary' : 'ghost'}
                className="w-full justify-start text-left h-auto py-3"
                onClick={() => onSelectConversation(conv.id)}
              >
                <MessageSquare className="mr-2 h-4 w-4 flex-shrink-0" />
                <div className="flex-1 overflow-hidden">
                  <p className="text-sm font-medium truncate">{conv.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(conv.created_at).toLocaleDateString()}
                  </p>
                </div>
              </Button>
            ))}
          </div>
        </ScrollArea>

        {/* User section */}
        <div className="p-4 border-t border-border space-y-2">
          <div className="flex items-center gap-3 mb-2">
            <Avatar>
              <AvatarFallback className="bg-primary text-primary-foreground">
                {userEmail.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-medium truncate">{userEmail}</p>
              {isAdmin && (
                <p className="text-xs text-legal-gold">Admin</p>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="flex-1"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="flex-1"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center pt-2">
            Created by RONY
          </p>
        </div>
      </motion.aside>

      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="md:hidden fixed inset-0 bg-background/80 backdrop-blur-sm z-30"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
};

export default ChatSidebar;
