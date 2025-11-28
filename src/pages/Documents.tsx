import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Scale, ArrowLeft, FileText, Download, Trash2, Eye, 
  Upload, Search, FolderOpen, File, Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Document {
  id: string;
  filename: string;
  file_type: string;
  file_size: number;
  created_at: string;
  storage_path: string;
}

const Documents = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

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
    await fetchDocuments(session.user.id);
  };

  const fetchDocuments = async (uid: string) => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('user_id', uid)
      .order('created_at', { ascending: false });

    if (data) {
      setDocuments(data);
    }
    setIsLoading(false);
  };

  const handleDelete = async (docId: string) => {
    const { error } = await supabase
      .from('documents')
      .delete()
      .eq('id', docId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete document.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Deleted",
        description: "Document has been deleted.",
      });
      setDocuments(docs => docs.filter(d => d.id !== docId));
    }
  };

  const handleDownload = (doc: Document) => {
    toast({
      title: "Downloading",
      description: `Downloading ${doc.filename}...`,
    });
    // In a real implementation, you would download from Supabase storage
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.includes('pdf')) return '📄';
    if (fileType.includes('word') || fileType.includes('doc')) return '📝';
    if (fileType.includes('image')) return '🖼️';
    return '📁';
  };

  const filteredDocs = documents.filter(doc =>
    doc.filename.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
        <div className="container mx-auto max-w-5xl">
          {/* Header */}
          <motion.div
            className="mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h1 className="text-4xl font-bold mb-4">
              My <span className="text-primary">Documents</span>
            </h1>
            <p className="text-muted-foreground">
              Manage your uploaded documents and AI-generated files.
            </p>
          </motion.div>

          {/* Search and Upload */}
          <motion.div
            className="flex flex-col sm:flex-row gap-4 mb-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search documents..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button
              className="glow-button bg-gradient-to-r from-primary to-primary-glow"
              onClick={() => toast({ title: "Upload", description: "Upload feature coming soon!" })}
            >
              <Upload className="mr-2 h-4 w-4" />
              Upload Document
            </Button>
          </motion.div>

          {/* Documents List */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : filteredDocs.length === 0 ? (
            <motion.div
              className="text-center py-16"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <div className="p-6 rounded-full bg-primary/10 w-fit mx-auto mb-6">
                <FolderOpen className="w-12 h-12 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-2">No Documents Yet</h3>
              <p className="text-muted-foreground mb-6">
                Upload documents or generate legal drafts to see them here.
              </p>
              <Button onClick={() => navigate('/chat')}>
                Go to Chat
              </Button>
            </motion.div>
          ) : (
            <div className="space-y-4">
              {filteredDocs.map((doc, index) => (
                <motion.div
                  key={doc.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="p-4 glass-panel hover:border-primary/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="text-3xl">{getFileIcon(doc.file_type)}</div>
                      
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold truncate">{doc.filename}</h3>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          <span>{formatFileSize(doc.file_size)}</span>
                          <span>•</span>
                          <span>{new Date(doc.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>

                      <Badge variant="outline">{doc.file_type}</Badge>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDownload(doc)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Document?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete "{doc.filename}"? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(doc.id)}
                                className="bg-destructive text-destructive-foreground"
                              >
                                Delete Forever
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
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
    </div>
  );
};

export default Documents;
