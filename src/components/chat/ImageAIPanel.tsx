import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ImageIcon, Wand2, Scan, Edit3, X, Loader2, Download, 
  ChevronDown, ChevronUp, Sparkles 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import useImageAI from '@/hooks/useImageAI';

interface ImageAIPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onImageGenerated?: (imageUrl: string, description: string) => void;
  onImageAnalyzed?: (analysis: string) => void;
}

const ImageAIPanel = ({ isOpen, onClose, onImageGenerated, onImageAnalyzed }: ImageAIPanelProps) => {
  const { toast } = useToast();
  const { isProcessing, currentAction, generateImage, analyzeImage, editImage, fileToBase64 } = useImageAI();
  
  const [generatePrompt, setGeneratePrompt] = useState('');
  const [analyzeImage64, setAnalyzeImage64] = useState<string | null>(null);
  const [analyzePrompt, setAnalyzePrompt] = useState('');
  const [editImage64, setEditImage64] = useState<string | null>(null);
  const [editInstructions, setEditInstructions] = useState('');
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [editedImage, setEditedImage] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    setImage: (url: string | null) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({ title: 'Invalid File', description: 'Please upload an image file.', variant: 'destructive' });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({ title: 'File Too Large', description: 'Maximum file size is 10MB.', variant: 'destructive' });
      return;
    }

    const base64 = await fileToBase64(file);
    setImage(base64);
  };

  const handleGenerate = async () => {
    if (!generatePrompt.trim()) return;
    
    const result = await generateImage(generatePrompt);
    if (result?.imageUrl) {
      setGeneratedImage(result.imageUrl);
      onImageGenerated?.(result.imageUrl, result.description || generatePrompt);
    }
  };

  const handleAnalyze = async () => {
    if (!analyzeImage64) return;
    
    const result = await analyzeImage(analyzeImage64, analyzePrompt);
    if (result?.analysis) {
      setAnalysisResult(result.analysis);
      onImageAnalyzed?.(result.analysis);
    }
  };

  const handleEdit = async () => {
    if (!editImage64 || !editInstructions.trim()) return;
    
    const result = await editImage(editImage64, editInstructions);
    if (result?.imageUrl) {
      setEditedImage(result.imageUrl);
    }
  };

  const downloadImage = (dataUrl: string, filename: string) => {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename;
    link.click();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="fixed bottom-24 right-4 z-50 w-96 max-w-[calc(100vw-2rem)]"
      >
        <Card className="glass-panel border-pink-500/20 overflow-hidden">
          {/* Header */}
          <div 
            className="p-4 bg-gradient-to-r from-pink-500/20 to-purple-600/20 border-b border-pink-500/20 cursor-pointer"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-gradient-to-br from-pink-500 to-purple-600">
                  <ImageIcon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold">Image AI</h3>
                  <p className="text-xs text-muted-foreground">Generate, Analyze, Edit</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); onClose(); }}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Content */}
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="p-4">
                  <Tabs defaultValue="generate" className="w-full">
                    <TabsList className="grid grid-cols-3 w-full mb-4">
                      <TabsTrigger value="generate" className="text-xs">
                        <Wand2 className="w-3 h-3 mr-1" />
                        Generate
                      </TabsTrigger>
                      <TabsTrigger value="analyze" className="text-xs">
                        <Scan className="w-3 h-3 mr-1" />
                        Analyze
                      </TabsTrigger>
                      <TabsTrigger value="edit" className="text-xs">
                        <Edit3 className="w-3 h-3 mr-1" />
                        Edit
                      </TabsTrigger>
                    </TabsList>

                    {/* Generate Tab */}
                    <TabsContent value="generate" className="space-y-3">
                      <Textarea
                        placeholder="Describe the image you want to generate..."
                        value={generatePrompt}
                        onChange={(e) => setGeneratePrompt(e.target.value)}
                        className="min-h-[80px] resize-none text-sm"
                      />
                      <Button
                        onClick={handleGenerate}
                        disabled={!generatePrompt.trim() || isProcessing}
                        className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700"
                      >
                        {isProcessing && currentAction === 'generate' ? (
                          <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating...</>
                        ) : (
                          <><Sparkles className="w-4 h-4 mr-2" />Generate Image</>
                        )}
                      </Button>
                      
                      {generatedImage && (
                        <div className="relative">
                          <img src={generatedImage} alt="Generated" className="w-full rounded-lg" />
                          <Button
                            size="sm"
                            variant="secondary"
                            className="absolute top-2 right-2"
                            onClick={() => downloadImage(generatedImage, 'generated-image.png')}
                          >
                            <Download className="w-3 h-3 mr-1" />
                            Save
                          </Button>
                        </div>
                      )}
                    </TabsContent>

                    {/* Analyze Tab */}
                    <TabsContent value="analyze" className="space-y-3">
                      {!analyzeImage64 ? (
                        <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-pink-500/30 rounded-lg cursor-pointer hover:bg-pink-500/5 transition-colors">
                          <ImageIcon className="w-8 h-8 text-pink-500 mb-2" />
                          <span className="text-xs text-muted-foreground">Upload image to analyze</span>
                          <input
                            type="file"
                            className="hidden"
                            accept="image/*"
                            onChange={(e) => handleFileUpload(e, setAnalyzeImage64)}
                          />
                        </label>
                      ) : (
                        <div className="relative">
                          <img src={analyzeImage64} alt="To analyze" className="w-full rounded-lg max-h-32 object-cover" />
                          <Button
                            size="icon"
                            variant="secondary"
                            className="absolute top-2 right-2 h-6 w-6"
                            onClick={() => setAnalyzeImage64(null)}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      )}
                      
                      <Input
                        placeholder="Optional: What to analyze? (leave empty for general)"
                        value={analyzePrompt}
                        onChange={(e) => setAnalyzePrompt(e.target.value)}
                        className="text-sm"
                      />
                      
                      <Button
                        onClick={handleAnalyze}
                        disabled={!analyzeImage64 || isProcessing}
                        className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700"
                      >
                        {isProcessing && currentAction === 'analyze' ? (
                          <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Analyzing...</>
                        ) : (
                          <><Scan className="w-4 h-4 mr-2" />Analyze Image</>
                        )}
                      </Button>
                      
                      {analysisResult && (
                        <div className="p-3 bg-secondary/50 rounded-lg max-h-40 overflow-y-auto">
                          <p className="text-xs whitespace-pre-wrap">{analysisResult}</p>
                        </div>
                      )}
                    </TabsContent>

                    {/* Edit Tab */}
                    <TabsContent value="edit" className="space-y-3">
                      {!editImage64 ? (
                        <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-pink-500/30 rounded-lg cursor-pointer hover:bg-pink-500/5 transition-colors">
                          <ImageIcon className="w-8 h-8 text-pink-500 mb-2" />
                          <span className="text-xs text-muted-foreground">Upload image to edit</span>
                          <input
                            type="file"
                            className="hidden"
                            accept="image/*"
                            onChange={(e) => handleFileUpload(e, setEditImage64)}
                          />
                        </label>
                      ) : (
                        <div className="relative">
                          <img src={editImage64} alt="To edit" className="w-full rounded-lg max-h-32 object-cover" />
                          <Button
                            size="icon"
                            variant="secondary"
                            className="absolute top-2 right-2 h-6 w-6"
                            onClick={() => setEditImage64(null)}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      )}
                      
                      <Textarea
                        placeholder="Describe how to edit the image..."
                        value={editInstructions}
                        onChange={(e) => setEditInstructions(e.target.value)}
                        className="min-h-[60px] resize-none text-sm"
                      />
                      
                      <Button
                        onClick={handleEdit}
                        disabled={!editImage64 || !editInstructions.trim() || isProcessing}
                        className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700"
                      >
                        {isProcessing && currentAction === 'edit' ? (
                          <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Editing...</>
                        ) : (
                          <><Edit3 className="w-4 h-4 mr-2" />Edit Image</>
                        )}
                      </Button>
                      
                      {editedImage && (
                        <div className="relative">
                          <img src={editedImage} alt="Edited" className="w-full rounded-lg" />
                          <Button
                            size="sm"
                            variant="secondary"
                            className="absolute top-2 right-2"
                            onClick={() => downloadImage(editedImage, 'edited-image.png')}
                          >
                            <Download className="w-3 h-3 mr-1" />
                            Save
                          </Button>
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
};

export default ImageAIPanel;
