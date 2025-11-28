import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Scale, ArrowLeft, Users, MessageSquare, FileText, Settings,
  BarChart3, Shield, AlertTriangle, Activity, Search, Download,
  Trash2, Eye, UserCheck, UserX, Calendar, TrendingUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface User {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
}

interface Conversation {
  id: string;
  title: string;
  user_id: string;
  created_at: string;
}

interface ActivityLog {
  id: string;
  user_id: string;
  action: string;
  created_at: string;
}

const Admin = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalConversations: 0,
    totalDocuments: 0,
    totalMessages: 0,
  });
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    checkAdminAccess();
  }, []);

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
    // Fetch users
    const { data: usersData } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });
    if (usersData) setUsers(usersData);

    // Fetch conversations
    const { data: convsData } = await supabase
      .from('conversations')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
    if (convsData) setConversations(convsData);

    // Fetch activity logs
    const { data: logsData } = await supabase
      .from('activity_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
    if (logsData) setActivityLogs(logsData);

    // Calculate stats
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

  const exportToCSV = (data: any[], filename: string) => {
    if (data.length === 0) return;
    
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(obj => Object.values(obj).join(','));
    const csv = [headers, ...rows].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Exported",
      description: `${filename}.csv has been downloaded.`,
    });
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Verifying admin access...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
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
            <TabsList className="grid grid-cols-4 w-full max-w-2xl">
              <TabsTrigger value="users">
                <Users className="mr-2 h-4 w-4" />
                Users
              </TabsTrigger>
              <TabsTrigger value="conversations">
                <MessageSquare className="mr-2 h-4 w-4" />
                Conversations
              </TabsTrigger>
              <TabsTrigger value="logs">
                <Activity className="mr-2 h-4 w-4" />
                Activity Logs
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

                <ScrollArea className="h-[400px]">
                  <div className="space-y-2">
                    {users
                      .filter(u => u.email?.toLowerCase().includes(searchQuery.toLowerCase()))
                      .map((user) => (
                        <div
                          key={user.id}
                          className="flex items-center justify-between p-4 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                              <span className="text-primary font-bold">
                                {user.email?.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium">{user.email}</p>
                              <p className="text-sm text-muted-foreground">
                                Joined: {new Date(user.created_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">User</Badge>
                            <Button variant="ghost" size="icon">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
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
                  <h2 className="text-xl font-bold">Conversation Logs</h2>
                  <Button variant="outline" onClick={() => exportToCSV(conversations, 'conversations')}>
                    <Download className="mr-2 h-4 w-4" />
                    Export
                  </Button>
                </div>

                <ScrollArea className="h-[400px]">
                  <div className="space-y-2">
                    {conversations.map((conv) => (
                      <div
                        key={conv.id}
                        className="flex items-center justify-between p-4 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
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
                        <Button variant="ghost" size="icon">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </Card>
            </TabsContent>

            {/* Activity Logs Tab */}
            <TabsContent value="logs">
              <Card className="p-6 glass-panel">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold">Activity Logs</h2>
                  <Button variant="outline" onClick={() => exportToCSV(activityLogs, 'activity_logs')}>
                    <Download className="mr-2 h-4 w-4" />
                    Export
                  </Button>
                </div>

                <ScrollArea className="h-[400px]">
                  {activityLogs.length === 0 ? (
                    <div className="text-center py-12">
                      <Activity className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No activity logs yet.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {activityLogs.map((log) => (
                        <div
                          key={log.id}
                          className="flex items-center justify-between p-4 rounded-lg bg-secondary/50"
                        >
                          <div className="flex items-center gap-3">
                            <Activity className="w-5 h-5 text-primary" />
                            <div>
                              <p className="font-medium">{log.action}</p>
                              <p className="text-sm text-muted-foreground">
                                {new Date(log.created_at).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </Card>
            </TabsContent>

            {/* Settings Tab */}
            <TabsContent value="settings">
              <Card className="p-6 glass-panel">
                <h2 className="text-xl font-bold mb-6">System Settings</h2>
                
                <div className="space-y-6">
                  <div className="p-4 rounded-lg bg-secondary/50">
                    <h3 className="font-semibold mb-2">AI Configuration</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Configure AI model settings and behavior.
                    </p>
                    <Button variant="outline">Configure AI</Button>
                  </div>

                  <div className="p-4 rounded-lg bg-secondary/50">
                    <h3 className="font-semibold mb-2">Content Management</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Manage legal templates and case law database.
                    </p>
                    <Button variant="outline">Manage Content</Button>
                  </div>

                  <div className="p-4 rounded-lg bg-secondary/50">
                    <h3 className="font-semibold mb-2">Security Settings</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Configure security policies and access control.
                    </p>
                    <Button variant="outline">Security Settings</Button>
                  </div>
                </div>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

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
