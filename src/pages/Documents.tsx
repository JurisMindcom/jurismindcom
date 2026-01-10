import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Scale, ArrowLeft, FileText, Download, Trash2, Eye, 
  Upload, Search, FolderOpen, Loader2, ImageIcon, Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import PDFViewer from '@/components/PDFViewer';

interface Document {
  id: string;
  filename: string;
  file_type: string;
  file_size: number;
  created_at: string;
  storage_path: string;
  is_generated?: boolean;
  generation_prompt?: string;
  aspect_ratio?: string;
}

const Documents = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [generatedImages, setGeneratedImages] = useState<Document[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [previewDoc, setPreviewDoc] = useState<Document | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [deleteDoc, setDeleteDoc] = useState<Document | null>(null);
  const [activeTab, setActiveTab] = useState('documents');

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
    
    // Fetch regular documents (not generated)
    const { data: docs } = await supabase
      .from('documents')
      .select('*')
      .eq('user_id', uid)
      .or('is_generated.is.null,is_generated.eq.false')
      .order('created_at', { ascending: false });

    // Fetch generated images
    const { data: genImages } = await supabase
      .from('documents')
      .select('*')
      .eq('user_id', uid)
      .eq('is_generated', true)
      .order('created_at', { ascending: false });

    if (docs) setDocuments(docs);
    if (genImages) setGeneratedImages(genImages);
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

      let extractedText = null;
      if (file.name.toLowerCase().endsWith('.txt')) {
        extractedText = await file.text();
      }

      const detectLang = (text: string): string => {
        if (!text || text.length < 10) return 'unknown';
        const banglaPat = /[\u0980-\u09FF]/;
        const englishPat = /[a-zA-Z]/;
        const hasBangla = banglaPat.test(text);
        const hasEnglish = englishPat.test(text);
        if (hasBangla && hasEnglish) return 'mixed';
        if (hasBangla) return 'bangla';
        if (hasEnglish) return 'english';
        return 'unknown';
      };

      const { data, error } = await supabase.from('documents').insert({
        user_id: userId,
        filename: file.name,
        file_type: file.type || 'application/octet-stream',
        file_size: file.size,
        storage_path: filePath,
        extracted_text: extractedText,
        language: extractedText ? detectLang(extractedText) : 'unknown',
        is_generated: false,
      }).select().single();

      if (!extractedText && data) {
        supabase.functions.invoke('process-document', {
          body: { documentId: data.id, storagePath: filePath }
        }).catch(err => console.error('Background processing error:', err));
      }

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

    // Determine bucket based on whether it's generated
    const bucket = deleteDoc.is_generated ? 'generated-images' : 'user-documents';
    
    await supabase.storage.from(bucket).remove([deleteDoc.storage_path]);
    const { error } = await supabase.from('documents').delete().eq('id', deleteDoc.id);

    if (!error) {
      if (deleteDoc.is_generated) {
        setGeneratedImages(imgs => imgs.filter(d => d.id !== deleteDoc.id));
      } else {
        setDocuments(docs => docs.filter(d => d.id !== deleteDoc.id));
      }
      toast({ title: "Deleted", description: "Item has been deleted." });
    }
    setDeleteDoc(null);
  };

  const handleDownload = async (doc: Document) => {
    try {
      const bucket = doc.is_generated ? 'generated-images' : 'user-documents';
      const { data, error } = await supabase.storage
        .from(bucket)
        .download(doc.storage_path);

      if (error) throw error;

      if (data) {
        const url = URL.createObjectURL(data);
        const a = document.createElement('a');
        a.href = url;
        a.download = doc.filename;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        // Delay revoke to ensure download starts on mobile
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        toast({ title: "Downloaded", description: `${doc.filename} downloaded.` });
      }
    } catch (err: any) {
      console.error('Download error:', err);
      // Fallback: try to open public URL in new tab
      try {
        const bucket = doc.is_generated ? 'generated-images' : 'user-documents';
        const { data } = supabase.storage.from(bucket).getPublicUrl(doc.storage_path);
        if (data?.publicUrl) {
          window.open(data.publicUrl, '_blank');
          toast({ title: "Opening file", description: "File opened in new tab." });
        }
      } catch {
        toast({ title: "Download failed", description: err.message || "Could not download file.", variant: "destructive" });
      }
    }
  };

  const handlePreview = async (doc: Document) => {
    const bucket = doc.is_generated ? 'generated-images' : 'user-documents';
    
    if (doc.is_generated) {
      // For generated images, use public URL directly
      const { data } = supabase.storage.from(bucket).getPublicUrl(doc.storage_path);
      setPreviewUrl(data.publicUrl);
      setPreviewDoc(doc);
    } else {
      const { data } = await supabase.storage.from(bucket).download(doc.storage_path);
      if (data) {
        const url = URL.createObjectURL(data);
        setPreviewUrl(url);
        setPreviewDoc(doc);
      }
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

  const filteredImages = generatedImages.filter(img =>
    img.filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (img.generation_prompt && img.generation_prompt.toLowerCase().includes(searchQuery.toLowerCase()))
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
            <h1 className="text-4xl font-bold mb-4">My <span className="text-primary">Files</span></h1>
            <p className="text-muted-foreground">Manage your uploaded documents and AI-generated images.</p>
          </motion.div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="documents" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Documents ({documents.length})
              </TabsTrigger>
              <TabsTrigger value="generated" className="flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                Generated Images ({generatedImages.length})
              </TabsTrigger>
            </TabsList>

            <motion.div className="flex flex-col sm:flex-row gap-4 mb-8" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder={activeTab === 'documents' ? "Search documents..." : "Search by filename or prompt..."} 
                  className="pl-10" 
                  value={searchQuery} 
                  onChange={(e) => setSearchQuery(e.target.value)} 
                />
              </div>
              {activeTab === 'documents' && (
                <Button className="glow-button bg-gradient-to-r from-primary to-primary-glow" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
                  {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                  Upload Document
                </Button>
              )}
              <input ref={fileInputRef} type="file" className="hidden" onChange={handleUpload} accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.xlsx,.xls,.zip" />
            </motion.div>

            <TabsContent value="documents">
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
                  <p className="text-muted-foreground mb-6">Upload documents to see them here.</p>
                  <Button onClick={() => fileInputRef.current?.click()}>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload Document
                  </Button>
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
            </TabsContent>

            <TabsContent value="generated">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : filteredImages.length === 0 ? (
                <motion.div className="text-center py-16" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <div className="p-6 rounded-full bg-primary/10 w-fit mx-auto mb-6">
                    <ImageIcon className="w-12 h-12 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">No Generated Images Yet</h3>
                  <p className="text-muted-foreground mb-6">Use Image AI in chat to generate images.</p>
                  <Button onClick={() => navigate('/chat')}>Go to Chat</Button>
                </motion.div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredImages.map((img, index) => (
                    <motion.div key={img.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: index * 0.05 }}>
                      <Card className="overflow-hidden glass-panel hover:border-primary/50 transition-colors group cursor-pointer" onClick={() => handlePreview(img)}>
                        <div className="aspect-square relative bg-muted">
                          <img 
                            src={supabase.storage.from('generated-images').getPublicUrl(img.storage_path).data.publicUrl}
                            alt={img.generation_prompt || img.filename}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                            <div className="flex gap-2">
                              <Button size="sm" variant="secondary" onClick={(e) => { e.stopPropagation(); handleDownload(img); }}>
                                <Download className="h-3 w-3 mr-1" />
                                Download
                              </Button>
                              <Button size="sm" variant="destructive" onClick={(e) => { e.stopPropagation(); setDeleteDoc(img); }}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                        <div className="p-3">
                          <p className="text-sm font-medium truncate">{img.generation_prompt || img.filename}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                            <span>{new Date(img.created_at).toLocaleDateString()}</span>
                            {img.aspect_ratio && (
                              <>
                                <span>•</span>
                                <Badge variant="outline" className="text-xs">{img.aspect_ratio}</Badge>
                              </>
                            )}
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
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
      <Dialog open={!!previewDoc} onOpenChange={() => { setPreviewDoc(null); if (previewUrl && !previewDoc?.is_generated) URL.revokeObjectURL(previewUrl); setPreviewUrl(null); }}>
        <DialogContent className="max-w-4xl h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {previewDoc?.is_generated && <Sparkles className="h-4 w-4 text-primary" />}
              {previewDoc?.filename}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden">
            {previewUrl && previewDoc && (
              previewDoc.file_type.includes('image') || previewDoc.is_generated ? (
                <div className="h-full overflow-auto flex flex-col items-center justify-center gap-4">
                  <img src={previewUrl} alt={previewDoc.filename} className="max-w-full max-h-[70vh] object-contain rounded-lg" />
                  {previewDoc.generation_prompt && (
                    <div className="text-center max-w-lg">
                      <p className="text-sm text-muted-foreground">
                        <strong>Prompt:</strong> {previewDoc.generation_prompt}
                      </p>
                    </div>
                  )}
                  <Button onClick={() => handleDownload(previewDoc)}>
                    <Download className="mr-2 h-4 w-4" />
                    Download Image
                  </Button>
                </div>
              ) : previewDoc.file_type.includes('pdf') ? (
                <PDFViewer url={previewUrl} filename={previewDoc.filename} />
              ) : previewDoc.file_type.includes('text') || previewDoc.filename.endsWith('.txt') ? (
                <iframe src={previewUrl} className="w-full h-full border-0" />
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
            <AlertDialogTitle>Delete {deleteDoc?.is_generated ? 'Image' : 'Document'}?</AlertDialogTitle>
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