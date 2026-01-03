import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Scale, ArrowLeft, Users, MessageSquare, FileText, Settings,
  Shield, Activity, Search, Download, Eye, Calendar, TrendingUp,
  Loader2, Brain, ChevronLeft, Database
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface UserProfile {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  profession: string | null;
  created_at: string | null;
}

interface Conversation {
  id: string;
  title: string;
  user_id: string;
  created_at: string;
}

interface Message {
  id: string;
  role: string;
  content: string;
  created_at: string;
}

interface Document {
  id: string;
  filename: string;
  file_type: string;
  created_at: string;
}

interface Memory {
  id: string;
  content: string;
  created_at: string;
}

const Admin = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalConversations: 0,
    totalDocuments: 0,
    totalMessages: 0,
  });
  const [searchQuery, setSearchQuery] = useState('');
  
  // User Profile Modal State
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [userConversations, setUserConversations] = useState<Conversation[]>([]);
  const [userDocuments, setUserDocuments] = useState<Document[]>([]);
  const [userMemories, setUserMemories] = useState<Memory[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [conversationMessages, setConversationMessages] = useState<Message[]>([]);
  const [loadingUserData, setLoadingUserData] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    checkAdminAccess();
  }, []);

  // Auto-scroll to bottom only when opening a new conversation
  useEffect(() => {
    if (selectedConversation && conversationMessages.length > 0) {
      const timer = setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [selectedConversation?.id]);

  const checkAdminAccess = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      navigate('/auth');
      return;
    }

    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', session.user.id)
      .eq('role', 'admin')
      .single();

    if (!roleData) {
      toast({
        title: "Access Denied",
        description: "You don't have admin privileges.",
        variant: "destructive",
      });
      navigate('/chat');
      return;
    }

    setIsAdmin(true);
    await fetchAllData();
    setIsLoading(false);
  };

  const fetchAllData = async () => {
    const { data: usersData } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });
    if (usersData) setUsers(usersData);

    const { data: convsData } = await supabase
      .from('conversations')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
    if (convsData) setConversations(convsData);

    const { count: usersCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
    const { count: convsCount } = await supabase.from('conversations').select('*', { count: 'exact', head: true });
    const { count: docsCount } = await supabase.from('documents').select('*', { count: 'exact', head: true });
    const { count: msgsCount } = await supabase.from('messages').select('*', { count: 'exact', head: true });

    setStats({
      totalUsers: usersCount || 0,
      totalConversations: convsCount || 0,
      totalDocuments: docsCount || 0,
      totalMessages: msgsCount || 0,
    });
  };

  const fetchUserDetails = async (user: UserProfile) => {
    setSelectedUser(user);
    setLoadingUserData(true);
    setSelectedConversation(null);
    setConversationMessages([]);

    // Fetch user conversations
    const { data: convs } = await supabase
      .from('conversations')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setUserConversations(convs || []);

    // Fetch user documents
    const { data: docs } = await supabase
      .from('documents')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setUserDocuments(docs || []);

    // Fetch user memories
    const { data: memories } = await supabase
      .from('user_memories')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setUserMemories(memories || []);

    setLoadingUserData(false);
  };

  const fetchConversationMessages = async (conv: Conversation) => {
    setSelectedConversation(conv);
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conv.id)
      .order('created_at', { ascending: true });
    setConversationMessages(data || []);
  };

  const exportToCSV = (data: any[], filename: string) => {
    if (data.length === 0) return;
    
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(obj => Object.values(obj).map(v => `"${v}"`).join(','));
    const csv = [headers, ...rows].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast({ title: "Exported", description: `${filename}.csv has been downloaded.` });
  };

  const statCards = [
    { title: 'Total Users', value: stats.totalUsers, icon: Users, color: 'text-blue-500' },
    { title: 'Conversations', value: stats.totalConversations, icon: MessageSquare, color: 'text-green-500' },
    { title: 'Documents', value: stats.totalDocuments, icon: FileText, color: 'text-yellow-500' },
    { title: 'Messages', value: stats.totalMessages, icon: Activity, color: 'text-purple-500' },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Verifying admin access...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-background overflow-y-auto">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass-panel border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-primary to-primary-glow">
              <Shield className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <span className="text-xl font-bold">Admin Panel</span>
              <p className="text-xs text-muted-foreground">JurisMind Administration</p>
            </div>
          </div>
          <Button variant="ghost" onClick={() => navigate('/chat')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Chat
          </Button>
        </div>
      </nav>

      <div className="pt-24 pb-12 px-4">
        <div className="container mx-auto">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {statCards.map((stat, index) => (
              <motion.div
                key={stat.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="p-6 glass-panel">
                  <div className="flex items-center justify-between mb-2">
                    <stat.icon className={`w-6 h-6 ${stat.color}`} />
                    <TrendingUp className="w-4 h-4 text-green-500" />
                  </div>
                  <p className="text-3xl font-bold">{stat.value}</p>
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Tabs */}
          <Tabs defaultValue="users" className="space-y-4">
            <TabsList className="grid grid-cols-3 w-full max-w-lg">
              <TabsTrigger value="users">
                <Users className="mr-2 h-4 w-4" />
                Users
              </TabsTrigger>
              <TabsTrigger value="conversations">
                <MessageSquare className="mr-2 h-4 w-4" />
                Conversations
              </TabsTrigger>
              <TabsTrigger value="settings">
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </TabsTrigger>
            </TabsList>

            {/* Users Tab */}
            <TabsContent value="users">
              <Card className="p-6 glass-panel">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold">User Management</h2>
                  <div className="flex gap-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search users..."
                        className="pl-10 w-64"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                    <Button variant="outline" onClick={() => exportToCSV(users, 'users')}>
                      <Download className="mr-2 h-4 w-4" />
                      Export
                    </Button>
                  </div>
                </div>

                <ScrollArea className="h-[500px]">
                  <div className="space-y-2">
                    {users
                      .filter(u => 
                        u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        u.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
                      )
                      .map((user) => (
                        <div
                          key={user.id}
                          className="flex items-center justify-between p-4 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <Button variant="outline" size="sm" onClick={() => fetchUserDetails(user)}>
                              <Eye className="mr-2 h-4 w-4" />
                              View Profile
                            </Button>
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={user.avatar_url || ''} />
                              <AvatarFallback className="bg-primary text-primary-foreground">
                                {user.full_name?.charAt(0) || user.email?.charAt(0) || 'U'}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{user.full_name || 'No name'}</p>
                              <p className="text-sm text-muted-foreground">{user.email}</p>
                              {user.profession && (
                                <p className="text-xs text-muted-foreground">{user.profession}</p>
                              )}
                            </div>
                          </div>
                          <Badge variant="secondary">User</Badge>
                        </div>
                      ))}
                  </div>
                </ScrollArea>
              </Card>
            </TabsContent>

            {/* Conversations Tab */}
            <TabsContent value="conversations">
              <Card className="p-6 glass-panel">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold">All Conversations</h2>
                  <Button variant="outline" onClick={() => exportToCSV(conversations, 'conversations')}>
                    <Download className="mr-2 h-4 w-4" />
                    Export
                  </Button>
                </div>

                <ScrollArea className="h-[500px]">
                  <div className="space-y-2">
                    {conversations.map((conv) => (
                      <div
                        key={conv.id}
                        className="flex items-center justify-between p-4 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors cursor-pointer"
                        onClick={() => {
                          const user = users.find(u => u.id === conv.user_id);
                          if (user) {
                            fetchUserDetails(user);
                            setTimeout(() => fetchConversationMessages(conv), 500);
                          }
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <MessageSquare className="w-5 h-5 text-primary" />
                          <div>
                            <p className="font-medium">{conv.title}</p>
                            <p className="text-sm text-muted-foreground">
                              {new Date(conv.created_at).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </Card>
            </TabsContent>

            {/* Settings Tab */}
            <TabsContent value="settings">
              <Card className="p-6 glass-panel">
                <h2 className="text-xl font-bold mb-6">System Settings</h2>
                
                <div className="space-y-6">
                  <div className="p-4 rounded-lg bg-secondary/50">
                    <h3 className="font-semibold mb-2">Bangladesh Laws Database</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Manage the Bangladesh laws source database and sync from official sources.
                    </p>
                    <Button onClick={() => navigate('/admin/law-sources')}>
                      <Database className="mr-2 h-4 w-4" />
                      Manage Laws Source
                    </Button>
                  </div>

                  <div className="p-4 rounded-lg bg-secondary/50">
                    <h3 className="font-semibold mb-2">AI Configuration</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      JurisMind AI is powered by Lovable AI Gateway with Gemini 2.5 Flash model.
                    </p>
                    <Badge>Active</Badge>
                  </div>

                  <div className="p-4 rounded-lg bg-secondary/50">
                    <h3 className="font-semibold mb-2">Database Status</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Connected to Supabase backend via Lovable Cloud.
                    </p>
                    <Badge variant="secondary">Connected</Badge>
                  </div>

                  <div className="p-4 rounded-lg bg-secondary/50">
                    <h3 className="font-semibold mb-2">Storage</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      User documents stored securely in Supabase Storage.
                    </p>
                    <Badge variant="outline">Operational</Badge>
                  </div>
                </div>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* User Profile Dialog */}
      <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              {selectedConversation ? (
                <Button variant="ghost" size="sm" onClick={() => setSelectedConversation(null)}>
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Back
                </Button>
              ) : null}
              <Avatar className="h-8 w-8">
                <AvatarImage src={selectedUser?.avatar_url || ''} />
                <AvatarFallback>{selectedUser?.full_name?.charAt(0) || 'U'}</AvatarFallback>
              </Avatar>
              {selectedConversation ? selectedConversation.title : selectedUser?.full_name || selectedUser?.email}
            </DialogTitle>
          </DialogHeader>

          {loadingUserData ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : selectedConversation ? (
            // Show conversation messages with touch-friendly scrolling
            <div 
              className="flex-1 h-[calc(90vh-120px)] overflow-y-auto overscroll-contain pr-4"
              style={{ WebkitOverflowScrolling: 'touch' }}
            >
              <div className="space-y-4 pb-4">
                {conversationMessages.map((msg) => (
                  <div key={msg.id} className={`p-3 rounded-lg ${msg.role === 'user' ? 'bg-primary/20 ml-8' : 'bg-secondary mr-8'}`}>
                    <p className="text-xs text-muted-foreground mb-1">{msg.role === 'user' ? 'User' : 'JurisMind'}</p>
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    <p className="text-xs text-muted-foreground mt-1">{new Date(msg.created_at).toLocaleString()}</p>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </div>
          ) : (
            // Show user profile tabs
            <Tabs defaultValue="conversations" className="flex-1 overflow-hidden flex flex-col">
              <TabsList className="grid grid-cols-3 w-full">
                <TabsTrigger value="conversations">Conversations ({userConversations.length})</TabsTrigger>
                <TabsTrigger value="documents">Documents ({userDocuments.length})</TabsTrigger>
                <TabsTrigger value="memory">Memory ({userMemories.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="conversations" className="flex-1 overflow-hidden">
                <ScrollArea className="h-[400px]">
                  <div className="space-y-2 pr-4">
                    {userConversations.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">No conversations</p>
                    ) : (
                      userConversations.map((conv) => (
                        <div
                          key={conv.id}
                          className="p-3 rounded-lg bg-secondary/50 hover:bg-secondary cursor-pointer transition-colors"
                          onClick={() => fetchConversationMessages(conv)}
                        >
                          <p className="font-medium">{conv.title}</p>
                          <p className="text-xs text-muted-foreground">{new Date(conv.created_at).toLocaleString()}</p>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="documents" className="flex-1 overflow-hidden">
                <ScrollArea className="h-[400px]">
                  <div className="space-y-2 pr-4">
                    {userDocuments.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">No documents</p>
                    ) : (
                      userDocuments.map((doc) => (
                        <div key={doc.id} className="p-3 rounded-lg bg-secondary/50 flex items-center gap-3">
                          <FileText className="h-5 w-5 text-primary" />
                          <div className="flex-1">
                            <p className="font-medium truncate">{doc.filename}</p>
                            <p className="text-xs text-muted-foreground">{doc.file_type} • {new Date(doc.created_at).toLocaleDateString()}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="memory" className="flex-1 overflow-hidden">
                <ScrollArea className="h-[400px]">
                  <div className="space-y-2 pr-4">
                    {userMemories.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">No saved memories</p>
                    ) : (
                      userMemories.map((mem) => (
                        <div key={mem.id} className="p-3 rounded-lg bg-secondary/50">
                          <div className="flex items-start gap-2">
                            <Brain className="h-4 w-4 text-primary mt-1 shrink-0" />
                            <div>
                              <p className="text-sm">{mem.content}</p>
                              <p className="text-xs text-muted-foreground mt-1">{new Date(mem.created_at).toLocaleString()}</p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-border">
        <div className="container mx-auto text-center">
          <p className="text-muted-foreground">
            <span className="font-bold text-primary">JurisMind Admin</span> — Created by RONY
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Admin;
