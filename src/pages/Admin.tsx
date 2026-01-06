import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Scale, ArrowLeft, Users, MessageSquare, FileText, Settings,
  Shield, Activity, Search, Download, Eye, Calendar, TrendingUp,
  Loader2, Brain, ChevronLeft, Database, Zap, Key, Bot, Plus, Trash2, Edit, CheckCircle2, ImageIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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

interface AIModel {
  id: string;
  model_name: string;
  provider: string;
  api_key_encrypted: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface ImageAIModel {
  id: string;
  model_name: string;
  provider: string;
  api_key_encrypted: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
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
  const [activeApiKey, setActiveApiKey] = useState<'primary' | 'secondary'>('primary');
  const [loadingLegacyKey, setLoadingLegacyKey] = useState(false);
  
  // AI Models State
  const [aiModels, setAiModels] = useState<AIModel[]>([]);
  const [activeModel, setActiveModel] = useState<AIModel | null>(null);
  const [loadingModels, setLoadingModels] = useState(false);
  const [deleteModelId, setDeleteModelId] = useState<string | null>(null);
  
  // Image AI Models State
  const [imageModels, setImageModels] = useState<ImageAIModel[]>([]);
  const [activeImageModel, setActiveImageModel] = useState<ImageAIModel | null>(null);
  const [loadingImageModels, setLoadingImageModels] = useState(false);
  const [deleteImageModelId, setDeleteImageModelId] = useState<string | null>(null);
  
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
    await fetchAIModels();
    await fetchImageModels();
    await fetchActiveLegacyKey();
    setIsLoading(false);
  };

