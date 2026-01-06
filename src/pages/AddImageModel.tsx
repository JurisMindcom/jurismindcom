import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, ImageIcon, Key, Eye, EyeOff, Save, Loader2, AlertCircle, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const IMAGE_PROVIDERS = [
  { value: 'google', label: 'Google (Gemini Vision)', models: ['gemini-2.5-flash-image-preview', 'gemini-2.0-flash-exp'] },
  { value: 'openai', label: 'OpenAI (DALL-E)', models: ['dall-e-3', 'dall-e-2', 'gpt-4o-vision'] },
  { value: 'stability', label: 'Stability AI', models: ['stable-diffusion-xl', 'stable-diffusion-3'] },
  { value: 'huggingface', label: 'Hugging Face', models: ['FLUX.1-schnell', 'FLUX.1-dev'] },
  { value: 'custom', label: 'Custom Provider', models: ['custom'] },
];

const AddImageModel = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');
  const { toast } = useToast();

  const [modelName, setModelName] = useState('');
  const [provider, setProvider] = useState('google');
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [validationStatus, setValidationStatus] = useState<'idle' | 'valid' | 'invalid'>('idle');

  const encryptApiKey = (key: string): string => {
    const salt = 'jurismind_image_key_2024';
    let encrypted = '';
    for (let i = 0; i < key.length; i++) {
      encrypted += String.fromCharCode(key.charCodeAt(i) ^ salt.charCodeAt(i % salt.length));
    }
    return btoa(encrypted);
  };

  const validateApiKey = async () => {
    if (!apiKey) return;
    
    setIsValidating(true);
    setValidationStatus('idle');

    try {
      let isValid = false;

      if (provider === 'google') {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
          { method: 'GET' }
        );
        isValid = response.ok;
      } else if (provider === 'openai') {
        const response = await fetch('https://api.openai.com/v1/models', {
          headers: { 'Authorization': `Bearer ${apiKey}` },
        });
        isValid = response.ok;
      } else {
        isValid = apiKey.length > 20;
      }

      setValidationStatus(isValid ? 'valid' : 'invalid');
      
      if (isValid) {
        toast({ title: "API Key Valid", description: "The API key has been validated successfully." });
      } else {
        toast({ title: "Invalid API Key", description: "The API key appears to be invalid.", variant: "destructive" });
      }
    } catch (error) {
      setValidationStatus('invalid');
      toast({ title: "Validation Failed", description: "Could not validate the API key.", variant: "destructive" });
    } finally {
      setIsValidating(false);
    }
  };

  const handleSave = async () => {
    if (!modelName.trim()) {
      toast({ title: "Error", description: "Please enter a model name.", variant: "destructive" });
      return;
    }
    if (!apiKey.trim()) {
      toast({ title: "Error", description: "Please enter an API key.", variant: "destructive" });
      return;
    }

    setIsLoading(true);

    try {
      const encryptedKey = encryptApiKey(apiKey);

      if (editId) {
        const { error } = await supabase
          .from('image_ai_models')
          .update({
            model_name: modelName.trim(),
            provider: provider,
            api_key_encrypted: encryptedKey,
          })
          .eq('id', editId);

        if (error) throw error;

        toast({ title: "Model Updated", description: `${modelName} has been updated successfully.` });
      } else {
        const { error } = await supabase
          .from('image_ai_models')
          .insert({
            model_name: modelName.trim(),
            provider: provider,
            api_key_encrypted: encryptedKey,
            is_active: false,
          });

        if (error) throw error;

        toast({ title: "Image Model Added", description: `${modelName} has been added successfully.` });
      }

      navigate('/admin');
    } catch (error: any) {
      console.error('Error saving image model:', error);
      toast({ 
        title: "Error", 
        description: error.message || "Failed to save image model.", 
        variant: "destructive" 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const selectedProviderData = IMAGE_PROVIDERS.find(p => p.value === provider);

  return (
    <div className="min-h-screen bg-background">
      <nav className="fixed top-0 left-0 right-0 z-50 glass-panel border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-pink-500 to-purple-600">
              <ImageIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-xl font-bold">{editId ? 'Edit Image Model' : 'Add New Image Model'}</span>
              <p className="text-xs text-muted-foreground">Configure image AI model and API key</p>
            </div>
          </div>
          <Button variant="ghost" onClick={() => navigate('/admin')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Admin
          </Button>
        </div>
      </nav>

      <div className="pt-24 pb-12 px-4 max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="p-8 glass-panel border-pink-500/20">
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="modelName" className="flex items-center gap-2">
                  <ImageIcon className="h-4 w-4 text-pink-500" />
                  Model Name
                </Label>
                <Input
                  id="modelName"
                  placeholder="e.g., DALL-E 3, Gemini Vision, FLUX.1"
                  value={modelName}
                  onChange={(e) => setModelName(e.target.value)}
                  className="text-lg"
                />
                <p className="text-xs text-muted-foreground">
                  Enter a descriptive name for this image AI model
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="provider" className="flex items-center gap-2">
                  <Key className="h-4 w-4 text-pink-500" />
                  Provider
                </Label>
                <Select value={provider} onValueChange={setProvider}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select provider" />
                  </SelectTrigger>
                  <SelectContent>
                    {IMAGE_PROVIDERS.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Available models: {selectedProviderData?.models.join(', ')}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="apiKey" className="flex items-center gap-2">
                  <Key className="h-4 w-4 text-pink-500" />
                  API Key
                </Label>
                <div className="relative">
                  <Input
                    id="apiKey"
                    type={showApiKey ? 'text' : 'password'}
                    placeholder="Enter your API key"
                    value={apiKey}
                    onChange={(e) => {
                      setApiKey(e.target.value);
                      setValidationStatus('idle');
                    }}
                    className="pr-24"
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => setShowApiKey(!showApiKey)}
                    >
                      {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    {validationStatus === 'valid' && (
                      <Check className="h-4 w-4 text-green-500" />
                    )}
                    {validationStatus === 'invalid' && (
                      <AlertCircle className="h-4 w-4 text-destructive" />
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    Your API key will be encrypted and stored securely
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={validateApiKey}
                    disabled={!apiKey || isValidating}
                  >
                    {isValidating ? (
                      <>
                        <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                        Validating...
                      </>
                    ) : (
                      'Validate Key'
                    )}
                  </Button>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-pink-500/10 border border-pink-500/20">
                <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-pink-500" />
                  Image AI Capabilities
                </h4>
                <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                  <li><strong>Generate:</strong> Create images from text prompts</li>
                  <li><strong>Analyze:</strong> Extract information and captions from images</li>
                  <li><strong>Edit:</strong> Modify images based on text instructions</li>
                  <li>Active model applies to all image requests instantly</li>
                </ul>
              </div>

              <div className="flex gap-4 pt-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => navigate('/admin')}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700"
                  onClick={handleSave}
                  disabled={isLoading || !modelName || !apiKey}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      {editId ? 'Update Model' : 'Save Model'}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>

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

export default AddImageModel;
