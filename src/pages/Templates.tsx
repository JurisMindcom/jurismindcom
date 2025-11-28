import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Scale, ArrowLeft, FileText, Download, Search, Filter,
  File, FileCheck, FileWarning, Briefcase, Home as HomeIcon, Users, Heart
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Template {
  id: string;
  template_name: string;
  template_name_bn: string | null;
  category: string;
  template_type: string;
  template_content: string;
  tags: string[] | null;
}

const templateCategories = [
  { id: 'all', name: 'All Templates', icon: FileText },
  { id: 'criminal', name: 'Criminal Law', icon: FileWarning },
  { id: 'civil', name: 'Civil Law', icon: FileCheck },
  { id: 'property', name: 'Property', icon: HomeIcon },
  { id: 'family', name: 'Family Law', icon: Heart },
  { id: 'business', name: 'Business', icon: Briefcase },
  { id: 'employment', name: 'Employment', icon: Users },
];

const sampleTemplates: Template[] = [
  {
    id: '1',
    template_name: 'First Information Report (FIR)',
    template_name_bn: 'প্রথম তথ্য প্রতিবেদন',
    category: 'criminal',
    template_type: 'FIR',
    template_content: 'FIR template content...',
    tags: ['criminal', 'police', 'complaint'],
  },
  {
    id: '2',
    template_name: 'Legal Notice',
    template_name_bn: 'আইনি নোটিশ',
    category: 'civil',
    template_type: 'Notice',
    template_content: 'Legal notice template...',
    tags: ['notice', 'demand', 'civil'],
  },
  {
    id: '3',
    template_name: 'Power of Attorney',
    template_name_bn: 'মুখতারনামা',
    category: 'business',
    template_type: 'POA',
    template_content: 'POA template...',
    tags: ['power', 'attorney', 'authorization'],
  },
  {
    id: '4',
    template_name: 'Rental Agreement',
    template_name_bn: 'ভাড়া চুক্তি',
    category: 'property',
    template_type: 'Agreement',
    template_content: 'Rental agreement template...',
    tags: ['rent', 'lease', 'property'],
  },
  {
    id: '5',
    template_name: 'Divorce Notice (Muslim Family Law)',
    template_name_bn: 'তালাক নোটিশ',
    category: 'family',
    template_type: 'Notice',
    template_content: 'Divorce notice template...',
    tags: ['divorce', 'family', 'muslim'],
  },
  {
    id: '6',
    template_name: 'Employment Contract',
    template_name_bn: 'চাকরির চুক্তি',
    category: 'employment',
    template_type: 'Contract',
    template_content: 'Employment contract template...',
    tags: ['employment', 'job', 'contract'],
  },
  {
    id: '7',
    template_name: 'Affidavit',
    template_name_bn: 'হলফনামা',
    category: 'civil',
    template_type: 'Affidavit',
    template_content: 'Affidavit template...',
    tags: ['affidavit', 'sworn', 'statement'],
  },
  {
    id: '8',
    template_name: 'Sale Deed',
    template_name_bn: 'বিক্রয় দলিল',
    category: 'property',
    template_type: 'Deed',
    template_content: 'Sale deed template...',
    tags: ['sale', 'property', 'deed'],
  },
];

const Templates = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [templates, setTemplates] = useState<Template[]>(sampleTemplates);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    checkAuth();
    fetchTemplates();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setIsAuthenticated(!!session);
  };

  const fetchTemplates = async () => {
    const { data, error } = await supabase
      .from('legal_templates')
      .select('*')
      .eq('is_public', true)
      .order('template_name');

    if (data && data.length > 0) {
      setTemplates(data);
    }
  };

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.template_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (template.template_name_bn && template.template_name_bn.includes(searchQuery));
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleDownload = (template: Template) => {
    if (!isAuthenticated) {
      toast({
        title: "Authentication Required",
        description: "Please log in to download templates.",
        variant: "destructive",
      });
      navigate('/auth');
      return;
    }

    // Create downloadable content
    const content = `
${template.template_name}
${template.template_name_bn || ''}
================================

Category: ${template.category}
Type: ${template.template_type}

[Template Content]

${template.template_content}

---
Generated by JurisMind
Created by RONY
    `.trim();

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${template.template_name.replace(/\s+/g, '_')}.txt`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Template Downloaded",
      description: `${template.template_name} has been downloaded.`,
    });
  };

  const getCategoryIcon = (category: string) => {
    const cat = templateCategories.find(c => c.id === category);
    return cat?.icon || FileText;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass-panel border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/home')}>
            <div className="p-2 rounded-lg bg-gradient-to-br from-primary to-primary-glow">
              <Scale className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-primary to-legal-gold bg-clip-text text-transparent">
              JurisMind
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={() => navigate(isAuthenticated ? '/chat' : '/home')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            {!isAuthenticated && (
              <Button className="glow-button bg-gradient-to-r from-primary to-primary-glow" onClick={() => navigate('/auth')}>
                Login
              </Button>
            )}
          </div>
        </div>
      </nav>

      <div className="pt-24 pb-12 px-4">
        <div className="container mx-auto">
          {/* Header */}
          <motion.div
            className="text-center mb-12"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h1 className="text-4xl font-bold mb-4">
              Legal <span className="text-primary">Templates</span>
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Access a comprehensive library of legal document templates for Bangladesh law.
              Download, customize, and use for your legal needs.
            </p>
          </motion.div>

          {/* Search and Filter */}
          <motion.div
            className="flex flex-col md:flex-row gap-4 mb-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search templates..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full md:w-48">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                {templateCategories.map(cat => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </motion.div>

          {/* Category Pills */}
          <ScrollArea className="w-full mb-8">
            <div className="flex gap-2 pb-2">
              {templateCategories.map(cat => (
                <Button
                  key={cat.id}
                  variant={selectedCategory === cat.id ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={selectedCategory === cat.id ? 'bg-primary' : ''}
                >
                  <cat.icon className="mr-2 h-4 w-4" />
                  {cat.name}
                </Button>
              ))}
            </div>
          </ScrollArea>

          {/* Templates Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTemplates.map((template, index) => {
              const CategoryIcon = getCategoryIcon(template.category);
              return (
                <motion.div
                  key={template.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="p-6 glass-panel h-full flex flex-col hover:border-primary/50 transition-colors">
                    <div className="flex items-start justify-between mb-4">
                      <div className="p-3 rounded-lg bg-primary/10">
                        <CategoryIcon className="w-6 h-6 text-primary" />
                      </div>
                      <Badge variant="secondary">{template.template_type}</Badge>
                    </div>

                    <h3 className="text-lg font-bold mb-1">{template.template_name}</h3>
                    {template.template_name_bn && (
                      <p className="text-muted-foreground mb-3">{template.template_name_bn}</p>
                    )}

                    <div className="flex flex-wrap gap-1 mb-4">
                      {template.tags?.slice(0, 3).map(tag => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>

                    <div className="mt-auto">
                      <Button
                        className="w-full"
                        onClick={() => handleDownload(template)}
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Download Template
                      </Button>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>

          {filteredTemplates.length === 0 && (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No templates found matching your criteria.</p>
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

export default Templates;
