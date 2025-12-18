import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Scale, MessageSquare, Plus, LogOut, Settings, FileText, Gavel, BookMarked, 
  Menu, X, Sun, Moon, Pencil, Trash2, Check, Clock, User
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useTheme } from 'next-themes';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

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
  const [isOpen, setIsOpen] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [userName, setUserName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState<string | null>(null);

  useEffect(() => {
    fetchConversations();
    fetchUserInfo();
    checkAdminStatus();
  }, [userId]);

  const fetchUserInfo = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('email, full_name, avatar_url')
      .eq('id', userId)
      .single();

    if (data) {
      setUserEmail(data.email || '');
      setUserName(data.full_name || '');
      setAvatarUrl(data.avatar_url || null);
    }
  };

  const checkAdminStatus = async () => {
    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'admin')
      .maybeSingle();

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

  const handleEditStart = (conv: Conversation) => {
    setEditingId(conv.id);
    setEditTitle(conv.title);
  };

  const handleEditSave = async (convId: string) => {
    if (!editTitle.trim()) return;

    const { error } = await supabase
      .from('conversations')
      .update({ title: editTitle.trim() })
      .eq('id', convId);

    if (!error) {
      setConversations(prev =>
        prev.map(c => c.id === convId ? { ...c, title: editTitle.trim() } : c)
      );
      toast({ title: "Conversation renamed" });
    }
    setEditingId(null);
  };

  const handleDeleteClick = (convId: string) => {
    setConversationToDelete(convId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!conversationToDelete) return;

    // First delete messages, then conversation
    await supabase.from('messages').delete().eq('conversation_id', conversationToDelete);
    const { error } = await supabase
      .from('conversations')
      .delete()
      .eq('id', conversationToDelete);

    if (!error) {
      setConversations(prev => prev.filter(c => c.id !== conversationToDelete));
      if (selectedConversationId === conversationToDelete) {
        onSelectConversation(null);
      }
      toast({ title: "Conversation deleted" });
    }
    setDeleteDialogOpen(false);
    setConversationToDelete(null);
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
          
          {/* Recent Conversations Button - Large and Visible */}
          <Button
            variant="outline"
            className="w-full justify-start mt-4 h-12 border-primary/50 hover:border-primary hover:bg-primary/10"
            onClick={() => navigate('/recent-conversations')}
          >
            <Clock className="mr-2 h-5 w-5 text-primary" />
            <span className="font-semibold">Recent Conversations</span>
          </Button>
        </div>

        {/* Conversations list */}
        <ScrollArea className="flex-1 px-4">
          <div className="space-y-2 pb-4">
            <h3 className="text-sm font-semibold text-muted-foreground mb-2">History</h3>
            {conversations.map((conv) => (
              <div
                key={conv.id}
                className={`group relative flex items-center gap-2 rounded-md transition-colors ${
                  selectedConversationId === conv.id ? 'bg-secondary' : 'hover:bg-secondary/50'
                }`}
              >
                {editingId === conv.id ? (
                  <div className="flex-1 flex items-center gap-1 p-2">
                    <Input
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="h-8 text-sm"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleEditSave(conv.id);
                        if (e.key === 'Escape') setEditingId(null);
                      }}
                    />
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleEditSave(conv.id)}>
                      <Check className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <Button
                      variant="ghost"
                      className="flex-1 justify-start text-left h-auto py-3 pr-16"
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
                    <div className="absolute right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditStart(conv);
                        }}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteClick(conv.id);
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* User section */}
        <div className="p-4 border-t border-border space-y-2">
          <div 
            className="flex items-center gap-3 mb-2 cursor-pointer hover:bg-secondary/50 rounded-lg p-2 transition-colors"
            onClick={() => navigate('/settings')}
          >
            <Avatar>
              <AvatarImage src={avatarUrl || ''} />
              <AvatarFallback className="bg-primary text-primary-foreground">
                {userName?.charAt(0) || userEmail?.charAt(0)?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-medium truncate">{userName || userEmail}</p>
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
              onClick={() => navigate('/settings')}
            >
              <User className="h-4 w-4" />
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Conversation?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the conversation and all its messages.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete Forever
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
