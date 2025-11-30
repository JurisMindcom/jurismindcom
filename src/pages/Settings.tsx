import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Scale, ArrowLeft, User, Lock, Palette, Brain, LogOut, 
  Camera, Save, Loader2, Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Memory {
  id: string;
  content: string;
  created_at: string;
}

const personalityModes = [
  { id: 'default', name: 'Default', description: 'Balanced and professional' },
  { id: 'friendly', name: 'Friendly', description: 'Warm and approachable' },
  { id: 'professional', name: 'Professional', description: 'Formal and precise' },
  { id: 'candid', name: 'Candid', description: 'Direct and honest' },
  { id: 'efficient', name: 'Efficient', description: 'Brief and to-the-point' },
  { id: 'nerdy', name: 'Nerdy', description: 'Detailed and technical' },
];

const Settings = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  
  // Profile state
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [profession, setProfession] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [personalityMode, setPersonalityMode] = useState('default');
  
  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Memory state
  const [memories, setMemories] = useState<Memory[]>([]);
  const [newMemory, setNewMemory] = useState('');
  const [deleteMemoryId, setDeleteMemoryId] = useState<string | null>(null);

  useEffect(() => {
    checkAuthAndFetch();
  }, []);

  const checkAuthAndFetch = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      navigate('/auth');
      return;
    }
    
    setUserId(session.user.id);
    setEmail(session.user.email || '');
    
    // Fetch profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();
    
    if (profile) {
      setFullName(profile.full_name || '');
      setProfession(profile.profession || '');
      setAvatarUrl(profile.avatar_url || null);
      setPersonalityMode(profile.personality_mode || 'default');
    }
    
    // Fetch memories
    await fetchMemories(session.user.id);
    
    setIsLoading(false);
  };

  const fetchMemories = async (uid: string) => {
    const { data } = await supabase
      .from('user_memories')
      .select('*')
      .eq('user_id', uid)
      .order('created_at', { ascending: false });
    
    if (data) setMemories(data);
  };

  const handleSaveProfile = async () => {
    if (!userId) return;
    
    setIsSaving(true);
    
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: fullName,
        profession,
        personality_mode: personalityMode,
      })
      .eq('id', userId);
    
    if (error) {
      toast({
        title: "Error",
        description: "Failed to save profile.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Saved",
        description: "Profile updated successfully.",
      });
    }
    
    setIsSaving(false);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;

    const fileExt = file.name.split('.').pop();
    const filePath = `${userId}/avatar.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('user-documents')
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      toast({
        title: "Error",
        description: "Failed to upload avatar.",
        variant: "destructive",
      });
      return;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('user-documents')
      .getPublicUrl(filePath);

    await supabase
      .from('profiles')
      .update({ avatar_url: publicUrl })
      .eq('id', userId);

    setAvatarUrl(publicUrl);
    toast({
      title: "Uploaded",
      description: "Avatar updated successfully.",
    });
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords don't match.",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "Error",
        description: "Password must be at least 6 characters.",
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Password changed successfully.",
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    }
  };

  const handleAddMemory = async () => {
    if (!newMemory.trim() || !userId) return;

    const { data, error } = await supabase
      .from('user_memories')
      .insert({
        user_id: userId,
        content: newMemory.trim(),
      })
      .select()
      .single();

    if (data) {
      setMemories(prev => [data, ...prev]);
      setNewMemory('');
      toast({
        title: "Saved",
        description: "Memory saved successfully.",
      });
    }
  };

  const handleDeleteMemory = async () => {
    if (!deleteMemoryId) return;

    await supabase
      .from('user_memories')
      .delete()
      .eq('id', deleteMemoryId);

    setMemories(prev => prev.filter(m => m.id !== deleteMemoryId));
    setDeleteMemoryId(null);
    toast({
      title: "Deleted",
      description: "Memory deleted.",
    });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Logged out",
      description: "You've been logged out successfully.",
    });
    navigate('/auth');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass-panel border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/chat')}>
            <div className="p-2 rounded-lg bg-gradient-to-br from-primary to-primary-glow">
              <Scale className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-primary to-legal-gold bg-clip-text text-transparent">
              JurisMind
            </span>
          </div>
          <Button variant="ghost" onClick={() => navigate('/chat')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Chat
          </Button>
        </div>
      </nav>

      <div className="pt-24 pb-12 px-4">
        <div className="container mx-auto max-w-3xl">
          <motion.div
            className="mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h1 className="text-4xl font-bold mb-4">
              <span className="text-primary">Settings</span>
            </h1>
            <p className="text-muted-foreground">
              Manage your profile, preferences, and memories.
            </p>
          </motion.div>

          <Tabs defaultValue="profile" className="space-y-6">
            <TabsList className="grid grid-cols-4 w-full">
              <TabsTrigger value="profile">
                <User className="mr-2 h-4 w-4" />
                Profile
              </TabsTrigger>
              <TabsTrigger value="security">
                <Lock className="mr-2 h-4 w-4" />
                Security
              </TabsTrigger>
              <TabsTrigger value="personality">
                <Palette className="mr-2 h-4 w-4" />
                Style
              </TabsTrigger>
              <TabsTrigger value="memory">
                <Brain className="mr-2 h-4 w-4" />
                Memory
              </TabsTrigger>
            </TabsList>

            {/* Profile Tab */}
            <TabsContent value="profile">
              <Card className="p-6 glass-panel">
                <div className="flex flex-col items-center mb-6">
                  <div className="relative">
                    <Avatar className="w-24 h-24">
                      <AvatarImage src={avatarUrl || ''} />
                      <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                        {fullName?.charAt(0) || email?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <Button
                      size="icon"
                      variant="secondary"
                      className="absolute bottom-0 right-0 rounded-full"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Camera className="h-4 w-4" />
                    </Button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAvatarUpload}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label>Full Name</Label>
                    <Input
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Enter your full name"
                    />
                  </div>
                  
                  <div>
                    <Label>Email</Label>
                    <Input value={email} disabled />
                  </div>
                  
                  <div>
                    <Label>Profession</Label>
                    <Input
                      value={profession}
                      onChange={(e) => setProfession(e.target.value)}
                      placeholder="e.g., Lawyer, Student, Judge"
                    />
                  </div>

                  <Button
                    onClick={handleSaveProfile}
                    className="w-full glow-button bg-gradient-to-r from-primary to-primary-glow"
                    disabled={isSaving}
                  >
                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Save Profile
                  </Button>
                </div>
              </Card>
            </TabsContent>

            {/* Security Tab */}
            <TabsContent value="security">
              <Card className="p-6 glass-panel">
                <h2 className="text-xl font-bold mb-6">Change Password</h2>
                
                <div className="space-y-4">
                  <div>
                    <Label>New Password</Label>
                    <Input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password"
                    />
                  </div>
                  
                  <div>
                    <Label>Confirm Password</Label>
                    <Input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                    />
                  </div>

                  <Button
                    onClick={handleChangePassword}
                    className="w-full"
                    disabled={!newPassword || !confirmPassword}
                  >
                    <Lock className="mr-2 h-4 w-4" />
                    Change Password
                  </Button>
                </div>

                <div className="mt-8 pt-6 border-t border-border">
                  <Button
                    variant="destructive"
                    onClick={handleLogout}
                    className="w-full"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                  </Button>
                </div>
              </Card>
            </TabsContent>

            {/* Personality Tab */}
            <TabsContent value="personality">
              <Card className="p-6 glass-panel">
                <h2 className="text-xl font-bold mb-6">Response Style</h2>
                <p className="text-muted-foreground mb-6">
                  Choose how JurisMind responds to you.
                </p>
                
                <RadioGroup value={personalityMode} onValueChange={setPersonalityMode}>
                  <div className="space-y-3">
                    {personalityModes.map((mode) => (
                      <div
                        key={mode.id}
                        className={`flex items-center space-x-3 p-4 rounded-lg border transition-colors cursor-pointer ${
                          personalityMode === mode.id ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'
                        }`}
                        onClick={() => setPersonalityMode(mode.id)}
                      >
                        <RadioGroupItem value={mode.id} id={mode.id} />
                        <div className="flex-1">
                          <Label htmlFor={mode.id} className="font-medium cursor-pointer">
                            {mode.name}
                          </Label>
                          <p className="text-sm text-muted-foreground">{mode.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </RadioGroup>

                <Button
                  onClick={handleSaveProfile}
                  className="w-full mt-6 glow-button bg-gradient-to-r from-primary to-primary-glow"
                  disabled={isSaving}
                >
                  {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Save Style
                </Button>
              </Card>
            </TabsContent>

            {/* Memory Tab */}
            <TabsContent value="memory">
              <Card className="p-6 glass-panel">
                <h2 className="text-xl font-bold mb-6">Your Memories</h2>
                <p className="text-muted-foreground mb-6">
                  Save information for JurisMind to remember about you.
                </p>
                
                <div className="space-y-4 mb-6">
                  <Textarea
                    placeholder="Add something for JurisMind to remember..."
                    value={newMemory}
                    onChange={(e) => setNewMemory(e.target.value)}
                    rows={3}
                  />
                  <Button
                    onClick={handleAddMemory}
                    disabled={!newMemory.trim()}
                    className="w-full"
                  >
                    <Brain className="mr-2 h-4 w-4" />
                    Save to Memory
                  </Button>
                </div>

                <ScrollArea className="h-[300px]">
                  <div className="space-y-3">
                    {memories.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">
                        No memories saved yet.
                      </p>
                    ) : (
                      memories.map((memory) => (
                        <div
                          key={memory.id}
                          className="p-4 rounded-lg bg-secondary/50 flex items-start gap-3"
                        >
                          <Brain className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <p className="text-sm">{memory.content}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(memory.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => setDeleteMemoryId(memory.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-border">
        <div className="container mx-auto text-center">
          <p className="text-muted-foreground">
            <span className="font-bold text-primary">JurisMind</span> — Created by RONY
          </p>
        </div>
      </footer>

      {/* Delete Memory Dialog */}
      <AlertDialog open={!!deleteMemoryId} onOpenChange={() => setDeleteMemoryId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Memory?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteMemory} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Settings;
