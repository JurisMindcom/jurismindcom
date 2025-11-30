import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Scale, ArrowLeft, FileText, Download, Trash2, Eye, 
  Upload, Search, FolderOpen, Loader2, X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [previewDoc, setPreviewDoc] = useState<Document | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [deleteDoc, setDeleteDoc] = useState<Document | null>(null);

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
    const { data } = await supabase
      .from('documents')
      .select('*')
      .eq('user_id', uid)
      .order('created_at', { ascending: false });

    if (data) setDocuments(data);
    setIsLoading(false);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;

    if (file.size > 20 * 1024 * 1024) {
      toast({ title: "File too large", description: "Maximum file size is 20MB.", variant: "destructive" });
      return;
    }

    setIsUploading(true);
    const fileName = `${Date.now()}-${file.name}`;
    const filePath = `${userId}/${fileName}`;

    try {
      const { error: uploadError } = await supabase.storage
        .from('user-documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data, error } = await supabase.from('documents').insert({
        user_id: userId,
        filename: file.name,
        file_type: file.type || 'application/octet-stream',
        file_size: file.size,
        storage_path: filePath,
      }).select().single();

      if (data) {
        setDocuments(prev => [data, ...prev]);
        toast({ title: "Uploaded", description: `${file.name} uploaded successfully.` });
      }
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    }
    
    setIsUploading(false);
  };

  const handleDelete = async () => {
    if (!deleteDoc) return;

    // Delete from storage
    await supabase.storage.from('user-documents').remove([deleteDoc.storage_path]);
    
    // Delete from database
    const { error } = await supabase.from('documents').delete().eq('id', deleteDoc.id);

    if (!error) {
      setDocuments(docs => docs.filter(d => d.id !== deleteDoc.id));
      toast({ title: "Deleted", description: "Document has been deleted." });
    }
    setDeleteDoc(null);
  };

  const handleDownload = async (doc: Document) => {
    const { data, error } = await supabase.storage
      .from('user-documents')
      .download(doc.storage_path);

    if (data) {
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.filename;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "Downloaded", description: `${doc.filename} downloaded.` });
    }
  };

  const handlePreview = async (doc: Document) => {
    const { data } = await supabase.storage
      .from('user-documents')
      .download(doc.storage_path);

    if (data) {
      const url = URL.createObjectURL(data);
      setPreviewUrl(url);
      setPreviewDoc(doc);
    }
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
    if (fileType.includes('excel') || fileType.includes('spreadsheet')) return '📊';
    return '📁';
  };

  const filteredDocs = documents.filter(doc =>
    doc.filename.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
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
          <motion.div className="mb-8" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="text-4xl font-bold mb-4">My <span className="text-primary">Documents</span></h1>
            <p className="text-muted-foreground">Manage your uploaded documents and AI-generated files.</p>
          </motion.div>

          <motion.div className="flex flex-col sm:flex-row gap-4 mb-8" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search documents..." className="pl-10" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>
            <Button className="glow-button bg-gradient-to-r from-primary to-primary-glow" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
              {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
              Upload Document
            </Button>
            <input ref={fileInputRef} type="file" className="hidden" onChange={handleUpload} accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.xlsx,.xls,.zip" />
          </motion.div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : filteredDocs.length === 0 ? (
            <motion.div className="text-center py-16" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className="p-6 rounded-full bg-primary/10 w-fit mx-auto mb-6">
                <FolderOpen className="w-12 h-12 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-2">No Documents Yet</h3>
              <p className="text-muted-foreground mb-6">Upload documents or generate legal drafts to see them here.</p>
              <Button onClick={() => navigate('/chat')}>Go to Chat</Button>
            </motion.div>
          ) : (
            <div className="space-y-4">
              {filteredDocs.map((doc, index) => (
                <motion.div key={doc.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}>
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

                      <Badge variant="outline">{doc.file_type.split('/')[1] || doc.file_type}</Badge>

                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handlePreview(doc)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDownload(doc)}>
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => setDeleteDoc(doc)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      <footer className="py-8 px-4 border-t border-border">
        <div className="container mx-auto text-center">
          <p className="text-muted-foreground">
            <span className="font-bold text-primary">JurisMind</span> — Created by RONY
          </p>
        </div>
      </footer>

      {/* Preview Dialog */}
      <Dialog open={!!previewDoc} onOpenChange={() => { setPreviewDoc(null); if (previewUrl) URL.revokeObjectURL(previewUrl); setPreviewUrl(null); }}>
        <DialogContent className="max-w-4xl h-[80vh]">
          <DialogHeader>
            <DialogTitle>{previewDoc?.filename}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto">
            {previewUrl && previewDoc && (
              previewDoc.file_type.includes('image') ? (
                <img src={previewUrl} alt={previewDoc.filename} className="max-w-full mx-auto" />
              ) : previewDoc.file_type.includes('pdf') ? (
                <iframe src={previewUrl} className="w-full h-full min-h-[60vh]" />
              ) : (
                <div className="text-center py-12">
                  <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Preview not available for this file type.</p>
                  <Button className="mt-4" onClick={() => previewDoc && handleDownload(previewDoc)}>
                    <Download className="mr-2 h-4 w-4" />
                    Download to View
                  </Button>
                </div>
              )
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteDoc} onOpenChange={() => setDeleteDoc(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteDoc?.filename}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete Forever
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Documents;