  const fetchImageModels = async () => {
    setLoadingImageModels(true);
    try {
      const { data, error } = await supabase
        .from('image_ai_models')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        setImageModels(data as ImageAIModel[]);
        const active = data.find((m: ImageAIModel) => m.is_active);
        if (active) setActiveImageModel(active as ImageAIModel);
      }
    } catch (error) {
      console.error('Error fetching image AI models:', error);
    } finally {
      setLoadingImageModels(false);
    }
  };

  const setImageModelActive = async (modelId: string) => {
    try {
      // Deactivate all image models first
      await supabase
        .from('image_ai_models')
        .update({ is_active: false })
        .neq('id', '00000000-0000-0000-0000-000000000000');

      const { error } = await supabase
        .from('image_ai_models')
        .update({ is_active: true })
        .eq('id', modelId);

      if (error) throw error;

      await fetchImageModels();
      toast({ title: "Image Model Activated", description: "The selected image model is now active for all image requests." });
    } catch (error: any) {
      console.error('Error setting active image model:', error);
      toast({ title: "Error", description: "Failed to activate image model.", variant: "destructive" });
    }
  };

  const deleteImageModel = async (modelId: string) => {
    try {
      const { error } = await supabase
        .from('image_ai_models')
        .delete()
        .eq('id', modelId);

      if (error) throw error;

      await fetchImageModels();
      setDeleteImageModelId(null);
      toast({ title: "Image Model Deleted", description: "The image model has been removed successfully." });
    } catch (error: any) {
      console.error('Error deleting image model:', error);
      toast({ title: "Error", description: "Failed to delete image model.", variant: "destructive" });
    }
  };

  const fetchActiveLegacyKey = async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('setting_value')
        .eq('setting_key', 'active_legacy_key')
        .single();

      if (data && !error) {
        setActiveApiKey(data.setting_value as 'primary' | 'secondary');
      }
    } catch (error) {
      console.error('Error fetching active legacy key:', error);
    }
  };

  const updateActiveLegacyKey = async (key: 'primary' | 'secondary') => {
    setLoadingLegacyKey(true);
    try {
      const { error } = await supabase
        .from('system_settings')
        .update({ setting_value: key })
        .eq('setting_key', 'active_legacy_key');

      if (error) throw error;

      setActiveApiKey(key);
      toast({ 
        title: "Legacy Key Activated", 
        description: `${key === 'primary' ? 'Key 1 (Primary)' : 'Key 2 (Secondary)'} is now the active fallback key for all AI requests.` 
      });
    } catch (error: any) {
      console.error('Error updating active legacy key:', error);
      toast({ title: "Error", description: "Failed to update active legacy key.", variant: "destructive" });
    } finally {
      setLoadingLegacyKey(false);
    }
  };

  const fetchAIModels = async () => {
    setLoadingModels(true);
    try {
      const { data, error } = await supabase
        .from('ai_models')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        setAiModels(data as AIModel[]);
        const active = data.find((m: AIModel) => m.is_active);
        if (active) setActiveModel(active as AIModel);
      }
    } catch (error) {
      console.error('Error fetching AI models:', error);
    } finally {
      setLoadingModels(false);
    }
  };

  const setModelActive = async (modelId: string) => {
    try {
      const { error } = await supabase
        .from('ai_models')
        .update({ is_active: true })
        .eq('id', modelId);

      if (error) throw error;

      await fetchAIModels();
      toast({ title: "Model Activated", description: "The selected model is now active and will be used for all AI requests." });
    } catch (error: any) {
      console.error('Error setting active model:', error);
      toast({ title: "Error", description: "Failed to activate model.", variant: "destructive" });
    }
  };

  const deleteModel = async (modelId: string) => {
    try {
      const { error } = await supabase
        .from('ai_models')
        .delete()
        .eq('id', modelId);

      if (error) throw error;

      await fetchAIModels();
      setDeleteModelId(null);
      toast({ title: "Model Deleted", description: "The model has been removed successfully." });
    } catch (error: any) {
      console.error('Error deleting model:', error);
      toast({ title: "Error", description: "Failed to delete model.", variant: "destructive" });
    }
  };

  const maskApiKey = (encrypted: string): string => {
    return '••••••••••••' + encrypted.slice(-4);
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
              <div className="space-y-6">
                {/* Active Model Status Banner */}
                <Card className="p-6 glass-panel border-primary/30 bg-gradient-to-br from-primary/10 to-background">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-xl bg-primary/20 animate-pulse">
                        <Bot className="w-8 h-8 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Currently Active Model</p>
                        <h2 className="text-2xl font-bold flex items-center gap-2">
                          {activeModel ? (
                            <>
                              <span className="text-primary">{activeModel.model_name}</span>
                              <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                                <Zap className="w-3 h-3 mr-1" />
                                Running
                              </Badge>
                            </>
                          ) : (
                            <span className="text-muted-foreground">No model active</span>
                          )}
                        </h2>
                        {activeModel && (
                          <p className="text-sm text-muted-foreground mt-1">
                            Provider: {activeModel.provider} • API Key: {maskApiKey(activeModel.api_key_encrypted)}
                          </p>
                        )}
                      </div>
                    </div>
                    <Button onClick={() => navigate('/admin/add-model')} size="lg">
                      <Plus className="mr-2 h-5 w-5" />
                      Add New Model
                    </Button>
                  </div>
                </Card>

                {/* AI Models Management */}
                <Card className="p-6 glass-panel">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                      <Bot className="w-5 h-5 text-primary" />
                      <h3 className="text-xl font-bold">AI Models</h3>
                    </div>
                    <Badge variant="secondary">{aiModels.length} Model{aiModels.length !== 1 ? 's' : ''}</Badge>
                  </div>

                  {loadingModels ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : aiModels.length === 0 ? (
                    <div className="text-center py-12">
                      <Bot className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                      <h4 className="text-lg font-medium mb-2">No AI Models Configured</h4>
                      <p className="text-muted-foreground mb-4">Add your first AI model to get started</p>
                      <Button onClick={() => navigate('/admin/add-model')}>
                        <Plus className="mr-2 h-4 w-4" />
                        Add New Model
                      </Button>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-border overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Model Name</TableHead>
                            <TableHead>Provider</TableHead>
                            <TableHead>API Key</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {aiModels.map((model) => (
                            <TableRow key={model.id} className={model.is_active ? 'bg-primary/5' : ''}>
                              <TableCell className="font-medium">
                                <div className="flex items-center gap-2">
                                  {model.is_active && (
                                    <Zap className="w-4 h-4 text-primary animate-pulse" />
                                  )}
                                  {model.model_name}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="capitalize">
                                  {model.provider}
                                </Badge>
                              </TableCell>
                              <TableCell className="font-mono text-sm text-muted-foreground">
                                {maskApiKey(model.api_key_encrypted)}
                              </TableCell>
                              <TableCell>
                                {model.is_active ? (
                                  <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                                    <CheckCircle2 className="w-3 h-3 mr-1" />
                                    Active
                                  </Badge>
                                ) : (
                                  <Badge variant="secondary">Standby</Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-2">
                                  {!model.is_active && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => setModelActive(model.id)}
                                    >
                                      <Zap className="mr-1 h-3 w-3" />
                                      Activate
                                    </Button>
                                  )}
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => navigate(`/admin/add-model?edit=${model.id}`)}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-destructive hover:text-destructive"
                                    onClick={() => setDeleteModelId(model.id)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </Card>

                {/* Legacy API Keys Section */}
                <Card className="p-6 glass-panel border-amber-500/20">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Key className="w-5 h-5 text-amber-500" />
                      <h3 className="font-semibold">Legacy API Keys (Fallback)</h3>
                    </div>
                    <Badge variant="outline" className="text-amber-500 border-amber-500/30">
                      Fallback System
                    </Badge>
                  </div>
                  
                  {/* Currently Active Legacy Key Display */}
                  <div className="mb-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-amber-500 animate-pulse" />
                      <span className="text-sm font-medium">Currently Active Fallback:</span>
                      <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                        {activeApiKey === 'primary' ? 'Key 1 - Primary' : 'Key 2 - Secondary'}
                      </Badge>
                    </div>
                  </div>
                  
                  <p className="text-sm text-muted-foreground mb-4">
                    Select the active fallback key. This key will be used for all AI requests when no database model is active.
                    Your selection persists globally across all sessions.
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button
                      onClick={() => updateActiveLegacyKey('primary')}
                      disabled={loadingLegacyKey}
                      className={`relative p-4 rounded-lg border text-left transition-all ${
                        activeApiKey === 'primary' 
                          ? 'border-amber-500/50 bg-amber-500/10 ring-2 ring-amber-500/30' 
                          : 'border-border bg-secondary/30 hover:border-amber-500/30 hover:bg-secondary/50'
                      } ${loadingLegacyKey ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className={`p-2 rounded-full ${activeApiKey === 'primary' ? 'bg-amber-500/20' : 'bg-muted'}`}>
                            {loadingLegacyKey ? (
                              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                            ) : (
                              <Zap className={`w-4 h-4 ${activeApiKey === 'primary' ? 'text-amber-500 animate-pulse' : 'text-muted-foreground'}`} />
                            )}
                          </div>
                          <span className="font-medium">Key 1</span>
                        </div>
                        <Badge className={activeApiKey === 'primary' ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-muted text-muted-foreground'}>
                          {activeApiKey === 'primary' ? 'Active' : 'Standby'}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">Primary Gemini API Key</p>
                      {activeApiKey === 'primary' && (
                        <div className="absolute top-2 right-2">
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                        </div>
                      )}
                    </button>

                    <button
                      onClick={() => updateActiveLegacyKey('secondary')}
                      disabled={loadingLegacyKey}
                      className={`relative p-4 rounded-lg border text-left transition-all ${
                        activeApiKey === 'secondary' 
                          ? 'border-amber-500/50 bg-amber-500/10 ring-2 ring-amber-500/30' 
                          : 'border-border bg-secondary/30 hover:border-amber-500/30 hover:bg-secondary/50'
                      } ${loadingLegacyKey ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className={`p-2 rounded-full ${activeApiKey === 'secondary' ? 'bg-amber-500/20' : 'bg-muted'}`}>
                            {loadingLegacyKey ? (
                              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                            ) : (
                              <Zap className={`w-4 h-4 ${activeApiKey === 'secondary' ? 'text-amber-500 animate-pulse' : 'text-muted-foreground'}`} />
                            )}
                          </div>
                          <span className="font-medium">Key 2</span>
                        </div>
                        <Badge className={activeApiKey === 'secondary' ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-muted text-muted-foreground'}>
                          {activeApiKey === 'secondary' ? 'Active' : 'Standby'}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">Secondary Gemini API Key</p>
                      {activeApiKey === 'secondary' && (
                        <div className="absolute top-2 right-2">
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                        </div>
                      )}
                    </button>
                  </div>
                </Card>

                {/* Image AI Models Section */}
                <Card className="p-6 glass-panel border-pink-500/20 bg-gradient-to-br from-pink-500/5 to-purple-600/5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-xl bg-gradient-to-br from-pink-500/20 to-purple-600/20 animate-pulse">
                        <ImageIcon className="w-8 h-8 text-pink-500" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Currently Active Image Model</p>
                        <h2 className="text-xl font-bold flex items-center gap-2">
                          {activeImageModel ? (
                            <>
                              <span className="text-pink-500">{activeImageModel.model_name}</span>
                              <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                                <Zap className="w-3 h-3 mr-1" />
                                Running
                              </Badge>
                            </>
                          ) : (
                            <span className="text-muted-foreground">No image model active</span>
                          )}
                        </h2>
                        {activeImageModel && (
                          <p className="text-sm text-muted-foreground mt-1">
                            Provider: {activeImageModel.provider} • API Key: {maskApiKey(activeImageModel.api_key_encrypted)}
                          </p>
                        )}
                      </div>
                    </div>
                    <Button 
                      onClick={() => navigate('/admin/add-image-model')} 
                      className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700"
                    >
                      <Plus className="mr-2 h-5 w-5" />
                      Add Image Model
                    </Button>
                  </div>

                  <div className="mb-4 p-3 rounded-lg bg-pink-500/10 border border-pink-500/20">
                    <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                      <ImageIcon className="h-4 w-4 text-pink-500" />
                      Image AI Capabilities
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline" className="text-pink-400 border-pink-500/30">Generate Images</Badge>
                      <Badge variant="outline" className="text-pink-400 border-pink-500/30">Analyze Images</Badge>
                      <Badge variant="outline" className="text-pink-400 border-pink-500/30">Edit Images</Badge>
                    </div>
                  </div>

                  {loadingImageModels ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-pink-500" />
                    </div>
                  ) : imageModels.length === 0 ? (
                    <div className="text-center py-8">
                      <ImageIcon className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                      <h4 className="text-md font-medium mb-2">No Image Models Configured</h4>
                      <p className="text-sm text-muted-foreground mb-4">Add your first image AI model to enable image features</p>
                      <Button 
                        onClick={() => navigate('/admin/add-image-model')}
                        variant="outline"
                        className="border-pink-500/30 hover:bg-pink-500/10"
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Add Image Model
                      </Button>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-pink-500/20 overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Model Name</TableHead>
                            <TableHead>Provider</TableHead>
                            <TableHead>API Key</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {imageModels.map((model) => (
                            <TableRow key={model.id} className={model.is_active ? 'bg-pink-500/5' : ''}>
                              <TableCell className="font-medium">
                                <div className="flex items-center gap-2">
                                  {model.is_active && (
                                    <Zap className="w-4 h-4 text-pink-500 animate-pulse" />
                                  )}
                                  {model.model_name}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="capitalize border-pink-500/30">
                                  {model.provider}
                                </Badge>
                              </TableCell>
                              <TableCell className="font-mono text-sm text-muted-foreground">
                                {maskApiKey(model.api_key_encrypted)}
                              </TableCell>
                              <TableCell>
                                {model.is_active ? (
                                  <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                                    <CheckCircle2 className="w-3 h-3 mr-1" />
                                    Active
                                  </Badge>
                                ) : (
                                  <Badge variant="secondary">Standby</Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-2">
                                  {!model.is_active && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="border-pink-500/30 hover:bg-pink-500/10"
                                      onClick={() => setImageModelActive(model.id)}
                                    >
                                      <Zap className="mr-1 h-3 w-3" />
                                      Activate
                                    </Button>
                                  )}
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => navigate(`/admin/add-image-model?edit=${model.id}`)}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-destructive hover:text-destructive"
                                    onClick={() => setDeleteImageModelId(model.id)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </Card>

                {/* Other Settings */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card className="p-4 glass-panel">
                    <h3 className="font-semibold mb-2">Bangladesh Laws Database</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Manage the Bangladesh laws source database.
                    </p>
                    <Button onClick={() => navigate('/admin/law-sources')}>
                      <Database className="mr-2 h-4 w-4" />
                      Manage Laws
                    </Button>
                  </Card>

                  <Card className="p-4 glass-panel">
                    <h3 className="font-semibold mb-2">Database Status</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Connected to Lovable Cloud backend.
                    </p>
                    <Badge variant="secondary">Connected</Badge>
                  </Card>
                </div>
              </div>
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

      {/* Delete Model Confirmation Dialog */}
      <Dialog open={!!deleteModelId} onOpenChange={() => setDeleteModelId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete AI Model</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this AI model? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteModelId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteModelId && deleteModel(deleteModelId)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Model
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Image Model Confirmation Dialog */}
      <Dialog open={!!deleteImageModelId} onOpenChange={() => setDeleteImageModelId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Image AI Model</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this image AI model? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteImageModelId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteImageModelId && deleteImageModel(deleteImageModelId)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Image Model
            </Button>
          </DialogFooter>
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
